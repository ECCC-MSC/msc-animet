<template>
  <div class="map-previews-grid">
    <template v-for="(params, source) in sources" :key="source">
      <div v-if="params.displayCondition" class="source-group">
        <h3>{{ $t(source) }}</h3>
        <div class="color-options">
          <div
            v-for="(_, colorName) in params.colors"
            :key="`${source}-${colorName}`"
            class="map-preview-container"
          >
            <div
              :ref="`${source}-${colorName}`"
              class="map-preview"
              :class="{ selected: isSelected(source, colorName) }"
            ></div>
            <span>{{ $t(colorName) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { applyTransform } from 'ol/extent.js'
import { get as getProjection, getTransform } from 'ol/proj.js'
import Map from 'ol/Map'
import MVT from 'ol/format/MVT.js'
import OSM from 'ol/source/OSM'
import TileLayer from 'ol/layer/Tile'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import View from 'ol/View'

export default {
  inject: ['store'],
  data() {
    return {
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
      sources: {
        OSM: {
          name: 'OSM',
          callback: this.osmInit,
          displayCondition: true,
          colors: {
            Base: { rgb: [null, null, null] },
            Light: { rgb: [255, 255, 255] },
            Dark: { rgb: [0, 0, 0] },
          },
        },
        Simplified: {
          name: 'Simplified',
          callback: this.simplifiedInit,
          displayCondition: import.meta.env.VITE_SIMPLIFIED_BOUNDARIES,
          zIndex: -1,
          colors: {
            Base: {
              rgb: {
                land: [255, 255, 255, 1],
                water: [170, 211, 223],
                stroke: [140, 140, 140],
              },
            },
            Grey: {
              rgb: {
                land: [223, 223, 223, 1],
                water: [158, 158, 158],
                stroke: [0, 0, 0],
              },
            },
            Dark: {
              rgb: {
                land: [0, 0, 0, 1],
                water: [158, 158, 158],
                stroke: [140, 140, 140],
              },
            },
          },
        },
        Overlay: {
          name: 'Simplified',
          callback: this.simplifiedInit,
          displayCondition: import.meta.env.VITE_SIMPLIFIED_BOUNDARIES,
          zIndex: 1000,
          colors: {
            White: {
              rgb: {
                land: [255, 255, 255, 0],
                water: [255, 255, 255],
                stroke: [0, 0, 0],
              },
            },
            Grey: {
              rgb: {
                land: [255, 255, 255, 0],
                water: [158, 158, 158],
                stroke: [0, 0, 0],
              },
            },
            Dark: {
              rgb: {
                land: [255, 255, 255, 0],
                water: [0, 0, 0],
                stroke: [255, 255, 255],
              },
            },
          },
        },
        NoBasemap: {
          name: 'NoBasemap',
          callback: this.noBasemapInit,
          displayCondition: true,
          colors: {
            White: {
              rgb: [255, 255, 255],
            },
            Grey: {
              rgb: [158, 158, 158],
            },
            Black: {
              rgb: [0, 0, 0],
            },
          },
        },
      },
    }
  },
  mounted() {
    this.emitter.on('permalinkColor', this.setMapIsColored)
    this.initializeMaps()
    this.updateProjection()
  },
  beforeUnmount() {
    this.emitter.off('permalinkColor', this.setMapIsColored)
  },
  computed: {
    crsList() {
      return this.store.getCrsList
    },
    currentCRS() {
      return this.store.getCurrentCRS
    },
    activeBasemap() {
      const basemap = this.store.getBasemap
      const sources = Object.keys(this.sources).filter(
        (source) => this.sources[source].displayCondition,
      )
      for (const source of sources) {
        if (source.toLowerCase() === basemap.toLowerCase()) {
          return source
        }
      }
      this.store.setBasemap('OSM')
      return this.store.getBasemap
    },
  },
  watch: {
    currentCRS() {
      this.updateProjection()
    },
    selection(newSel, oldSel) {
      const newSource = newSel.split('-')[0]
      const colorName = newSel.split('-')[1]
      const colors = this.sources[newSource].colors[colorName]
      if (this.sources[newSource].name === 'Simplified') {
        if (
          oldSel !== null &&
          this.sources[oldSel.split('-')[0]].name === 'Simplified'
        ) {
          this.toggleVectorLayerStyle(
            colors.rgb,
            this.sources[newSource].name,
            oldSel.split('-')[1],
            colorName,
            this.sources[newSource].zIndex,
          )
        } else {
          this.toggleVectorLayer(
            colors.rgb,
            this.sources[newSource].name,
            colorName,
          )
        }
      } else if (
        oldSel !== null &&
        this.sources[oldSel.split('-')[0]].name === 'Simplified'
      ) {
        this.toggleVectorLayer(
          null,
          this.sources[oldSel.split('-')[0]].name,
          oldSel.split('-')[1],
        )
      }
      if (newSource === 'OSM') {
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
          this.activeBasemap === 'OSM'
        ) {
          if (this.isMapColored) {
            this.setColor()
            for (const [colorName, values] of Object.entries(
              this.sources[this.activeBasemap].colors,
            )) {
              if (
                values.rgb.every((value, index) => value === this.rgb[index])
              ) {
                this.selection = `${this.activeBasemap}-${colorName}`
                break
              }
            }
            this.coloredBasemapHandler(true)
          } else {
            this.selection = 'OSM-Base'
          }
        } else {
          if (this.isMapColored) {
            this.setColor()
          }
          const sourceColors = this.sources[this.activeBasemap].colors
          const colorName =
            Object.keys(sourceColors).find((color) => {
              const rgb = sourceColors[color].rgb
              return (rgb.water ?? rgb).every(
                (value, idx) => value === this.rgb[idx],
              )
            }) || null
          const backgroundObj = {
            basemap: this.activeBasemap,
            name: colorName,
            color: this.rgb,
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
      Object.entries(this.sources).forEach(([source, params]) => {
        if (params.displayCondition) {
          Object.entries(params.colors).forEach(([colorName, values]) => {
            const targetRef = `${source}-${colorName}`
            const color = {
              name: colorName,
              rgb: values.rgb,
            }
            this.maps[`${source}-${colorName}`] = this.initMap(
              targetRef,
              color,
              source,
              params.callback,
            )
          })
        }
      })
    },
    toggleVectorLayer(colors, source, colorName) {
      const layer = this.$mapCanvas.mapObj
        .getLayers()
        .getArray()
        .find((l) => l.get('layerName') === `${source}-${colorName}`)
      if (!layer) {
        this.$mapCanvas.mapObj.addLayer(
          this.createVectorLayer(colors, source, colorName),
        )
      } else {
        this.$mapCanvas.mapObj.removeLayer(layer)
      }
    },
    toggleVectorLayerStyle(colors, source, oldColorName, newColorName, zIndex) {
      const fillColor = `rgba(${colors.land.join(',')})`
      const strokeColor = `rgb(${colors.stroke.join(',')})`
      const layer = this.$mapCanvas.mapObj
        .getLayers()
        .getArray()
        .find((l) => l.get('layerName') === `${source}-${oldColorName}`)
      layer.setStyle({
        'stroke-width': 0.6,
        'stroke-color': strokeColor,
        'fill-color': fillColor,
      })
      layer.setProperties({
        layerName: `${source}-${newColorName}`,
      })
      layer.setZIndex(zIndex)
    },
    createVectorLayer(colors, source, colorName) {
      const fillColor = `rgba(${colors.land.join(',')})`
      const strokeColor = `rgb(${colors.stroke.join(',')})`
      return new VectorTileLayer({
        declutter: true,
        source: new VectorTileSource({
          format: new MVT(),
          url: this.sources[source].displayCondition,
        }),
        style: {
          'stroke-width': 0.6,
          'stroke-color': strokeColor,
          'fill-color': fillColor,
        },
        layerName: `${source}-${colorName}`,
        zIndex: this.sources[source].zIndex,
      })
    },
    noBasemapInit(previewMap, target, color, source) {
      const targetRef = this.$refs[target][0]

      const backgroundColor = color.rgb
      targetRef.style.backgroundColor = `rgb(${backgroundColor[0]},${backgroundColor[1]},${backgroundColor[2]})`

      const background = {
        basemap: source,
        name: color.name,
        color: color.rgb,
      }
      previewMap.on('click', () => {
        this.whiteBasemapHandler(false, background)
      })

      return previewMap
    },
    simplifiedInit(previewMap, target, color, source) {
      const vtLayerTC = this.createVectorLayer(color.rgb, source, color.name)
      previewMap.addLayer(vtLayerTC)
      const targetRef = this.$refs[target][0]

      const backgroundColor = color.rgb.water
      targetRef.style.backgroundColor = `rgb(${backgroundColor[0]},${backgroundColor[1]},${backgroundColor[2]})`

      const background = {
        basemap: source,
        name: color.name,
        color: color.rgb.water,
      }
      previewMap.on('click', () => {
        this.whiteBasemapHandler(false, background)
      })

      return previewMap
    },
    osmInit(previewMap, _, color, source) {
      const osm = new TileLayer({ source: new OSM() })
      previewMap.addLayer(osm)

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
    initMap(target, color, source, callback) {
      const newProjection = getProjection(this.currentCRS)
      const fromLonLat = getTransform('EPSG:4326', newProjection)
      const worldExtent = this.crsList[this.currentCRS]
      newProjection.setWorldExtent(worldExtent)
      const projExtent = applyTransform(worldExtent, fromLonLat, undefined, 8)
      newProjection.setExtent(projExtent)

      let previewMap = new Map({
        target: this.$refs[target][0],
        layers: [],
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

      previewMap = callback(previewMap, target, color, source)

      return previewMap
    },
    isSelected(source, colorName) {
      return this.selection === `${source}-${colorName}`
    },
    setColor() {
      this.rgb = this.store.getRGB
    },
    setMapIsColored() {
      this.isMapColored = true
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
      const basemap = this.$mapCanvas.mapObj.getLayers().getArray()[0]
      basemap.setVisible(visible)
      if (background) {
        const rgb = background.color
        const cssColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
        document.getElementById('map').style.backgroundColor = cssColor
        this.selection = `${background.basemap}-${background.name}`
        this.store.setRGB(rgb)
        this.store.setBasemap(background.basemap)
      } else {
        this.store.setBasemap('OSM')
      }
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
}

.source-group {
  display: flex;
  flex-direction: column;
}
</style>
