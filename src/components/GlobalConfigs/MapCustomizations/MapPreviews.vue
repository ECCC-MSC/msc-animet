<template>
  <div class="map-previews-grid">
    <template v-for="(params, source) in sources" :key="source">
      <div v-if="params.displayCondition" class="source-group">
        <h3 v-if="params.title">{{ $t(source) }}</h3>
        <span class="text-subtitle-2 font-weight-bold" v-if="params.subtitle">{{
          $t(params.subtitle)
        }}</span>
        <div
          class="color-options"
          :class="{
            'four-items': Object.keys(sources[source].colors).length === 4,
          }"
        >
          <div
            v-for="(colorValue, colorName) in params.colors"
            :key="`${source}-${colorName}`"
            class="map-preview-container"
          >
            <template
              v-if="Array.isArray(colorValue) || colorValue.displayCondition"
            >
              <div
                v-if="source !== 'Others'"
                :ref="`${source}-${colorName}`"
                class="map-preview"
                :class="{
                  selected: isSelected(source, colorName, params.type),
                }"
              ></div>
              <div
                v-else
                class="map-preview"
                :class="{
                  selected: isSelected(source, colorName, params.type),
                }"
                @click="handleOthersSelection(colorName)"
              >
                <img
                  :src="getPreviewImage()"
                  :alt="$t(colorName)"
                  class="map-preview-image"
                />
              </div>
              <span>{{ $t(colorName) }}</span>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { apply as olmsApply } from 'ol-mapbox-style'
import { applyTransform } from 'ol/extent.js'
import { get as getProjection, getTransform } from 'ol/proj.js'
import { Circle, Fill, Stroke, Style, Text } from 'ol/style'
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
        'EPSG:3995': 2.95,
        'EPSG:4326': 0.95,
      },
      isMapColored: false,
      isUserInitiated: false,
      maps: {},
      overlay: null,
      selections: {
        base: null,
        background: null,
        overlays: [],
      },
      styleApplied: false,
      sources: {
        OSM: {
          callback: this.osmInit,
          displayCondition: true,
          title: true,
          type: 'base',
          colors: {
            Base: [null, null, null],
            Grey: [255, 255, 255],
            Dark: [0, 0, 0],
          },
        },
        Simplified: {
          callback: this.simplifiedInit,
          displayCondition: import.meta.env.VITE_SIMPLIFIED_BOUNDARIES,
          subtitle: 'Fill',
          title: true,
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
        NoBasemap: {
          callback: this.noBasemapInit,
          displayCondition: true,
          subtitle: 'NoBasemap',
          title: false,
          type: 'background',
          colors: {
            Water: [170, 211, 223],
            White: [255, 255, 255],
            Grey: [158, 158, 158],
            Dark: [0, 0, 0],
          },
        },
        Others: {
          callback: null,
          displayCondition: ['EPSG:3857', 'EPSG:3978'].includes(
            this.store.getCurrentCRS,
          ),
          title: true,
          type: 'base',
          colors: {
            CBMT: [null, null, null],
          },
        },
        Overlay: {
          callback: this.simplifiedInit,
          displayCondition:
            import.meta.env.VITE_SIMPLIFIED_BOUNDARIES ||
            import.meta.env.VITE_PLACE_NAMES,
          title: true,
          type: 'overlays',
          colors: {
            Boundaries: {
              style: [
                new Style({
                  stroke: new Stroke({
                    color: 'white',
                    width: 1.6,
                  }),
                  fill: new Fill({
                    color: 'rgba(255,255,255,0)',
                  }),
                }),
                new Style({
                  stroke: new Stroke({
                    color: 'black',
                    width: 1.2,
                  }),
                }),
              ],
              displayCondition: import.meta.env.VITE_SIMPLIFIED_BOUNDARIES,
              zIndex: 999,
            },
            Places: {
              style: this.createPlacenameStyle(),
              displayCondition: import.meta.env.VITE_PLACE_NAMES,
              zIndex: 1000,
            },
          },
        },
      },
      tilegrids: {
        'EPSG:3857': this.buildTilegrid([
          -20037508.34, -20048966.1, 20037508.34, 20048966.1,
        ]),
        'EPSG:3857-Boundaries': this.buildTilegrid([
          -20037508.34, -20037508.34, 20037508.34, 20037508.34,
        ]),
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
      if (!basemap) {
        this.store.setBasemap('OSM')
        return this.store.getBasemap
      }

      const sources = Object.keys(this.sources).filter(
        (source) => this.sources[source].displayCondition,
      )
      for (const source of sources) {
        if (source === basemap.split('-')[0]) {
          return basemap
        } else if (Object.keys(this.sources[source].colors).includes(basemap)) {
          return basemap
        }
      }
      this.store.setBasemap('OSM')
      return this.store.getBasemap
    },
    activeOverlays() {
      return this.store.getOverlays
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
      this.sources.Others.displayCondition = [
        'EPSG:3857',
        'EPSG:3978',
      ].includes(this.currentCRS)
      this.updateProjection()
    },
    basemapSelection: {
      deep: true,
      handler(newSel, oldSel) {
        const newSource = newSel.split('-')[0]
        const colorName = newSel.split('-')[1]
        const colors = this.sources[newSource].colors[colorName]
        if (oldSel !== null && oldSel.split('-')[1] === 'CBMT') {
          this.removeCBMTStyle(this.$mapCanvas.mapObj)
        }
        if (newSource === 'Simplified') {
          if (oldSel !== null && oldSel.split('-')[0] === newSource) {
            this.toggleVectorLayerStyle(
              colors,
              newSource,
              oldSel.split('-')[1],
              colorName,
              this.sources[newSource].zIndex,
            )
          } else {
            this.toggleVectorLayer(colors, newSource, colorName)
          }
        } else if (oldSel !== null && oldSel.split('-')[0] === 'Simplified') {
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
        } else if (newSource === 'Others' && colorName === 'CBMT') {
          this.cbmtStyle(this.$mapCanvas.mapObj)
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
          if (!newSel.background && !newSel.base) {
            return
          }
          backgroundColor = newSel.base.split('-')[1]
          backgroundColor =
            backgroundColor === 'Base' || newSel.base.split('-')[0] === 'Others'
              ? this.sources.NoBasemap.colors['Water']
              : this.sources.NoBasemap.colors[backgroundColor]
        }
        this.vectorRefs.forEach((targetRef) => {
          targetRef.style.backgroundColor = `rgb(${backgroundColor[0]},${backgroundColor[1]},${backgroundColor[2]})`
        })

        if (this.isUserInitiated) {
          this.saveUserBasemapPreference(newSel, backgroundColor)
          this.isUserInitiated = false
        }
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
          } else if (!Object.keys(this.sources).includes(this.activeBasemap)) {
            const backgroundObj = {
              basemap: 'Others',
              name: this.activeBasemap,
            }
            this.basemapSelection = `Others-${this.activeBasemap}`
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
        if (this.activeOverlays.length !== 0) {
          this.activeOverlays.forEach((overlay) => {
            const source = 'Overlay'
            const overlayName = overlay
            const overlayParams = this.sources[source].colors[overlayName]
            const overlayStyle = overlayParams.style
            const overlayCondition = overlayParams.displayCondition
            if (!overlayCondition) {
              return
            }

            this.selections.overlays.push(`Overlay-${overlay}`)
            this.toggleVectorLayer(
              overlayStyle,
              source,
              overlayName,
              overlayCondition,
            )
          })
          this.emitter.emit('updatePermalink')
        }
      },
    },
  },
  methods: {
    buildTilegrid(extent) {
      const maxDimension = extent[2] - extent[0]
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
    createPlacenameStyle() {
      const styleConfig = {
        0: {
          textSize: 16,
          fontWeight: 'bold',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.9)',
          haloWidth: 3,
          offsetY: -15,
          minZoom: 1,
          dotRadius: 6,
          dotColor: 'rgba(0, 0, 0, 0.8)',
          dotStrokeWidth: 2,
          dotStrokeColor: 'white',
        },
        1: {
          textSize: 14,
          fontWeight: 'bold',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.9)',
          haloWidth: 2.5,
          offsetY: -12,
          minZoom: 3,
          dotRadius: 5,
          dotColor: 'rgba(0, 0, 0, 0.9)',
          dotStrokeWidth: 1.5,
          dotStrokeColor: 'white',
        },
        2: {
          textSize: 13,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.9)',
          haloWidth: 2,
          offsetY: -10,
          minZoom: 5,
          dotRadius: 4,
          dotColor: 'rgba(0, 0, 0, 0.6)',
          dotStrokeWidth: 1.5,
          dotStrokeColor: 'white',
        },
        3: {
          textSize: 12,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.85)',
          haloWidth: 1.5,
          offsetY: -8,
          minZoom: 7,
          dotRadius: 3,
          dotColor: 'rgba(0, 0, 0, 0.5)',
          dotStrokeWidth: 1,
          dotStrokeColor: 'white',
        },
        4: {
          textSize: 11.5,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.85)',
          haloWidth: 1,
          offsetY: -6,
          minZoom: 9,
          dotRadius: 2,
          dotColor: 'rgba(0, 0, 0, 0.4)',
          dotStrokeWidth: 1,
          dotStrokeColor: 'white',
        },
        5: {
          textSize: 11,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.75)',
          haloWidth: 1,
          offsetY: -5,
          minZoom: 10,
          dotRadius: 1.5,
          dotColor: 'rgba(0, 0, 0, 0.35)',
          dotStrokeWidth: 0.5,
          dotStrokeColor: 'white',
        },
        6: {
          textSize: 10.5,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.7)',
          haloWidth: 1,
          offsetY: -4.5,
          minZoom: 11,
          dotRadius: 1.25,
          dotColor: 'rgba(0, 0, 0, 0.3)',
          dotStrokeWidth: 0.5,
          dotStrokeColor: 'white',
        },
        7: {
          textSize: 10,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.65)',
          haloWidth: 1,
          offsetY: -4,
          minZoom: 12,
          dotRadius: 1,
          dotColor: 'rgba(0, 0, 0, 0.25)',
          dotStrokeWidth: 0.5,
          dotStrokeColor: 'white',
        },
        8: {
          textSize: 9.5,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.6)',
          haloWidth: 1,
          offsetY: -3.5,
          minZoom: 13,
          dotRadius: 0.75,
          dotColor: 'rgba(0, 0, 0, 0.2)',
          dotStrokeWidth: 0.5,
          dotStrokeColor: 'white',
        },
        9: {
          textSize: 9.5,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.6)',
          haloWidth: 1,
          offsetY: -3.5,
          minZoom: 14,
          dotRadius: 0.75,
          dotColor: 'rgba(0, 0, 0, 0.2)',
          dotStrokeWidth: 0.5,
          dotStrokeColor: 'white',
        },
        10: {
          textSize: 9.5,
          fontWeight: 'normal',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.6)',
          haloWidth: 1,
          offsetY: -3.5,
          minZoom: 15,
          dotRadius: 0.75,
          dotColor: 'rgba(0, 0, 0, 0.2)',
          dotStrokeWidth: 0.5,
          dotStrokeColor: 'white',
        },
      }
      const this_ = this
      return function (feature, resolution) {
        const properties = feature.getProperties()
        const name = properties.NAME
        let minZoom = properties.MIN_ZOOM
        let scalerank = properties.SCALERANK

        const majorCanadianCities = [
          'Montréal',
          'Calgary',
          'Winnipeg',
          'Halifax',
          'Regina',
        ]
        if (majorCanadianCities.includes(name)) {
          scalerank = 1
          minZoom = 1
        }

        const config = styleConfig[scalerank]

        // Calculate current zoom level from resolution
        // Needs to be double checked against the map's zoom level or it won't work on 4326
        const zoom_resolution =
          Math.log2(156543.03390625) - Math.log2(resolution)
        const zoom = this_.$mapCanvas.mapObj.getView().getZoom()

        if (zoom_resolution < minZoom || zoom < minZoom) {
          return null
        }

        const textSizeAdjusted =
          config.textSize + Math.max(0, (zoom - config.minZoom) / 2)
        const dotRadiusAdjusted =
          config.dotRadius + Math.max(0, (zoom - config.minZoom) / 4)

        const dotStyle = new Style({
          image: new Circle({
            radius: dotRadiusAdjusted,
            fill: new Fill({
              color: config.dotColor,
            }),
            stroke: new Stroke({
              color: config.dotStrokeColor,
              width: config.dotStrokeWidth,
            }),
          }),
        })

        const textStyle = new Style({
          text: new Text({
            text: name,
            font: `${config.fontWeight} ${textSizeAdjusted}px 'Open Sans', 'Arial', sans-serif`,
            fill: new Fill({
              color: config.textColor,
            }),
            stroke: new Stroke({
              color: config.haloColor,
              width: config.haloWidth,
            }),
            offsetY: config.offsetY,
            overflow: true,
            placement: 'point',
          }),
        })

        return [dotStyle, textStyle]
      }
    },
    createTinyPlacenameStyle() {
      const styleConfig = {
        0: {
          textSize: 7,
          fontWeight: 'bold',
          textColor: 'black',
          haloColor: 'rgba(255, 255, 255, 0.9)',
          haloWidth: 3,
          offsetY: -15,
          minZoom: 1,
          dotRadius: 6,
          dotColor: 'rgba(0, 0, 0, 0.8)',
          dotStrokeWidth: 2,
          dotStrokeColor: 'white',
        },
        1: {
          textSize: 7,
          fontWeight: 'bold',
          textColor: 'rgba(0, 0, 0, 0.9)',
          haloColor: 'rgba(255, 255, 255, 0.85)',
          haloWidth: 2.5,
          offsetY: -12,
          minZoom: 3,
          dotRadius: 5,
          dotColor: 'rgba(0, 0, 0, 0.7)',
          dotStrokeWidth: 1.5,
          dotStrokeColor: 'white',
        },
        2: {
          textSize: 7,
          fontWeight: 'normal',
          textColor: 'rgba(0, 0, 0, 0.8)',
          haloColor: 'rgba(255, 255, 255, 0.8)',
          haloWidth: 2,
          offsetY: -10,
          minZoom: 5,
          dotRadius: 4,
          dotColor: 'rgba(0, 0, 0, 0.6)',
          dotStrokeWidth: 1.5,
          dotStrokeColor: 'white',
        },
      }
      const this_ = this
      return function (feature, resolution) {
        const properties = feature.getProperties()
        const name = properties.NAME
        const scalerank = properties.SCALERANK

        if (scalerank > 2) {
          return null
        }

        const majorCanadianCities = [
          'Toronto',
          'Montreal',
          'Vancouver',
          'Calgary',
          'Edmonton',
          'Ottawa',
          'Winnipeg',
          'Québec',
          'Hamilton',
          'Halifax',
        ]
        if (
          !(this_.currentCRS === 'EPSG:3995') &&
          scalerank > 0 &&
          !majorCanadianCities.includes(name)
        ) {
          return null
        }

        const config = styleConfig[scalerank]

        if (!config) {
          return null
        }

        const textStyle = new Style({
          text: new Text({
            text: name,
            font: `${config.fontWeight} ${config.textSize}px 'Open Sans', 'Arial', sans-serif`,
            fill: new Fill({
              color: config.textColor,
            }),
            stroke: new Stroke({
              color: config.haloColor,
              width: config.haloWidth,
            }),
            offsetY: config.offsetY,
            overflow: true,
            placement: 'point',
          }),
        })

        // Return both styles
        return [textStyle]
      }
    },
    getPreviewImage() {
      const crsNumber = this.currentCRS.split(':')[1]
      return new URL(
        `../../../assets/previews/CBMT-${crsNumber}.png`,
        import.meta.url,
      ).href
    },
    initializeMaps() {
      Object.entries(this.sources).forEach(([source, params]) => {
        if (params.displayCondition && params.callback) {
          Object.entries(params.colors).forEach(([colorName, value]) => {
            let colorValue = value
            if (source === 'Overlay') {
              if (value.displayCondition) {
                colorValue = value.style
              } else {
                return
              }
            }
            const targetRef = `${source}-${colorName}`
            const color = {
              name: colorName,
              value: colorValue,
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
    getUserSelectedOverlays() {
      const stored = localStorage.getItem('user-overlays')
      return stored ? JSON.parse(stored) : []
    },
    saveUserBasemapPreference(selections, backgroundColor) {
      let basename
      if (selections.base.includes('NoBasemap')) {
        basename = '0'
      } else if (!selections.base.includes('OSM')) {
        basename = selections.base
      }

      if (selections.base === 'OSM-Base') {
        localStorage.setItem('user-basemap', JSON.stringify(null))
      } else if (selections.base === 'OSM-Grey') {
        localStorage.setItem(
          'user-basemap',
          JSON.stringify([basename, '255,255,255']),
        )
      } else if (selections.base === 'Others-CBMT') {
        localStorage.setItem(
          'user-basemap',
          JSON.stringify([basename.split('-')[1], null]),
        )
      } else {
        localStorage.setItem(
          'user-basemap',
          JSON.stringify([basename, backgroundColor.join()]),
        )
      }
    },
    toggleVectorLayer(colors, source, colorName, displayCondition = undefined) {
      const layer = this.$mapCanvas.mapObj
        .getLayers()
        .getArray()
        .find((l) => l.get('layerName') === `${source}-${colorName}`)
      if (!layer) {
        this.$mapCanvas.mapObj.addLayer(
          this.createVectorLayer(colors, source, colorName, displayCondition),
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
    createVectorLayer(colors, source, colorName, displayCondition = undefined) {
      displayCondition =
        displayCondition || this.sources[source].displayCondition
      const sourceValues = this.sources[source]
      const zIndex =
        sourceValues.zIndex || sourceValues.colors[colorName].zIndex
      let extent
      let tileGrid = this.tilegrids[this.currentCRS]
      if (this.currentCRS === 'EPSG:3995') {
        extent = [-3299207.53, -3333134.03, 3299207.53, 3333134.03]
      } else if (this.currentCRS === 'EPSG:3978') {
        extent = [-7192737.96, -3004297.73, 5183275.29, 4484204.83]
      } else if (this.currentCRS === 'EPSG:3857') {
        if (
          (source === 'Overlay' && colorName !== 'Places') ||
          source === 'Simplified'
        ) {
          tileGrid = this.tilegrids['EPSG:3857-Boundaries']
        }
      }
      return new VectorTileLayer({
        source: new VectorTileSource({
          format: new MVT(),
          url: displayCondition.replace('CRS', this.currentCRS.split(':')[1]),
          tileGrid: tileGrid,
          projection: this.currentCRS,
        }),
        extent: extent,
        style: colors,
        layerName: `${source}-${colorName}`,
        zIndex: zIndex,
      })
    },
    noBasemapInit(previewMap, target, color, _) {
      const targetRef = this.$refs[target][0]

      targetRef.style.backgroundColor = `rgb(${color.value[0]},${color.value[1]},${color.value[2]})`

      previewMap.on('click', () => {
        this.isUserInitiated = true
        this.backgroundColor = { name: color.name, values: color.value }
        let background
        if (this.basemapSelection.split('-')[0] !== 'Others') {
          background = {
            basemap: this.basemapSelection.split('-')[0],
            name: this.basemapSelection.split('-')[1],
          }
        } else {
          background = {
            basemap: 'NoBasemap',
            name: color.name,
          }
        }
        this.whiteBasemapHandler(false, background)
      })

      return previewMap
    },
    simplifiedInit(previewMap, target, color, source) {
      const sourceValues = this.sources[source]
      const style = sourceValues.colors[color.name]
      const displayCondition =
        style.displayCondition || sourceValues.displayCondition
      let colorValue = color.value
      if (color.name === 'Places') {
        colorValue = this.createTinyPlacenameStyle()
      }
      const vtLayerTC = this.createVectorLayer(
        colorValue,
        source,
        color.name,
        displayCondition,
      )
      previewMap.addLayer(vtLayerTC)
      this.vectorRefs.push(this.$refs[target][0])

      const background = {
        basemap: source,
        name: color.name,
      }
      previewMap.on('click', () => {
        const currentBase = this.selections.base
        if (source === 'Overlay') {
          const index = this.selections.overlays.indexOf(
            `${source}-${color.name}`,
          )
          if (index !== -1) {
            this.selections.overlays.splice(index, 1)
          } else {
            this.selections.overlays.push(`${source}-${color.name}`)
          }
          this.toggleVectorLayer(
            color.value,
            source,
            color.name,
            displayCondition,
          )
          this.store.toggleOverlay(color.name)
          const overlayPreferences = this.getUserSelectedOverlays()
          const overlayPreferenceIndex = overlayPreferences.indexOf(color.name)
          if (this.activeOverlays.includes(color.name)) {
            if (overlayPreferenceIndex === -1) {
              overlayPreferences.push(color.name)
            }
          } else {
            if (overlayPreferenceIndex !== -1) {
              overlayPreferences.splice(overlayPreferenceIndex, 1)
            }
          }
          localStorage.setItem(
            'user-overlays',
            JSON.stringify(overlayPreferences),
          )
          this.emitter.emit('updatePermalink')
        } else if (currentBase === `${source}-${color.name}`) {
          this.isUserInitiated = true
          this.selections.base = this.selections.background
          this.basemapSelection = this.selections.background
          this.store.setBasemap('NoBasemap')
          this.emitter.emit('updatePermalink')
        } else {
          this.isUserInitiated = true
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
        this.isUserInitiated = true
        const newSelection = `${source}-${color.name}`
        if (!color.value.every((item) => item === null)) {
          this.store.setRGB(color.value)
        }
        this.basemapSelection = newSelection
      })
      return previewMap
    },
    cbmtStyle(map) {
      const tileServerUrl =
        this.currentCRS === 'EPSG:3857'
          ? 'https://tiles.arcgis.com/tiles/HsjBaDykC1mjhXz9/arcgis/rest/services/CBMT_CBCT_3857_V_OSM/VectorTileServer'
          : 'https://tiles.arcgis.com/tiles/HsjBaDykC1mjhXz9/arcgis/rest/services/CBMT_CBCT_3978_V_OSM/VectorTileServer'
      const styleURL =
        this.currentCRS === 'EPSG:3857'
          ? 'https://www.arcgis.com/sharing/rest/content/items/800d755712e8415aab301b9d55bc2800/resources/styles/root.json'
          : 'https://www.arcgis.com/sharing/rest/content/items/708e92c1f00941e3af3dd3c092ae4a0a/resources/styles/root.json'

      fetch(tileServerUrl + '?f=json')
        .then((response) => response.json())
        .then((metadata) => {
          const tileInfo = metadata.tileInfo
          const fullExtent = metadata.fullExtent
          const resolutions = tileInfo.lods.map((lod) => lod.resolution)

          const tileGrid = new TileGrid({
            extent: [
              fullExtent.xmin,
              fullExtent.ymin,
              fullExtent.xmax,
              fullExtent.ymax,
            ],
            origin: [tileInfo.origin.x, tileInfo.origin.y],
            resolutions: resolutions,
            tileSize: [tileInfo.rows, tileInfo.cols],
          })

          return fetch(styleURL)
            .then((response) => response.json())
            .then((styleJson) => {
              return olmsApply(map, styleJson, {
                resolutions: tileInfo.lods.map((lod) => lod.resolution),
              }).then((appliedMap) => {
                const layer = this.findCBMTLayer(appliedMap)
                if (layer instanceof VectorTileLayer) {
                  const newSource = new VectorTileSource({
                    format: new MVT(),
                    url: tileServerUrl + '/tile/{z}/{y}/{x}.pbf',
                    tileGrid: tileGrid,
                  })
                  layer.setSource(newSource)
                  layer.setZIndex(-1)
                }
              })
            })
        })
        .catch((error) => {
          console.error('Error loading vector tile style:', error)

          const fallbackLayer = new VectorTileLayer({
            source: new VectorTileSource({
              format: new MVT(),
              url: tileServerUrl + '/tile/{z}/{y}/{x}.pbf',
            }),
          })
          fallbackLayer.setZIndex(-1)
          map.addLayer(fallbackLayer)
        })
      const target = map.getTargetElement()
      target.style.backgroundColor = 'rgb(191,233,255)'
    },
    findCBMTLayer(map) {
      const layers = map.getLayers().getArray()
      return layers.find((layer) => {
        const source = layer.getSource()
        if (source && source.getUrls) {
          const urls = source.getUrls()
          return urls && urls.some((url) => url.includes('CBMT_CBCT'))
        }
        return false
      })
    },
    removeCBMTStyle(map) {
      const layerToRemove = this.findCBMTLayer(map)
      if (layerToRemove) {
        map.removeLayer(layerToRemove)
        this.styleApplied = false
      }
    },
    handleOthersSelection(colorName) {
      if (this.styleApplied) return
      this.isUserInitiated = true
      const newSelection = `Others-${colorName}`
      this.basemapSelection = newSelection

      const background = {
        basemap: 'Others',
        name: colorName,
      }
      this.whiteBasemapHandler(false, background)
      this.styleApplied = true
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
        center = [-60000, -500000]
      } else {
        center = fromLonLat([-90, 55])
      }

      let previewMap = new Map({
        target: this.$refs[target][0],
        layers: [],
        view: new View({
          center: center,
          minZoom: this.defaultZoomLevels[this.currentCRS],
          maxZoom: this.defaultZoomLevels[this.currentCRS],
          projection: this.currentCRS,
          zoom: this.defaultZoomLevels[this.currentCRS],
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
      const value = `${source}-${colorName}`

      if (typeSel === 'overlays') {
        return this.selections[typeSel].includes(value)
      } else {
        return this.selections[typeSel] === value
      }
    },
    setMapIsColored() {
      this.isMapColored = true
    },
    updateMap(map) {
      map
        .getLayers()
        .getArray()
        .forEach((layer) => {
          if (layer instanceof VectorTileLayer) {
            const layerName = layer.get('layerName')
            if (!layerName) {
              return
            }
            const [layerSource, layerColor] = layerName.split('-')
            const source = this.sources[layerSource]
            const style = source.colors[layerColor]
            const displayCondition =
              style.displayCondition || source.displayCondition

            let extent
            let tileGrid = this.tilegrids[this.currentCRS]
            if (this.currentCRS === 'EPSG:3995') {
              extent = [-3299207.53, -3333134.03, 3299207.53, 3333134.03]
            } else if (this.currentCRS === 'EPSG:3978') {
              extent = [-7192737.96, -3004297.73, 5183275.29, 4484204.83]
            } else if (this.currentCRS === 'EPSG:3857') {
              if (
                (layerSource === 'Overlay' && layerColor !== 'Places') ||
                layerSource === 'Simplified'
              ) {
                tileGrid = this.tilegrids['EPSG:3857-Boundaries']
              }
            }

            const newSource = new VectorTileSource({
              format: new MVT(),
              url: displayCondition.replace(
                'CRS',
                this.currentCRS.split(':')[1],
              ),
              tileGrid: tileGrid,
              projection: this.currentCRS,
            })

            layer.setSource(newSource)
            layer.setExtent(extent)
          }
        })
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

      if (this.selections.base === 'Others-CBMT') {
        this.removeCBMTStyle(this.$mapCanvas.mapObj)
        if (this.sources.Others.displayCondition) {
          this.cbmtStyle(this.$mapCanvas.mapObj)
          this.styleApplied = true
        } else {
          this.emitter.emit('crsBasemapMismatch', 'CBMT')
          this.isUserInitiated = true
          const newSelection = 'OSM-Base'
          this.basemapSelection = newSelection
        }
      }
      Object.values(this.maps).forEach((map) => {
        map.setView(
          new View({
            center: center,
            zoom: this.defaultZoomLevels[this.currentCRS],
            projection: this.currentCRS,
          }),
        )

        this.updateMap(map)
      })

      this.updateMap(this.$mapCanvas.mapObj)
    },
    whiteBasemapHandler(visible, background = null) {
      const basemap = this.$mapCanvas.mapObj.getLayers().getArray()[0]
      basemap.setVisible(visible)
      if (background) {
        if (background.basemap === 'Others') {
          this.store.setBasemap(background.name)
          this.selections.background = null
          this.backgroundColor = null
          this.store.setRGB([])
        } else {
          if (!this.backgroundColor) {
            let currentColor = this.basemapSelection.split('-')[1]
            if (
              currentColor === 'Base' ||
              this.basemapSelection.split('-')[0] === 'Others'
            ) {
              currentColor = 'Water'
            }
            this.backgroundColor = {
              name: currentColor,
              values: this.sources.NoBasemap.colors[currentColor],
            }
          }
          const rgb = this.backgroundColor.values
          const cssColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
          document.getElementById('map').style.backgroundColor = cssColor
          if (['NoBasemap', 'OSM'].includes(background.basemap)) {
            this.basemapSelection = `NoBasemap-${this.backgroundColor.name}`
            this.store.setBasemap('NoBasemap')
          } else {
            this.basemapSelection = `${background.basemap}-${background.name}`
            this.store.setBasemap(this.basemapSelection)
          }
          this.store.setRGB(rgb)
          this.selections.background = `NoBasemap-${this.backgroundColor.name}`
        }
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
  grid-gap: 3px;
}

.color-options {
  grid-template-columns: repeat(3, 1fr);
}

.map-preview {
  width: 98px;
  height: 80px;
  border: 1px solid #ccc;
  position: relative;
}

.color-options.four-items {
  grid-template-columns: repeat(4, 1fr);
}

.color-options.four-items .map-preview {
  width: 71px;
  height: 62px;
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
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -4px;
  margin-left: -2px;
  padding-left: 2px;
}

@media (max-height: 730px) {
  .map-previews-grid {
    max-height: calc(100vh - 52px - 102px - 10px);
  }
}

@media (max-width: 959px) and (max-height: 730px) {
  .map-previews-grid {
    max-height: calc(100vh - 94px - 102px - 10px);
  }
}

.source-group {
  display: flex;
  flex-direction: column;
}
</style>
