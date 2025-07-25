<template>
  <div ref="animation-canvas" id="animation-canvas"></div>
</template>

<script>
import datetimeManipulations from '../../mixins/datetimeManipulations'

import { applyTransform } from 'ol/extent.js'
import { get as getProjection, getTransform } from 'ol/proj.js'
import Graticule from 'ol/layer/Graticule.js'
import ImageWMS from 'ol/source/ImageWMS'
import Map from 'ol/Map'
import MVT from 'ol/format/MVT.js'
import OLImage from 'ol/layer/Image'
import OSM from 'ol/source/OSM'
import Stroke from 'ol/style/Stroke.js'
import TileLayer from 'ol/layer/Tile'
import View from 'ol/View'
import { Vector as VectorLayer } from 'ol/layer.js'
import { Vector as VectorSource } from 'ol/source.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorTileSource from 'ol/source/VectorTile.js'

import 'ol/ol.css'

export default {
  inject: ['store'],
  data() {
    return {
      copiedLayers: [],
      darkOSMCallback: null,
      loaded: 0,
      loading: 0,
    }
  },
  mixins: [datetimeManipulations],
  mounted() {
    this.emitter.on('animationCanvasReset', this.mapControls)
    this.animationCanvasSetup()
  },
  beforeUnmount() {
    this.emitter.off('animationCanvasReset', this.mapControls)
    this.removeLayersListeners()
    this.$animationCanvas.mapObj = {}
  },
  methods: {
    addLayersListeners() {
      this.$mapCanvas.mapObj.getLayers().forEach((layer) => {
        if (layer instanceof OLImage) {
          const source = layer.getSource()
          source.on('imageloadstart', this.incrementLoadingCount)
          source.on(
            ['imageloadend', 'imageloaderror'],
            this.incrementLoadedCount,
          )
        }
      })
      this.$animationCanvas.mapObj.getLayers().forEach((layer) => {
        if (layer instanceof OLImage) {
          const source = layer.getSource()
          source.on('imageloadstart', this.incrementLoadingCount)
          source.on(
            ['imageloadend', 'imageloaderror'],
            this.incrementLoadedCount,
          )
        }
      })
    },
    animationCanvasSetup() {
      let theMap = document.getElementById('map')
      theMap.style.height = `${theMap.offsetHeight}px`
      theMap.style.width = `${theMap.offsetWidth}px`
      document.getElementById('animation-canvas').style.height = `${
        this.currentAspect[this.currentResolution].height
      }px`
      document.getElementById('animation-canvas').style.width = `${
        this.currentAspect[this.currentResolution].width
      }px`

      const graticule = new Graticule({
        strokeStyle: new Stroke({
          color: 'rgba(0,0,0,0.85)',
          width: 1.2,
          lineDash: [0.5, 4],
        }),
        showLabels: true,
        wrapX: true,
        zIndex: 8000,
        visible: this.showGraticules,
      })

      const newProjection = getProjection(this.currentCRS)
      const fromLonLat = getTransform('EPSG:4326', newProjection)
      const worldExtent = this.crsList[this.currentCRS]
      newProjection.setWorldExtent(worldExtent)
      const projExtent = applyTransform(worldExtent, fromLonLat, undefined, 8)
      newProjection.setExtent(projExtent)

      this.$animationCanvas.mapObj = new Map({
        target: this.$refs['animation-canvas'],
        layers: [new TileLayer({ source: new OSM() }), graticule],
        view: new View({
          center: fromLonLat([-90, 55]),
          zoom: 4,
          maxZoom: 12,
          projection: this.currentCRS,
        }),
        pixelRatio: 1,
        controls: [],
        interactions: [],
      })
      const isBasemapVisible = this.$mapCanvas.mapObj
        .getLayers()
        .getArray()[0]
        .get('visible')
      if (isBasemapVisible) {
        this.coloredBasemapHandler()
      } else {
        this.$animationCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .setVisible(isBasemapVisible)
      }
      this.copyLayers()
      if (this.mapTimeSettings.DateIndex === this.datetimeRangeSlider[0])
        this.mapControls()

      this.addLayersListeners()
      const previewRect = document.getElementById('animation-rect')
      const size = [previewRect.offsetWidth, previewRect.offsetHeight]
      const mapView = this.$mapCanvas.mapObj.getView()
      const extent = mapView.calculateExtent(size)
      const rotation = mapView.getRotation()

      const animationView = this.$animationCanvas.mapObj.getView()

      if (rotation !== 0) {
        const centerX = (extent[0] + extent[2]) / 2
        const centerY = (extent[1] + extent[3]) / 2

        const width = extent[2] - extent[0]
        const height = extent[3] - extent[1]

        const cos = Math.abs(Math.cos(rotation))
        const sin = Math.abs(Math.sin(rotation))

        const originalWidth =
          (width * cos - height * sin) / (cos * cos - sin * sin)
        const originalHeight =
          (height * cos - width * sin) / (cos * cos - sin * sin)

        // Create the unrotated extent
        const unrotatedExtent = [
          centerX - originalWidth / 2,
          centerY - originalHeight / 2,
          centerX + originalWidth / 2,
          centerY + originalHeight / 2,
        ]

        // First set rotation to 0, fit to unrotated extent, then apply rotation
        animationView.setRotation(0)
        animationView.fit(unrotatedExtent, {
          size: [
            this.currentAspect[this.currentResolution].width,
            this.currentAspect[this.currentResolution].height,
          ],
        })
        animationView.setRotation(rotation)
      } else {
        animationView.setRotation(rotation)
        animationView.fit(extent, {
          size: [
            this.currentAspect[this.currentResolution].width,
            this.currentAspect[this.currentResolution].height,
          ],
        })
      }
    },
    coloredBasemapHandler() {
      if (this.rgb.length === 0) return
      if (this.darkOSMCallback === null) {
        this.darkOSMCallback = (evt) => {
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
            [
              255 - this.rgb[0],
              255 - this.rgb[1],
              255 - this.rgb[2],
              1.0,
            ].toString() +
            ')'
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height,
          )
          evt.context.globalCompositeOperation = 'source-over'
        }
      }
      this.$animationCanvas.mapObj
        .getLayers()
        .getArray()[0]
        .on('postrender', this.darkOSMCallback)
      this.$animationCanvas.mapObj.updateSize()
    },
    copyLayers() {
      this.$mapLayers.arr.forEach((layer) => {
        if (layer instanceof OLImage) {
          if (layer.get('layerVisibilityOn')) {
            const originalSource = layer.getSource()
            const originalUrl = originalSource.getUrl()
            const originalParams = originalSource.getParams()
            let originalProperties = Object.assign({}, layer.getProperties())
            delete originalProperties.map
            delete originalProperties.source

            const newSource = new ImageWMS({
              format: 'image/png',
              url: originalUrl,
              params: originalParams,
              transition: 0,
              crossOrigin: 'Anonymous',
              ratio: 1,
            })
            const newLayer = new OLImage({
              source: newSource,
            })
            newLayer.setProperties(originalProperties)
            newLayer.getSource().on('imageloaderror', (e) => {
              const layer = this.$mapLayers.arr.find(
                (l) => l.get('layerName') === newLayer.get('layerName'),
              )
              this.emitter.emit('loadingError', { layer: layer, error: e })
              this.emitter.emit('loadingError', { layer: newLayer, error: e })
            })
            this.copiedLayers.push(newLayer)
            this.$animationCanvas.mapObj.addLayer(newLayer)
          }
        }
      })
      this.$mapCanvas.mapObj.getLayers().forEach((layer) => {
        if (layer instanceof VectorTileLayer) {
          const originalSource = layer.getSource()
          const originalUrl = originalSource.getUrls()[0]
          const originalStyle = layer.getStyle()
          let originalProperties = Object.assign({}, layer.getProperties())
          delete originalProperties.map
          delete originalProperties.source

          const vectorTile = new VectorTileLayer({
            source: new VectorTileSource({
              format: new MVT(),
              url: originalUrl,
              tileGrid: originalSource.getTileGrid(),
              projection: this.currentCRS,
            }),
            style: originalStyle,
            ...originalProperties,
          })

          this.$animationCanvas.mapObj.addLayer(vectorTile)
        }
        if (layer instanceof VectorLayer) {
          const newSource = new VectorSource({
            features: layer
              .getSource()
              .getFeatures()
              .map((feature) => feature.clone()),
          })
          const vector = new VectorLayer({
            source: newSource,
            style: layer.getStyle(),
            zIndex: layer.getZIndex(),
            visible: layer.getVisible(),
          })

          this.$animationCanvas.mapObj.addLayer(vector)
        }
      })
    },
    incrementLoadedCount() {
      this.loaded++
    },
    incrementLoadingCount() {
      this.loading++
    },
    async mapControls() {
      const driverDate =
        this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex]
      let visibleTLayers = this.copiedLayers.filter((l) => {
        return l.get('layerVisibilityOn') && l.get('layerIsTemporal')
      })
      const numVisibleLayers = visibleTLayers.length
      for (let i = 0; i < numVisibleLayers; i++) {
        let dateArray = visibleTLayers[i].get('layerDateArray')
        const layerDateIndex = this.findLayerIndex(
          driverDate,
          dateArray,
          visibleTLayers[i].get('layerTimeStep'),
        )
        visibleTLayers[i].setProperties({
          layerDateIndex: layerDateIndex,
        })
        if (layerDateIndex >= 0) {
          this.setDateTime(visibleTLayers[i], dateArray[layerDateIndex])
          if (
            visibleTLayers[i].get('layerVisibilityOn') &&
            !visibleTLayers[i].get('visible')
          ) {
            visibleTLayers[i].setVisible(true)
          }
        } else if (visibleTLayers[i].get('visible')) {
          visibleTLayers[i].setVisible(false)
        }
      }
    },
    removeLayersListeners() {
      this.$mapCanvas.mapObj.getLayers().forEach((layer) => {
        if (layer instanceof OLImage) {
          const source = layer.getSource()
          source.un('imageloadstart', this.incrementLoadingCount)
          source.un(
            ['imageloadend', 'imageloaderror'],
            this.incrementLoadedCount,
          )
        }
      })
      this.$animationCanvas.mapObj.getLayers().forEach((layer) => {
        if (layer instanceof OLImage) {
          const source = layer.getSource()
          source.un('imageloadstart', this.incrementLoadingCount)
          source.un(
            ['imageloadend', 'imageloaderror'],
            this.incrementLoadedCount,
          )
        }
      })
    },
    async setDateTime(layer, date) {
      layer.getSource().updateParams({
        TIME: this.getProperDateString(date, layer.get('layerDateFormat')),
      })
    },
  },
  computed: {
    crsList() {
      return this.store.getCrsList
    },
    currentAspect() {
      return this.store.getCurrentAspect
    },
    currentCRS() {
      return this.store.getCurrentCRS
    },
    currentResolution() {
      return this.store.getCurrentResolution
    },
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    isAnimationReversed() {
      return this.store.getIsAnimationReversed
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    rgb() {
      return this.store.getRGB
    },
    showGraticules() {
      return this.store.getShowGraticules
    },
    dateIndexExtent() {
      return [this.mapTimeSettings.DateIndex, this.mapTimeSettings.Extent]
    },
  },
  watch: {
    dateIndexExtent: {
      deep: true,
      handler([newIndex, newExtent], [oldIndex, oldExtent]) {
        // Vue 3 watchers no longer get called if the same value is reassigned
        // Added a secondary watcher on extent to make sure the animation updates
        // when a value changes or gets removed from the extent
        let correctIndex
        if (!this.isAnimationReversed) {
          correctIndex =
            newIndex - oldIndex === 1 ||
            newIndex === this.datetimeRangeSlider[0]
        } else {
          correctIndex =
            oldIndex - newIndex === 1 ||
            newIndex === this.datetimeRangeSlider[1]
        }
        if (newIndex !== null && correctIndex) {
          this.mapControls()
        }
      },
    },
    loaded() {
      if (this.loading === this.loaded) {
        this.emitter.emit('layersRendered')
      }
    },
  },
}
</script>

<style scoped>
#animation-canvas {
  position: absolute;
  top: -100%;
  visibility: hidden;
}
</style>
