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
              :class="{ selected: isSelected(source, colorName, params.type) }"
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
import { Fill, Stroke, Style } from 'ol/style'
import Map from 'ol/Map'
import MVT from 'ol/format/MVT.js'
import OSM from 'ol/source/OSM'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import TileLayer from 'ol/layer/Tile'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import View from 'ol/View'

export default {
  inject: ['store'],
  data() {
    return {
      backgroundColor: null,
      basemapSelection: null,
      darkOSMCallback: null,
      defaultZoomLevels: {
        'EPSG:3857': 0.2,
        'EPSG:3978': 3.3,
        'EPSG:3995': 3.0,
        'EPSG:4326': 0.95,
      },
      isMapColored: false,
      maps: {},
      overlay: null,
      selections: {
        base: null,
        background: null,
        overlay: null,
      },
      sources: {
        OSM: {
          name: 'OSM',
          callback: this.osmInit,
          displayCondition: true,
          type: 'base',
          colors: {
            Base: [null, null, null],
            Grey: [255, 255, 255],
            Dark: [0, 0, 0],
          },
        },
        Simplified: {
          name: 'Simplified',
          callback: this.simplifiedInit,
          displayCondition: import.meta.env.VITE_SIMPLIFIED_BOUNDARIES,
          type: 'base',
          zIndex: -1,
          colors: {
            Base: [
              new Style({
                stroke: new Stroke({
                  color: 'rgb(0,0,0)',
                  width: 0.6,
                }),
                fill: new Fill({
                  color: 'rgb(255,255,255)',
                }),
              }),
            ],
            Grey: [
              new Style({
                stroke: new Stroke({
                  color: 'rgb(0,0,0)',
                  width: 0.6,
                }),
                fill: new Fill({
                  color: 'rgb(158,158,158)',
                }),
              }),
            ],
            Dark: [
              new Style({
                stroke: new Stroke({
                  color: 'rgb(255,255,255)',
                  width: 0.6,
                }),
                fill: new Fill({
                  color: 'rgb(0,0,0)',
                }),
              }),
            ],
          },
        },
        // Overlay: {
        //   name: 'Simplified',
        //   callback: this.simplifiedInit,
        //   displayCondition: import.meta.env.VITE_SIMPLIFIED_BOUNDARIES,
        //   type: 'overlay',
        //   zIndex: 1000,
        //   colors: {
        //     White: [
        //       new Style({
        //         stroke: new Stroke({
        //           color: 'white',
        //           width: 3,
        //         }),
        //         fill: new Fill({
        //           color: 'rgba(255,255,255,0)',
        //         }),
        //       }),
        //       new Style({
        //         stroke: new Stroke({
        //           color: 'black',
        //           width: 1.8,
        //         }),
        //       }),
        //     ],
        //   },
        // },
        NoBasemap: {
          name: 'NoBasemap',
          callback: this.noBasemapInit,
          displayCondition: true,
          type: 'background',
          colors: {
            Water: [170, 211, 223],
            White: [255, 255, 255],
            Grey: [158, 158, 158],
            Dark: [0, 0, 0],
          },
        },
      },
      tilegrids: {
        'EPSG:3978': this.buildTilegrid([
          -7192737.96, -3004297.73, 5183275.29, 4484204.83,
        ]),
        'EPSG:3995': this.buildTilegrid([
          -3299207.53, -3333134.03, 3299207.53, 3333134.03,
        ]),
      },
      vectorRefs: [],
    }
  },
  mounted() {
    this.emitter.on('permalinkColor', this.setMapIsColored)
    this.initializeMaps()
  },
  beforeUnmount() {
    this.emitter.off('permalinkColor', this.setMapIsColored)
  },
  computed: {
    activeBasemap() {
      const basemap = this.store.getBasemap
      const sources = Object.keys(this.sources).filter(
        (source) => this.sources[source].displayCondition,
      )
      for (const source of sources) {
        if (source === basemap.split('-')[0]) {
          return basemap
        }
      }
      this.store.setBasemap('OSM')
      return this.store.getBasemap
    },
    crsList() {
      return this.store.getCrsList
    },
    currentCRS() {
      return this.store.getCurrentCRS
    },
    rgb() {
      return this.store.getRGB
    },
  },
  watch: {
    currentCRS() {
      this.updateProjection()
    },
    basemapSelection: {
      deep: true,
      handler(newSel, oldSel) {
        const newSource = newSel.split('-')[0]
        const colorName = newSel.split('-')[1]
        const colors = this.sources[newSource].colors[colorName]
        if (this.sources[newSource].name === 'Simplified') {
          if (
            oldSel !== null &&
            this.sources[oldSel.split('-')[0]].name === 'Simplified'
          ) {
            this.toggleVectorLayerStyle(
              colors,
              this.sources[newSource].name,
              oldSel.split('-')[1],
              colorName,
              this.sources[newSource].zIndex,
            )
          } else {
            this.toggleVectorLayer(colors, newSource, colorName)
          }
        } else if (
          oldSel !== null &&
          this.sources[oldSel.split('-')[0]].name === 'Simplified'
        ) {
          this.toggleVectorLayer(
            null,
            oldSel.split('-')[0],
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
        this.selections.base = newSel
      },
    },
    selections: {
      deep: true,
      handler(newSel) {
        let backgroundColor
        if (newSel.background) {
          const name = newSel.background.split('-')[1]
          if (name === 'other') {
            backgroundColor = this.rgb
          } else {
            backgroundColor =
              this.sources.NoBasemap.colors[newSel.background.split('-')[1]]
          }
        } else {
          backgroundColor = newSel.base.split('-')[1]
          backgroundColor =
            backgroundColor === 'Base'
              ? this.sources.NoBasemap.colors['Water']
              : this.sources.NoBasemap.colors[backgroundColor]
        }
        this.vectorRefs.forEach((targetRef) => {
          targetRef.style.backgroundColor = `rgb(${backgroundColor[0]},${backgroundColor[1]},${backgroundColor[2]})`
        })
      },
    },
    '$mapCanvas.mapObj': {
      handler(newVal, oldVal) {
        if (
          Object.keys(oldVal).length === 0 &&
          Object.keys(newVal).length !== 0 &&
          this.activeBasemap === 'OSM'
        ) {
          if (this.isMapColored) {
            for (const [colorName, values] of Object.entries(
              this.sources[this.activeBasemap].colors,
            )) {
              if (values.every((value, index) => value === this.rgb[index])) {
                this.basemapSelection = `${this.activeBasemap}-${colorName}`
                break
              }
            }
            this.coloredBasemapHandler(true)
          } else {
            this.basemapSelection = 'OSM-Base'
          }
        } else {
          const sourceColors = this.sources['NoBasemap'].colors
          const colorName =
            Object.keys(sourceColors).find((color) => {
              return sourceColors[color].every(
                (value, idx) => value === this.rgb[idx],
              )
            }) || 'other'

          if (this.activeBasemap.includes('-')) {
            const [basemap, name] = this.activeBasemap.split('-')
            const backgroundObj = {
              basemap: basemap,
              name: name,
            }
            this.basemapSelection = this.activeBasemap
            this.backgroundColor = {
              name: colorName,
              values: this.rgb,
            }
            this.whiteBasemapHandler(false, backgroundObj)
          } else {
            const backgroundObj = {
              basemap: this.activeBasemap,
              name: colorName,
            }
            this.basemapSelection = `${this.activeBasemap}-${colorName}`
            this.whiteBasemapHandler(false, backgroundObj)
          }
        }
      },
    },
  },
  methods: {
    buildTilegrid(extent) {
      const maxDimension = Math.max(
        extent[2] - extent[0],
        extent[3] - extent[1],
      )
      const tileSize = 256
      const resolutions = Array.from(
        { length: 15 },
        (_, i) => maxDimension / tileSize / Math.pow(2, i),
      )
      const origin = [extent[0], extent[3]]

      return new TileGrid({
        extent,
        origin,
        resolutions,
        tileSize: [tileSize, tileSize],
      })
    },
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
          Object.entries(params.colors).forEach(([colorName, value]) => {
            const targetRef = `${source}-${colorName}`
            const color = {
              name: colorName,
              value: value,
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
        .find(
          (l) =>
            l.get('layerName') === `${this.sources[source].name}-${colorName}`,
        )
      if (!layer) {
        this.$mapCanvas.mapObj.addLayer(
          this.createVectorLayer(colors, source, colorName),
        )
      } else {
        this.$mapCanvas.mapObj.removeLayer(layer)
      }
    },
    toggleVectorLayerStyle(colors, source, oldColorName, newColorName, zIndex) {
      const layer = this.$mapCanvas.mapObj
        .getLayers()
        .getArray()
        .find((l) => l.get('layerName') === `${source}-${oldColorName}`)
      layer.setStyle(colors)
      layer.setProperties({
        layerName: `${source}-${newColorName}`,
      })
      layer.setZIndex(zIndex)
    },
    tileLoadFunction(tile, url) {
      let this_ = this
      tile.setLoader(function (extent, resolution, projection) {
        const crsURL = url.replace('CRS', this_.currentCRS.split(':')[1])
        console.log(projection)
        fetch(crsURL).then(function (response) {
          response.arrayBuffer().then(function (data) {
            const format = tile.getFormat()
            const features = format.readFeatures(data, {
              extent: extent,
              featureProjection: projection,
            })
            tile.setFeatures(features)
          })
        })
      })
    },
    createVectorLayer(colors, source, colorName) {
      return new VectorTileLayer({
        declutter: true,
        source: new VectorTileSource({
          format: new MVT(),
          tileUrlFunction: (tileCoord) => {
            return this.sources[source].displayCondition
              .replace('CRS', this.currentCRS.split(':')[1])
              .replace('{z}', tileCoord[0])
              .replace('{x}', tileCoord[1])
              .replace('{y}', tileCoord[2])
          },
          tileGrid: this.tilegrids[this.currentCRS],
          projection: this.currentCRS,
        }),
        style: colors,
        layerName: `${this.sources[source].name}-${colorName}`,
        zIndex: this.sources[source].zIndex,
      })
    },
    noBasemapInit(previewMap, target, color, _) {
      const targetRef = this.$refs[target][0]

      targetRef.style.backgroundColor = `rgb(${color.value[0]},${color.value[1]},${color.value[2]})`

      previewMap.on('click', () => {
        this.backgroundColor = { name: color.name, values: color.value }
        const background = {
          basemap: this.basemapSelection.split('-')[0],
          name: this.basemapSelection.split('-')[1],
        }
        this.whiteBasemapHandler(false, background)
      })

      return previewMap
    },
    simplifiedInit(previewMap, target, color, source) {
      const vtLayerTC = this.createVectorLayer(color.value, source, color.name)
      previewMap.addLayer(vtLayerTC)
      if (source === 'Simplified') {
        this.vectorRefs.push(this.$refs[target][0])
      }

      const background = {
        basemap: source,
        name: color.name,
      }
      previewMap.on('click', () => {
        const currentBase = this.selections.base
        if (currentBase === `${source}-${color.name}`) {
          this.selections.base = this.selections.background
          this.basemapSelection = this.selections.background
          this.store.setBasemap('NoBasemap')
          this.emitter.emit('updatePermalink')
        } else {
          this.whiteBasemapHandler(false, background)
        }
      })

      return previewMap
    },
    osmInit(previewMap, _, color, source) {
      const osm = new TileLayer({ source: new OSM() })
      previewMap.addLayer(osm)

      if (!color.value.every((item) => item === null)) {
        const callback = (evt) => {
          this.createColoredBasemapCallback(color.value, evt)
        }

        previewMap.getLayers().getArray()[0].on('postrender', callback)
      }
      previewMap.on('click', () => {
        const newSelection = `${source}-${color.name}`
        if (!color.value.every((item) => item === null)) {
          this.store.setRGB(color.value)
        }
        this.basemapSelection = newSelection
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
      let center
      if (this.currentCRS === 'EPSG:3995') {
        center = [-44261.5, -152711]
      } else {
        center = fromLonLat([-90, 55])
      }

      let previewMap = new Map({
        target: this.$refs[target][0],
        layers: [],
        view: new View({
          center: center,
          zoom: this.defaultZoomLevels[this.currentCRS],
          minZoom: this.defaultZoomLevels[this.currentCRS],
          maxZoom: this.defaultZoomLevels[this.currentCRS],
          projection: this.currentCRS,
        }),
        pixelRatio: 1,
        controls: [],
        interactions: [],
      })
      previewMap.sourceName = source

      previewMap = callback(previewMap, target, color, source)

      return previewMap
    },
    isSelected(source, colorName, typeSel) {
      return this.selections[typeSel] === `${source}-${colorName}`
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
      let center
      if (this.currentCRS === 'EPSG:3995') {
        center = [-44261.5, -152711]
      } else {
        center = fromLonLat([-90, 55])
      }

      Object.values(this.maps).forEach((map) => {
        map.setView(
          new View({
            center: center,
            zoom: this.defaultZoomLevels[this.currentCRS],
            projection: newProjection,
          }),
        )
        map
          .getLayers()
          .getArray()
          .forEach((layer) => {
            if (layer instanceof VectorTileLayer) {
              const newSource = new VectorTileSource({
                format: new MVT(),
                tileUrlFunction: (tileCoord) => {
                  return this.sources[
                    layer.get('layerName').split('-')[0]
                  ].displayCondition
                    .replace('CRS', this.currentCRS.split(':')[1])
                    .replace('{z}', tileCoord[0])
                    .replace('{x}', tileCoord[1])
                    .replace('{y}', tileCoord[2])
                },
                tileGrid: this.tilegrids[this.currentCRS],
                projection: this.currentCRS,
              })

              layer.setSource(newSource)
            }
          })
      })

      this.$mapCanvas.mapObj
        .getLayers()
        .getArray()
        .forEach((layer) => {
          if (layer instanceof VectorTileLayer) {
            const newSource = new VectorTileSource({
              format: new MVT(),
              tileUrlFunction: (tileCoord) => {
                return this.sources[
                  layer.get('layerName').split('-')[0]
                ].displayCondition
                  .replace('CRS', this.currentCRS.split(':')[1])
                  .replace('{z}', tileCoord[0])
                  .replace('{x}', tileCoord[1])
                  .replace('{y}', tileCoord[2])
              },
              tileGrid: this.tilegrids[this.currentCRS],
              projection: this.currentCRS,
            })

            layer.setSource(newSource)
          }
        })
    },
    whiteBasemapHandler(visible, background = null) {
      const basemap = this.$mapCanvas.mapObj.getLayers().getArray()[0]
      basemap.setVisible(visible)
      if (background) {
        if (!this.backgroundColor) {
          let currentColor = this.basemapSelection.split('-')[1]
          currentColor = currentColor === 'Base' ? 'Water' : currentColor
          this.backgroundColor = {
            name: currentColor,
            values: this.sources.NoBasemap.colors[currentColor],
          }
        }
        const rgb = this.backgroundColor.values
        const cssColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
        document.getElementById('map').style.backgroundColor = cssColor
        if (background.basemap !== 'Simplified') {
          this.basemapSelection = `NoBasemap-${this.backgroundColor.name}`
          this.store.setBasemap('NoBasemap')
        } else {
          this.basemapSelection = `${background.basemap}-${background.name}`
          this.store.setBasemap(this.basemapSelection)
        }
        this.store.setRGB(rgb)
        this.selections.background = `NoBasemap-${this.backgroundColor.name}`
      } else {
        this.store.setBasemap('OSM')
        this.selections.background = null
        this.backgroundColor = null
      }
      this.selections.base = this.basemapSelection
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
  padding-right: 8px;
  margin-right: -4px;
  margin-left: -2px;
  padding-left: 2px;
}

.source-group {
  display: flex;
  flex-direction: column;
}
</style>
