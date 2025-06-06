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
  ],
  data() {
    return {
      layerCount: null,
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

    if (this.proj !== undefined) {
      const foundCode = Object.keys(this.crsList).find((code) =>
        code.includes(this.proj),
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
    if (this.layers !== undefined) {
      const layersPassed = this.layers.split(',')
      this.layerCount = layersPassed.length
      layersPassed.forEach((layer, index) => {
        this.layerCount--
        this.addLayerEvent(index, ...layer.split(';'))
      })
    }
    if (this.extent !== undefined) {
      let extentPassed = this.extent.split(',')
      let castedExtent = []
      extentPassed.forEach((element) => {
        castedExtent.push(parseFloat(element))
      })
      if (this.basemap === '0') {
        let rotation = 0
        if (castedExtent.length === 5) {
          rotation = castedExtent.pop()
        }
        this.store.setExtent([castedExtent, rotation])
      }
      this.emitter.emit('goToExtent', castedExtent)
    }
    if (this.basemap !== undefined) {
      if (this.basemap === '0') {
        this.store.setBasemap('NoBasemap')
      } else {
        this.store.setBasemap(this.basemap)
      }
    }
    if (this.overlays !== undefined) {
      const overlays = this.overlays.split(',')
      overlays.forEach((overlay) => {
        this.store.toggleOverlay(overlay)
      })
    }
    if (this.color !== undefined) {
      let matchColor = /((\d{1,3}),(\d{1,3}),(\d{1,3}))/
      let match = matchColor.exec(this.color)
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
    async addLayerEvent(
      index,
      layerName,
      opacity,
      isSnapped,
      isVisible,
      style,
      legendDisplayed,
      source,
    ) {
      let baseURL
      if (source) {
        if (Object.keys(this.wmsSources).includes(source)) {
          baseURL = this.wmsSources[source]['url']
        }
      }
      if (!baseURL) {
        const sourceContainingLayerName = this.findKeyInLocaleFiles(layerName)
        if (sourceContainingLayerName) {
          const configName = Object.keys(this.wmsSources).find(
            (key) => key.toLowerCase() === sourceContainingLayerName,
          )
          baseURL = this.wmsSources[configName]['url']
        } else {
          return
        }
      }
      if (this.layerCount === 0) {
        if (this.play) {
          this.emitter.emit('changeTab')
        } else {
          this.emitter.emit('collapseMenu', true)
        }
      }
      let layer = {}
      layer.Name = layerName
      layer.isLeaf = true
      layer.zIndex = index
      layer.wmsSource = baseURL
      layer.isSnapped = isSnapped !== '0' ? true : false
      let op = parseFloat(opacity)
      layer.opacity = isNaN(op) || op > 1 || op < 0 ? 0.75 : op
      layer.visible = isVisible === '0' ? false : true
      if (style !== '0') {
        layer.currentStyle = style
      }
      if (legendDisplayed !== undefined) {
        layer.legendDisplayed = legendDisplayed
      }
      const autoPlay = this.play && this.layerCount === 0
      this.emitter.emit('permaLinkLayer', { layer, autoPlay })
    },
    findKeyInLocaleFiles(key) {
      for (const sourceName in localeData['enLocaleData']) {
        if (Object.hasOwn(localeData['enLocaleData'][sourceName], key)) {
          return sourceName
        }
      }
      return null // Key not found in any file
    },
  },
  computed: {
    crsList() {
      return this.store.getCrsList
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
