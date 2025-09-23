<template>
  <div class="Home">
    <v-container fluid>
      <map-canvas id="mapComponent" />
    </v-container>
  </div>
</template>

<script>
import localeData from '../locales/importLocaleFiles'
import proj4 from 'proj4'
import { Duration } from 'luxon'
import { register } from 'ol/proj/proj4'

export default {
  inject: ['store'],
  name: 'Home',
  props: [
    'layers',
    'extent',
    'color',
    'basemap',
    'overlays',
    'proj',
    'grat',
    'play',
    'range',
  ],
  data() {
    return {
      allPropsUndefined: false,
      layerCount: null,
      layerSnapped: false,
      userCRS: undefined,
    }
  },
  created() {
    proj4.defs(
      'EPSG:3978',
      '+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
    )
    proj4.defs(
      'EPSG:3995',
      '+proj=stere +lat_0=90 +lat_ts=71 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs',
    )
    register(proj4)

    this.allPropsUndefined = Object.keys(this.$props).every(
      (prop) => this[prop] === undefined,
    )

    this.userCRS = (this.allPropsUndefined && this.getCRS()) || undefined
    const proj = this.proj || this.userCRS

    if (proj !== undefined) {
      const foundCode = Object.keys(this.crsList).find((code) =>
        code.includes(proj),
      )
      if (foundCode) {
        this.store.setCurrentCRS(foundCode)
      }
    }

    if (this.grat === '1') {
      this.store.setShowGraticules(true)
    }
  },
  async mounted() {
    let userBasemap, userColor, userOverlays
    if (this.allPropsUndefined) {
      ;[userBasemap, userColor] = this.getBase() || []
      userOverlays = this.getUserSelectedOverlays() || undefined
    }

    const basemap = this.basemap || userBasemap
    const color = this.color || userColor

    if (this.layers !== undefined) {
      const layersPassed = this.layers.split(',')
      this.layerCount = layersPassed.length
      layersPassed.forEach((layer, index) => {
        const layerParams = layer.split(';')
        const [lastValue, sourceSpecified] = layerParams.pop().split(':')
        const [
          layerName,
          opacity,
          isSnapped,
          isVisible,
          style,
          legendDisplayed,
          modelRun,
        ] = [...layerParams, lastValue]

        this.layerCount--

        const params = {
          layerName,
          opacity,
          isSnapped,
          isVisible,
          style,
          legendDisplayed,
          modelRun,
        }
        this.addLayerEvent({ index, ...params, source: sourceSpecified })
      })
    }
    if (this.extent !== undefined) {
      let extentPassed = this.extent.split(',')
      let castedExtent = []
      extentPassed.forEach((element) => {
        castedExtent.push(parseFloat(element))
      })
      if (basemap === '0') {
        let rotation = 0
        if (castedExtent.length === 5) {
          rotation = castedExtent.pop()
        }
        this.store.setExtent([castedExtent, rotation])
      }
      this.emitter.emit('goToExtent', castedExtent)
    } else if (this.proj || (this.allPropsUndefined && this.userCRS)) {
      const crs = this.proj || this.userCRS

      const foundCode = Object.keys(this.crsList).find((code) =>
        code.includes(crs),
      )
      if (foundCode) {
        let extent
        if (foundCode === 'EPSG:3995') {
          extent = [-3249458, -3332154, 3287315, 3112652]
        } else if (foundCode === 'EPSG:3978') {
          extent = [-3844382, -2769810, 5183413, 4476288]
        } else if (foundCode === 'EPSG:4326') {
          extent = [-135, 15, -56, 79]
        }
        if (extent) {
          this.store.setExtent([extent, 0])
          this.emitter.emit('goToExtent', extent)
        }
      }
    }
    if (basemap !== undefined) {
      if (basemap === '0') {
        this.store.setBasemap('NoBasemap')
      } else {
        this.store.setBasemap(basemap)
      }
    }
    if (this.overlays !== undefined) {
      if (this.overlays !== '0') {
        this.overlays.split(',').forEach((overlay) => {
          this.store.toggleOverlay(overlay)
        })
      }
    } else if (userOverlays !== undefined) {
      userOverlays.forEach((overlay) => {
        this.store.toggleOverlay(overlay)
      })
    } else {
      this.store.toggleOverlay('Boundaries')
    }
    if (color !== undefined) {
      let matchColor = /((\d{1,3}),(\d{1,3}),(\d{1,3}))/
      let match = matchColor.exec(color)
      if (match !== null) {
        this.store.setRGB([
          Number(match[2]),
          Number(match[3]),
          Number(match[4]),
        ])
        this.emitter.emit('permalinkColor', true)
      }
    }
  },
  methods: {
    async addLayerEvent({
      index,
      layerName,
      opacity,
      isSnapped,
      isVisible,
      style,
      legendDisplayed,
      modelRun,
      source,
    } = {}) {
      let baseURL
      if (source) {
        if (Object.keys(this.wmsSources).includes(source)) {
          baseURL = this.wmsSources[source]['urls'][0]
        }
      }
      if (!baseURL) {
        const [sourceContainingLayerName, wmsSourceUrl] =
          this.findKeyInLocaleFiles(layerName)
        if (wmsSourceUrl) {
          baseURL = wmsSourceUrl
        } else if (sourceContainingLayerName) {
          const configName = Object.keys(this.wmsSources).find(
            (key) => key.toLowerCase() === sourceContainingLayerName,
          )
          baseURL = this.wmsSources[configName]['urls'][0]
        } else {
          return
        }
      }
      const snapped = isSnapped !== '0' ? true : false
      if (snapped) {
        this.layerSnapped = true
      }
      let rangeValues
      if (this.layerCount === 0) {
        if (this.play) {
          this.emitter.emit('changeTab')
        } else {
          this.emitter.emit('collapseMenu', true)
        }
        if (this.range !== undefined && !this.layerSnapped) {
          let [range, current, last, step] = this.range.split(',')
          step = step.trim()

          const isValidIndex = (value) => {
            if (value === 'l') return true
            const num = Number(value)
            return Number.isInteger(num) && num >= 0
          }
          const parseIndex = (value) => {
            return value === 'l' ? 'l' : Number(value)
          }

          if (
            isValidIndex(range) &&
            isValidIndex(current) &&
            isValidIndex(last)
          ) {
            range = parseIndex(range)
            current = parseIndex(current)
            last = parseIndex(last)

            if (range === 'l') {
              range = 0
            }

            rangeValues = [range, current, last, step]
            try {
              // Attempt Duration.fromISO to make sure the step is valid
              Duration.fromISO(step)
            } catch {
              rangeValues = undefined
            }
          } else {
            rangeValues = undefined
          }
        }
      }
      let layer = {}
      layer.Name = layerName
      layer.isLeaf = true
      layer.zIndex = index
      layer.wmsSource = baseURL
      layer.isSnapped = snapped
      let op = parseFloat(opacity)
      layer.opacity = isNaN(op) || op > 1 || op < 0 ? 0.75 : op
      layer.visible = isVisible === '0' ? false : true
      layer.legendDisplayed = legendDisplayed === '1' ? true : false
      if (style !== '0') {
        layer.currentStyle = style
      }
      if (modelRun !== undefined) {
        layer.currentMR = modelRun
      }
      const autoPlay = this.play && this.layerCount === 0
      this.emitter.emit('permaLinkLayer', {
        layer,
        autoPlay,
        rangeValues,
      })
    },
    findInTree(items, key) {
      for (const item of items) {
        if (item.Name === key) {
          return item
        }
        if (item.children && item.children.length > 0) {
          const found = this.findInTree(item.children, key)
          if (found) {
            return found
          }
        }
      }
      return null
    },
    findKeyInLocaleFiles(key) {
      for (const sourceName in localeData['enLocaleData']) {
        if (Object.hasOwn(localeData['enLocaleData'][sourceName], key)) {
          const sourceConfigName = Object.keys(this.layerTreeItems).find(
            (originalName) => originalName.toLowerCase() === sourceName,
          )
          if (this.wmsSources[sourceConfigName]['urls'].length > 1) {
            const layerFound = this.findInTree(
              this.layerTreeItems[sourceConfigName],
              key,
            )
            return [sourceName, layerFound?.wmsSource]
          } else {
            return [sourceName, null]
          }
        }
      }
      return [null, null] // Key not found in any file
    },
    getBase() {
      return JSON.parse(localStorage.getItem('user-basemap'))
    },
    getCRS() {
      return localStorage.getItem('user-crs')
    },
    getUserSelectedOverlays() {
      return JSON.parse(localStorage.getItem('user-overlays'))
    },
  },
  computed: {
    crsList() {
      return this.store.getCrsList
    },
    layerTreeItems() {
      return this.store.getLayerTreeItems
    },
    wmsSources() {
      return this.store.getWmsSources
    },
  },
}
</script>

<style scoped>
.Home,
.main {
  height: 100%;
}
</style>
