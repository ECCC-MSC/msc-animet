<template>
  <div>
    <img
      v-if="imgUrl && isFullSize"
      :src="imgUrl"
      @click="exitFullscreenOnClick"
      class="full-size"
    />
    <animation-canvas v-if="isAnimating && playState !== 'play'" />
    <div ref="map" class="map" id="map" :disabled="isAnimating">
      <animation-rectangle />
      <o-l-controls />
      <global-configs />
      <side-panel id="side_panel" />
      <div id="legendMapOverlay">
        <legend-controls
          v-for="name in activeLegends"
          :key="name"
          :name="name"
          @legend-click="selectImage"
          @legend-remove="removeLegend"
        />
      </div>
      <div id="textBoxOverlay">
        <editable-text-box
          v-for="textBox in textBoxes"
          :key="textBox.id"
          :id="textBox.id"
          :coord="textBox.coord"
        />
      </div>
      <time-controls />
    </div>
    <loading-bar :loading="loading > 0" />
    <get-feature-info />
    <span
      color="primary"
      id="animet_version"
      :class="
        mapTimeSettings.Step !== null
          ? collapsedControls
            ? 'animet-version-collapsed'
            : 'animet-version-open'
          : ''
      "
      >{{ `${$t('MSCAnimet')} ${version}` }}</span
    >
    <auto-refresh />
  </div>
</template>

<script>
import { applyTransform } from 'ol/extent.js'
import { Attribution, Control, ScaleLine } from 'ol/control'
import { get as getProjection, getTransform } from 'ol/proj.js'
import { Overlay } from 'ol'
import DragAndDrop from 'ol/interaction/DragAndDrop.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import GPX from 'ol/format/GPX.js'
import Graticule from 'ol/layer/Graticule.js'
import IGC from 'ol/format/IGC.js'
import ImageWMS from 'ol/source/ImageWMS'
import KML from 'ol/format/KML.js'
import Map from 'ol/Map'
import OLImage from 'ol/layer/Image'
import OSM from 'ol/source/OSM'
import Rotate from 'ol/control/Rotate.js'
import Stroke from 'ol/style/Stroke.js'
import TileLayer from 'ol/layer/Tile'
import TopoJSON from 'ol/format/TopoJSON.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import View from 'ol/View'

import 'ol/ol.css'

import datetimeManipulations from '../../mixins/datetimeManipulations'
import { useVectorShapes } from './VectorShapes'

import ContextMenu from 'ol-contextmenu'
import 'ol-contextmenu/dist/ol-contextmenu.css'

import { useI18n } from 'vue-i18n'
import { version } from '../../../package.json'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  mounted() {
    this.emitter.on('buildLayer', this.buildLayer)
    this.emitter.on('goToExtent', this.goToExtentHandler)
    this.emitter.on('localeChange', this.onLocaleChange)
    this.emitter.on('removeLayer', this.removeLayerHandler)
    window.addEventListener('keydown', this.onKeyDown)

    const scaleControl = new ScaleLine({
      units: 'metric',
    })

    this.graticule = new Graticule({
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

    this.$mapCanvas.mapObj = new Map({
      target: this.$refs['map'],
      layers: [this.osm, this.graticule],
      view: new View({
        center: fromLonLat([-90, 55]),
        zoom: 4,
        maxZoom: 12,
        projection: this.currentCRS,
      }),
      pixelRatio: 1,
      controls: [scaleControl],
    })

    let dragAndDropInteraction = new DragAndDrop({
      formatConstructors: [
        GPX,
        GeoJSON,
        IGC,
        new KML({ extractStyles: true }),
        TopoJSON,
      ],
    })
    dragAndDropInteraction.on('addfeatures', (event) => {
      const vectorSource = new VectorSource({
        features: event.features,
      })
      const vectorLayer = new VectorLayer({
        source: vectorSource,
      })
      const baseName = event.file.name.split('.')[0]
      const uniqueName = this.getUniqueLayerName(baseName)

      vectorLayer.setProperties({
        layerCurrentStyle: null,
        layerDateIndex: 0,
        layerIsTemporal: false,
        layerName: uniqueName,
        layerStyles: [],
        layerVisibilityOn: true,
        layerWmsIndex: -1,
        layerXmlName: uniqueName,
        legendColor: null,
      })
      this.setLayerZIndex(vectorLayer)
      this.$mapCanvas.mapObj.addLayer(vectorLayer)
      this.$mapCanvas.mapObj.getView().fit(vectorSource.getExtent())
    })
    this.$mapCanvas.mapObj.addInteraction(dragAndDropInteraction)

    const attribution = new Attribution()
    const legendMapOverlay = new Control({
      element: document.getElementById('legendMapOverlay'),
    })
    const textBoxOverlay = new Control({
      element: document.getElementById('textBoxOverlay'),
    })
    const timeControls = new Control({
      element: document.getElementById('time-controls'),
    })
    this.rotateArrow = new Rotate({ tipLabel: this.t('ResetRotation') })
    const sidePanel = new Control({
      element: document.getElementById('side_panel'),
    })
    const globalConfigs = new Control({
      element: document.getElementById('global_configs'),
    })
    const zoomPlus = new Control({
      element: document.getElementById('zoomPlus'),
    })
    const zoomMinus = new Control({
      element: document.getElementById('zoomMinus'),
    })
    const animetVersion = new Control({
      element: document.getElementById('animet_version'),
    })
    const timeSnackbar = new Control({
      element: document.getElementById('time-snackbar'),
    })
    const animationRect = new Control({
      element: document.getElementById('animation-rect'),
    })

    const popupGFI = new Overlay({
      id: 'popupGFI',
      element: document.getElementById('popupGFI'),
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    })

    const { addArrow, addBox, addCircle, addPolygon, selectedFeature } =
      useVectorShapes(this.$mapCanvas.mapObj)
    this.selectedFeature = selectedFeature
    this.addArrowFunction = addArrow
    this.addBoxFunction = addBox
    this.addCircleFunction = addCircle
    this.addPolygonFunction = addPolygon

    this.contextMenu = new ContextMenu({
      width: 170,
      defaultItems: false,
      items: this.contextMenuItems,
    })
    this.contextMenu.on('open', () => {
      this.contextMenuOpen = true
    })
    this.contextMenu.on('close', () => {
      this.contextMenuOpen = false
    })

    this.$mapCanvas.mapObj.addControl(animationRect)
    this.$mapCanvas.mapObj.addControl(animetVersion)
    this.$mapCanvas.mapObj.addControl(attribution)
    this.$mapCanvas.mapObj.addControl(this.contextMenu)
    this.$mapCanvas.mapObj.addControl(globalConfigs)
    this.$mapCanvas.mapObj.addControl(legendMapOverlay)
    this.$mapCanvas.mapObj.addControl(sidePanel)
    this.$mapCanvas.mapObj.addControl(textBoxOverlay)
    this.$mapCanvas.mapObj.addControl(timeControls)
    this.$mapCanvas.mapObj.addControl(timeSnackbar)
    this.$mapCanvas.mapObj.addControl(zoomMinus)
    this.$mapCanvas.mapObj.addControl(zoomPlus)

    this.$mapCanvas.mapObj.addControl(this.rotateArrow)

    this.$mapCanvas.mapObj.addOverlay(popupGFI)

    this.$mapCanvas.mapObj.on('moveend', () => {
      const view = this.$mapCanvas.mapObj.getView()
      const extent = view.calculateExtent(this.$mapCanvas.mapObj.getSize())
      const rotation = view.getRotation()
      this.store.setExtent([extent, rotation])
      this.emitter.emit('updatePermalink')
    })

    this.$mapCanvas.mapObj.on('singleclick', (evt) => {
      this.selectedLegendLayerName = null
      if (!this.selectedFeature && !this.contextMenuOpen) {
        this.emitter.emit('onMapClicked', { event: evt, overlay: popupGFI })
      }
    })
    this.$mapCanvas.mapObj
      .getViewport()
      .addEventListener('pointerdown', (evt) => {
        if (evt.target.tagName === 'CANVAS' || evt.target.tagName === 'IMG') {
          this.emitter.emit('changeTab')
        }
      })
    this.$mapCanvas.mapObj.on('movestart', (evt) => {
      this.emitter.emit('changeTab')
    })
    new ResizeObserver(() => {
      this.$mapCanvas.mapObj.updateSize()
    }).observe(this.$refs.map)
  },
  beforeUnmount() {
    this.emitter.off('buildLayer', this.buildLayer)
    this.emitter.off('goToExtent', this.goToExtentHandler)
    this.emitter.off('localeChange', this.onLocaleChange)
    this.emitter.off('removeLayer', this.removeLayerHandler)
    window.removeEventListener('keydown', this.onKeyDown)
  },
  methods: {
    addTextBox(evt) {
      this.store.addTextBox({
        id: this.textBoxId,
        coord: evt.coordinate,
      })
      this.textBoxId++
    },
    getUniqueLayerName(baseName) {
      const existingNames = new Set()

      this.$mapLayers.arr.forEach((layer) => {
        const layerName = layer.get('layerName')
        if (layerName) {
          existingNames.add(layerName)
        }
      })

      if (!existingNames.has(baseName)) {
        return baseName
      }

      let counter = 1
      let candidateName
      do {
        candidateName = `${baseName} (${counter})`
        counter++
      } while (existingNames.has(candidateName))

      return candidateName
    },
    async goToExtentHandler(locExtent) {
      let rotation = 0
      if (locExtent.length === 5) {
        rotation = locExtent.pop()
      }

      const currentView = this.$mapCanvas.mapObj.getView()

      if (rotation !== 0) {
        const centerX = (locExtent[0] + locExtent[2]) / 2
        const centerY = (locExtent[1] + locExtent[3]) / 2

        const width = locExtent[2] - locExtent[0]
        const height = locExtent[3] - locExtent[1]

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
        currentView.setRotation(0)
        currentView.fit(unrotatedExtent, {
          size: this.$mapCanvas.mapObj.getSize(),
        })
        currentView.setRotation(rotation)
      } else {
        currentView.fit(locExtent, { size: this.$mapCanvas.mapObj.getSize() })
      }
    },
    onKeyDown(event) {
      if (event.key === 'Delete') {
        this.removeLegend()
      }
    },
    onLocaleChange() {
      this.$mapCanvas.mapObj.removeControl(this.rotateArrow)
      this.rotateArrow = new Rotate({ tipLabel: this.t('ResetRotation') })
      this.$mapCanvas.mapObj.addControl(this.rotateArrow)
      this.updateContextMenu()
    },
    async removeLayerHandler(removedLayer) {
      if (this.activeLegends.includes(removedLayer.get('layerName'))) {
        this.store.removeActiveLegend(removedLayer.get('layerName'))
      }
      let layerFound = false
      if (
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()
          .find(
            (lf) => lf.get('layerName') === removedLayer.get('layerName'),
          ) !== undefined
      ) {
        layerFound = true
        this.$mapCanvas.mapObj.removeLayer(removedLayer)
      }

      this.$mapLayers.arr = this.$mapLayers.arr.filter(
        (layer) =>
          layer && layer.get('layerName') !== removedLayer.get('layerName'),
      )

      this.$mapLayers.arr.forEach((elem) =>
        elem.setZIndex(
          this.$mapLayers.arr.findIndex(
            (layerObj) => layerObj.get('layerName') === elem.get('layerName'),
          ),
        ),
      )
      if (this.loading !== 0) {
        this.loading = 0
      }
      if (removedLayer.get('layerIsTemporal') && layerFound) {
        this.emitter.emit('timeLayerRemoved', removedLayer)
      }
      this.emitter.emit('layerRemoved', removedLayer.get('layerName'))
    },
    removeLegend(name = null) {
      if (name) {
        this.store.removeActiveLegend(name)
        this.selectedLegendLayerName = null
        this.emitter.emit('updatePermalink')
      } else if (this.selectedLegendLayerName !== null) {
        this.store.removeActiveLegend(this.selectedLegendLayerName)
        this.selectedLegendLayerName = null
        this.emitter.emit('updatePermalink')
      }
    },
    selectImage(layerName) {
      this.selectedLegendLayerName = layerName
    },
    setLayerZIndex(layer) {
      if (!Number.isInteger(layer.get('zIndex'))) {
        layer.setZIndex(this.$mapLayers.arr.length)
        this.$mapLayers.arr.splice(layer.get('zIndex'), 0, layer)
      } else {
        if (
          this.$mapLayers.arr.length === 0 ||
          layer.get('zIndex') >
            this.$mapLayers.arr[this.$mapLayers.arr.length - 1].get('zIndex')
        ) {
          this.$mapLayers.arr.push(layer)
        } else {
          for (let i = 0; i < this.$mapLayers.arr.length; i++) {
            if (layer.get('zIndex') < this.$mapLayers.arr[i].get('zIndex')) {
              this.$mapLayers.arr.splice(i, 0, layer)
              break
            }
          }
        }
      }
    },
    async buildLayer(eventData) {
      const { layerData, source: wmsSource, autoPlay, range } = eventData
      let imageLayer = null
      imageLayer = new OLImage({
        source: new ImageWMS({
          format: 'image/png',
          url: wmsSource,
          params: { LAYERS: layerData.Name.split('/')[0] },
          transition: 0,
          crossOrigin: 'Anonymous',
          ratio: 1,
        }),
        maxZoom: 12.1,
        minZoom: 0.9,
        visible: Object.hasOwn(layerData, 'visible') ? layerData.visible : true,
        opacity: Object.hasOwn(layerData, 'opacity') ? layerData.opacity : 0.75,
        zIndex: Object.hasOwn(layerData, 'zIndex') ? layerData.zIndex : null,
      })
      imageLayer.setProperties({
        layerCurrentStyle: Object.hasOwn(layerData, 'currentStyle')
          ? layerData.currentStyle
          : layerData.Style.length === 0
            ? null
            : layerData.Style[0].Name,
        layerDateIndex: 0,
        layerIsTemporal: layerData.isTemporal,
        layerName: layerData.Name,
        layerStyles: layerData.Style,
        layerVisibilityOn: Object.hasOwn(layerData, 'visible')
          ? layerData.visible
          : true,
        layerWmsIndex: layerData.wmsIndex,
        layerXmlName: layerData.xmlName,
        legendColor: this.randomHSVtoRGB(),
      })

      if (layerData.isTemporal) {
        imageLayer.setProperties({
          layerModelRuns: null,
          layerCurrentMR: null,
        })
      }

      this.setLayerZIndex(imageLayer)

      imageLayer.getSource().on('imageloadstart', () => {
        this.loading += 1
      })
      imageLayer.getSource().on(['imageloadend', 'imageloaderror'], () => {
        this.loading -= 1
      })

      imageLayer.getSource().on('imageloaderror', (e) => {
        if (this.isAnimating && this.playState !== 'play') return
        const url = e.target.getUrl()
        const [key, values] = Object.entries(this.wmsSources).find(
          ([key, value]) => key !== 'Presets' && value.url === url,
        )
        let layerName
        if (values['source_validation']) {
          layerName = `${e.target.getParams()['LAYERS']}/${key}`
        } else {
          layerName = e.target.getParams()['LAYERS']
        }
        const layer = this.$mapLayers.arr.find(
          (l) => l.get('layerName') === layerName,
        )
        if (layer !== undefined)
          this.emitter.emit('loadingError', { layer: layer, error: e })
      })

      imageLayer.getSource().updateParams({
        STYLES: imageLayer.get('layerCurrentStyle'),
      })
      if (Object.hasOwn(layerData, 'legendDisplayed')) {
        if (layerData.legendDisplayed === true) {
          this.store.addActiveLegend(imageLayer.get('layerName'))
        }
      } else if (imageLayer.get('layerStyles').length !== 0) {
        this.store.addActiveLegend(imageLayer.get('layerName'))
      }
      if (imageLayer.get('layerIsTemporal')) {
        this.emitter.emit('addTemporalLayer', {
          imageLayer,
          layerData,
          autoPlay,
          range,
        })
      } else {
        this.$mapCanvas.mapObj.addLayer(imageLayer)
        if (autoPlay || range) {
          await new Promise((resolve) =>
            this.$mapCanvas.mapObj.once('rendercomplete', resolve),
          )
          if (autoPlay) {
            this.emitter.emit('toggleAnimation')
            this.store.setCollapsedControls(true)
          }
          if (range) {
            let [first, current, last, step] = range
            if (this.uniqueTimestepsList.includes(step)) {
              this.changeMapTime(step)
              const extentLength = this.mapTimeSettings.Extent.length - 1
              if (first === 'l' || first > extentLength) {
                first = extentLength
              }
              if (last === 'l' || last > extentLength) {
                last = extentLength
              }
              this.$nextTick(() => {
                this.store.setDatetimeRangeSlider([first, last])
                this.emitter.emit('updatePermalink')
              })
              if (current === 'l' || current > extentLength) {
                current = extentLength
              }
              this.store.setMapTimeIndex(current)
            }
          }
        }
      }
    },
    exitFullscreenOnClick() {
      this.store.setIsFullSize(false)
    },
    exitFullscreenOnEscape(event) {
      if (event.key === 'Escape') {
        this.store.setIsFullSize(false)
        event.preventDefault()
      }
    },
    randomHSVtoRGB() {
      var r, g, b, i, f, p, q, t
      this.h += this.golden_ratio_conjugate
      this.h %= 1

      i = Math.floor(this.h * 6)
      f = this.h * 6 - i
      p = this.v * (1 - this.s)
      q = this.v * (1 - f * this.s)
      t = this.v * (1 - (1 - f) * this.s)
      switch (i % 6) {
        case 0:
          ;(r = this.v), (g = t), (b = p)
          break
        case 1:
          ;(r = q), (g = this.v), (b = p)
          break
        case 2:
          ;(r = p), (g = this.v), (b = t)
          break
        case 3:
          ;(r = p), (g = q), (b = this.v)
          break
        case 4:
          ;(r = t), (g = p), (b = this.v)
          break
        case 5:
          ;(r = this.v), (g = p), (b = q)
          break
      }
      return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
      }
    },
    updateContextMenu() {
      if (this.contextMenu) {
        this.contextMenu.clear()
        this.contextMenuItems.forEach((item) => this.contextMenu.push(item))
      }
    },
    waitForElements() {
      return new Promise((resolve) => {
        const selectors = [
          '.ol-scale-line',
          '.ol-attribution.ol-uncollapsible',
          '.ol-rotate',
        ]
        let allExist = selectors.every(
          (selector) => document.querySelector(selector) !== null,
        )

        if (!allExist) {
          setTimeout(() => {
            this.waitForElements().then(resolve)
          }, 250)
        } else {
          resolve()
        }
      })
    },
  },
  computed: {
    activeLegends() {
      return this.store.getActiveLegends
    },
    collapsedControls() {
      return this.store.getCollapsedControls
    },
    crsList() {
      return this.store.getCrsList
    },
    currentCRS() {
      return this.store.getCurrentCRS
    },
    isFullSize() {
      return this.store.getIsFullSize
    },
    imgUrl() {
      return this.store.getImgURL
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    playState() {
      return this.store.getPlayState
    },
    showGraticules() {
      return this.store.getShowGraticules
    },
    textBoxes() {
      return this.store.textBoxes
    },
    uniqueTimestepsList() {
      return this.store.getUniqueTimestepsList
    },
    wmsSources() {
      return this.store.getWmsSources
    },
    contextMenuItems() {
      return [
        {
          text: this.t('AddTextbox'),
          classname: 'context-menu-icon mdi mdi-text-box-edit',
          callback: this.addTextBox,
        },
        '-',
        {
          text: this.t('AddArrow'),
          classname: 'context-menu-icon mdi mdi-arrow-top-right-thin',
          callback: this.addArrowFunction,
        },
        {
          text: this.t('AddBox'),
          classname: 'context-menu-icon mdi mdi-rectangle-outline',
          callback: this.addBoxFunction,
        },
        {
          text: this.t('AddCircle'),
          classname: 'context-menu-icon mdi mdi-circle-outline',
          callback: this.addCircleFunction,
        },
        {
          text: this.t('AddPolygon'),
          classname: 'context-menu-icon mdi mdi-vector-polygon',
          callback: this.addPolygonFunction,
        },
      ]
    },
    mapHeight() {
      return this.$mapCanvas.mapObj.getSize()[1]
    },
    mapWidth() {
      return this.$mapCanvas.mapObj.getSize()[0]
    },
    timeStep() {
      return this.mapTimeSettings.Step
    },
  },
  watch: {
    async collapsedControls(collapsed) {
      await this.waitForElements()
      const scaleLineElement = document.querySelector('.ol-scale-line')
      const attributionElement = document.querySelector(
        '.ol-attribution.ol-uncollapsible',
      )
      const rotateElement = document.querySelector('.ol-rotate')
      if (collapsed) {
        attributionElement.classList.add('attribution-collapsed')
        attributionElement.classList.remove('attribution-open')
        rotateElement.classList.add('rotate-collapsed')
        rotateElement.classList.remove('rotate-open')
        scaleLineElement.classList.add('scale-line-collapsed')
        scaleLineElement.classList.remove('scale-line-open')
      } else {
        attributionElement.classList.add('attribution-open')
        attributionElement.classList.remove('attribution-collapsed')
        rotateElement.classList.add('rotate-open')
        rotateElement.classList.remove('rotate-collapsed')
        scaleLineElement.classList.add('scale-line-open')
        scaleLineElement.classList.remove('scale-line-collapsed')
      }
    },
    showGraticules(isShown) {
      if (this.graticule !== null) {
        this.graticule.setVisible(isShown)
      }
    },
    isFullSize(newVal) {
      if (newVal) {
        document.addEventListener('keydown', this.exitFullscreenOnEscape)
      } else {
        document.removeEventListener('keydown', this.exitFullscreenOnEscape)
      }
    },
    async timeStep(newStep, oldStep) {
      await this.waitForElements()
      const scaleLineElement = document.querySelector('.ol-scale-line')
      const attributionElement = document.querySelector(
        '.ol-attribution.ol-uncollapsible',
      )
      const rotateElement = document.querySelector('.ol-rotate')
      if (newStep !== null && oldStep === null) {
        if (this.collapsedControls) {
          attributionElement.classList.add('attribution-collapsed')
          attributionElement.classList.remove('attribution-open')
          rotateElement.classList.add('rotate-collapsed')
          rotateElement.classList.remove('rotate-open')
          scaleLineElement.classList.add('scale-line-collapsed')
          scaleLineElement.classList.remove('scale-line-open')
        } else {
          attributionElement.classList.add('attribution-open')
          attributionElement.classList.remove('attribution-collapsed')
          rotateElement.classList.add('rotate-open')
          rotateElement.classList.remove('rotate-collapsed')
          scaleLineElement.classList.add('scale-line-open')
          scaleLineElement.classList.remove('scale-line-collapsed')
        }
      } else if (newStep === null && oldStep !== null) {
        scaleLineElement.classList.remove('scale-line-open')
        rotateElement.classList.remove('rotate-open')
        attributionElement.classList.remove('attribution-open')
        scaleLineElement.classList.remove('scale-line-collapsed')
        rotateElement.classList.remove('rotate-collapsed')
        attributionElement.classList.remove('attribution-collapsed')
      }
    },
  },
  data() {
    return {
      addArrowFunction: null,
      addBoxFunction: null,
      addCircleFunction: null,
      addPolygonFunction: null,
      contextMenu: null,
      contextMenuOpen: false,
      selectedFeature: undefined,
      golden_ratio_conjugate: (1 + Math.sqrt(5)) / 2 - 1,
      h: Math.random(),
      s: 0.95,
      v: 0.75,
      graticule: null,
      loading: 0,
      osm: new TileLayer({ source: new OSM() }),
      rotateArrow: null,
      selectedLegendLayerName: null,
      t: useI18n().t,
      textBoxId: 0,
      version: version,
    }
  },
}
</script>

<style>
.ol-attribution:not(.ol-collapsed) {
  background: none;
}
.ol-attribution ul {
  font-size: 10px;
  padding: 0;
}

.ol-attribution.ol-uncollapsible {
  bottom: 0;
}
.ol-rotate {
  left: 8px;
  bottom: 45px;
  right: auto;
  top: auto;
}
.ol-scale-line {
  bottom: 18px;
}
@media (max-width: 1120px) {
  .scale-line-open {
    bottom: 132px;
  }
  .rotate-open {
    bottom: 159px;
  }
  .attribution-open {
    bottom: 114px !important;
  }
}
@media (max-width: 565px) {
  .scale-line-collapsed {
    bottom: 65px;
  }
  .scale-line-open {
    bottom: 186px;
  }
  .rotate-collapsed {
    bottom: 92px;
  }
  .rotate-open {
    bottom: 213px;
  }
  .attribution-collapsed {
    bottom: 46px !important;
  }
  .attribution-open {
    bottom: 168px !important;
  }
}
.context-menu-icon::before {
  margin-right: 8px;
  margin-left: -5px;
  font-size: 1.3em;
}
</style>

<style scoped>
.full-size {
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.9);
  object-fit: contain;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.map {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 0;
}
#animet_version {
  position: absolute;
  bottom: 2px;
  left: 8px;
  margin: 0;
  color: black;
  text-shadow: 0 0 2px #fff;
  font-size: 10px;
}
@media (max-width: 1120px) {
  .animet-version-open {
    bottom: 116px !important;
  }
}
@media (max-width: 565px) {
  .animet-version-collapsed {
    bottom: 49px !important;
  }
  .animet-version-open {
    bottom: 170px !important;
  }
}
</style>
