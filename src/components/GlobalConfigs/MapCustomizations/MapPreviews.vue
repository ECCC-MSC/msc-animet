<template>
  <div class="map-previews-grid">
    <div v-for="source in sources" :key="source" class="source-group">
      <h3>{{ source }}</h3>
      <div class="color-options">
        <div
          v-for="color in colors"
          :key="`${source}-${color.name}`"
          class="map-preview-container"
        >
          <div
            :ref="`map-${source}-${color.name}`"
            class="map-preview"
            :class="{ selected: isSelected(source, color.name) }"
          ></div>
          <span>{{ $t(color.name) }}</span>
        </div>
      </div>
    </div>
    <div class="source-group">
      <h3 class="source-title">{{ $t('NoBasemap') }}</h3>
      <div class="color-options">
        <div class="map-preview-container">
          <div
            class="map-preview bg-white"
            :class="{ selected: isSelected('null', 'white') }"
            @click="whiteBasemapHandler(false, backgrounds.White)"
          ></div>
          <span class="color-label">{{ $t('White') }}</span>
        </div>
        <div class="map-preview-container">
          <div
            class="map-preview bg-grey"
            :class="{ selected: isSelected('null', 'grey') }"
            @click="whiteBasemapHandler(false, backgrounds.Grey)"
          ></div>
          <span class="color-label">{{ $t('Grey') }}</span>
        </div>
        <div class="map-preview-container">
          <div
            class="map-preview bg-black"
            :class="{ selected: isSelected('null', 'black') }"
            @click="whiteBasemapHandler(false, backgrounds.Black)"
          ></div>
          <span class="color-label">{{ $t('Black') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { applyTransform } from 'ol/extent.js'
import { get as getProjection, getTransform } from 'ol/proj.js'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'

export default {
  inject: ['store'],
  data() {
    return {
      backgrounds: {
        White: {
          name: 'white',
          color: [255, 255, 255],
        },
        Grey: {
          name: 'grey',
          color: [158, 158, 158],
        },
        Black: {
          name: 'black',
          color: [0, 0, 0],
        },
      },
      basemap: 'OSM',
      colors: [
        { name: 'Base', rgb: [null, null, null] },
        { name: 'Light', rgb: [255, 255, 255] },
        { name: 'Dark', rgb: [0, 0, 0] },
      ],
      darkOSMCallback: null,
      defaultZoomLevels: {
        'EPSG:3857': 0.2,
        'EPSG:3978': 3.3,
        'EPSG:3995': 2.8,
        'EPSG:4326': 0.95,
      },
      isMapColored: false,
      maps: {},
      rgb: [255, 255, 255],
      selection: null,
      sources: ['OSM'],
    }
  },
  mounted() {
    this.emitter.on('invisibleBasemap', () => {
      this.basemap = null
    })
    this.emitter.on('permalinkColor', () => {
      this.isMapColored = true
    })
    this.initializeMaps()
    this.updateProjection()
  },
  computed: {
    crsList() {
      return this.store.getCrsList
    },
    currentCRS() {
      return this.store.getCurrentCRS
    },
    isBasemapVisible() {
      return this.store.getIsBasemapVisible
    },
  },
  watch: {
    currentCRS() {
      this.updateProjection()
    },
    selection(newSel) {
      if (newSel.split('-')[0] !== 'null') {
        if (newSel.split('-')[1] === 'Base') {
          this.coloredBasemapHandler(false)
        } else {
          this.coloredBasemapHandler(true)
        }
      }
    },
    '$mapCanvas.mapObj': {
      handler(newVal, oldVal) {
        if (
          Object.keys(oldVal).length === 0 &&
          Object.keys(newVal).length !== 0 &&
          this.basemap !== null
        ) {
          if (this.isMapColored) {
            this.setColor()
            for (const color of this.colors) {
              if (
                color.rgb.every((value, index) => value === this.rgb[index])
              ) {
                this.selection = `${this.basemap}-${color.name}`
                break
              }
            }
            this.coloredBasemapHandler(true)
          } else {
            this.selection = 'OSM-Base'
          }
        } else if (this.basemap === null) {
          if (this.isMapColored) {
            this.setColor()
          }
          const backgroundObj = {
            name: null,
            color: this.rgb,
          }
          for (const background of Object.values(this.backgrounds)) {
            if (
              background.color.every(
                (value, index) => value === this.rgb[index],
              )
            ) {
              backgroundObj.name = background.name
              break
            }
          }
          this.whiteBasemapHandler(false, backgroundObj)
        }
      },
    },
  },
  methods: {
    coloredBasemapHandler(flag) {
      if (!this.$mapCanvas.mapObj.getLayers().getArray()[0].get('visible')) {
        this.whiteBasemapHandler(true)
      }
      this.isMapColored = flag
      if (this.darkOSMCallback === null) {
        this.darkOSMCallback = (evt) => {
          this.createColoredBasemapCallback(this.rgb, evt)
        }
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .on('postrender', this.darkOSMCallback)
        this.$mapCanvas.mapObj.updateSize()
      }
      if (flag === true) {
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .on('postrender', this.darkOSMCallback)
        this.$mapCanvas.mapObj.updateSize()
      } else if (flag === false) {
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .un('postrender', this.darkOSMCallback)
        this.$mapCanvas.mapObj.updateSize()
      }
      this.$mapCanvas.mapObj.renderSync()

      this.store.setRGB(this.isMapColored ? this.rgb : [])
      this.emitter.emit('updatePermalink')
    },
    createColoredBasemapCallback(rgb, evt) {
      evt.context.globalCompositeOperation = 'color'
      evt.context.fillStyle = 'rgb(0,0,0)'
      evt.context.fillRect(
        0,
        0,
        evt.context.canvas.width,
        evt.context.canvas.height,
      )
      evt.context.globalCompositeOperation = 'overlay'
      evt.context.fillStyle = 'rgb(0,0,0)'
      evt.context.fillRect(
        0,
        0,
        evt.context.canvas.width,
        evt.context.canvas.height,
      )
      evt.context.globalCompositeOperation = 'difference'
      evt.context.fillStyle =
        'rgba(' +
        [255 - rgb[0], 255 - rgb[1], 255 - rgb[2], 1.0].toString() +
        ')'
      evt.context.fillRect(
        0,
        0,
        evt.context.canvas.width,
        evt.context.canvas.height,
      )
      evt.context.globalCompositeOperation = 'source-over'
    },
    initializeMaps() {
      this.sources.forEach((source) => {
        this.colors.forEach((color) => {
          const targetRef = `map-${source}-${color.name}`
          this.maps[`${source}-${color.name}`] = this.initMap(
            targetRef,
            color,
            source,
          )
        })
      })
    },
    initMap(target, color, source) {
      const newProjection = getProjection(this.currentCRS)
      const fromLonLat = getTransform('EPSG:4326', newProjection)
      const worldExtent = this.crsList[this.currentCRS]
      newProjection.setWorldExtent(worldExtent)
      const projExtent = applyTransform(worldExtent, fromLonLat, undefined, 8)
      newProjection.setExtent(projExtent)

      const osm = new TileLayer({ source: new OSM() })
      const previewMap = new Map({
        target: this.$refs[target][0],
        layers: [osm],
        view: new View({
          center: fromLonLat([-90, 55]),
          zoom: this.defaultZoomLevels[this.currentCRS],
          minZoom: this.defaultZoomLevels[this.currentCRS],
          maxZoom: this.defaultZoomLevels[this.currentCRS],
          projection: this.currentCRS,
        }),
        pixelRatio: 1,
        controls: [],
        interactions: [],
      })

      if (!color.rgb.every((item) => item === null)) {
        const callback = (evt) => {
          this.createColoredBasemapCallback(color.rgb, evt)
        }

        previewMap.getLayers().getArray()[0].on('postrender', callback)
      }
      previewMap.on('click', () => {
        const newSelection = `${source}-${color.name}`
        if (!color.rgb.every((item) => item === null)) {
          this.rgb = color.rgb
        }
        this.selection = newSelection
      })

      return previewMap
    },
    isSelected(source, colorName) {
      return this.selection === `${source}-${colorName}`
    },
    setColor() {
      this.rgb = this.store.getRGB
    },
    updateProjection() {
      const newProjection = getProjection(this.currentCRS)
      const fromLonLat = getTransform('EPSG:4326', newProjection)
      const worldExtent = this.crsList[this.currentCRS]
      newProjection.setWorldExtent(worldExtent)
      const projExtent = applyTransform(worldExtent, fromLonLat, undefined, 8)
      newProjection.setExtent(projExtent)

      Object.values(this.maps).forEach((map) => {
        map.setView(
          new View({
            center: fromLonLat([-90, 55]),
            zoom: this.defaultZoomLevels[this.currentCRS],
            projection: newProjection,
          }),
        )
      })
    },
    whiteBasemapHandler(visible, background = null) {
      if (background) {
        const rgb = background.color
        const cssColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
        document.getElementById('map').style.backgroundColor = cssColor
        this.selection = `null-${background.name}`
        this.store.setRGB(rgb)
      }
      const activeBasemap = this.$mapCanvas.mapObj.getLayers().getArray()[0]
      activeBasemap.setVisible(visible)
      this.store.setIsBasemapVisible(visible)
      this.emitter.emit('updatePermalink')
      this.emitter.emit('calcFooterPreview')
    },
  },
}
</script>

<style scoped>
.color-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 3px;
}

.map-preview {
  width: 98px;
  height: 80px;
  border: 1px solid #ccc;
  position: relative;
}

.map-preview.selected {
  border: 1px solid #007bff;
  transform: scale(1.05);
}

.map-preview.selected::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: inset 0 0 0 2px #007bff;
  pointer-events: none;
  z-index: 1;
}

.map-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.map-previews-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: calc(100% + 4px);
  margin: 0 auto;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
  margin-right: -4px;
  padding-left: 2px;
  margin-left: -2px;
}

.source-group {
  display: flex;
  flex-direction: column;
}
</style>
