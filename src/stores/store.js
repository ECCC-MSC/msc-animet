import { defineStore } from 'pinia'
import layerTrees from '../assets/trees'
import wmsSources from '../assets/wms_sources_configs.json'
import IntegerAssigner from '../utils/IntegerAssigner.js'

export const useStore = defineStore('store', {
  state: () => ({
    activeLegendsList: [],
    animationTitle: '',
    availableCRS: Object.keys(wmsSources).map((key) => {
      let treeName
      const lowerCaseKey = key.toLowerCase()
      if (lowerCaseKey === 'presets') {
        treeName = lowerCaseKey
      } else {
        treeName = 'tree_en_' + lowerCaseKey
      }
      const projections = 'proj_' + lowerCaseKey
      const projList = layerTrees[treeName][projections].map((item) =>
        item.toUpperCase(),
      )
      return projList
    }),
    basemap: 'OSM',
    collapseControls: false,
    colorBorder: false,
    configPanelHover: false,
    crsList: {
      'EPSG:3857': [-180.0, -85.06, 180.0, 85.06],
      'EPSG:3978': [-180.0, -80.0, 180.0, 86.46],
      'EPSG:3995': [-180.0, -70.0, 180.0, 90.0],
      'EPSG:4326': [-180.0, -90.0, 180.0, 90.0],
    },
    currentAspect: {
      name: 'Widescreen',
      '720p': {
        height: 720,
        width: 1280,
      },
      '1080p': {
        height: 1080,
        width: 1920,
      },
      aspect: '[16:9]',
    },
    currentCRS: 'EPSG:3857',
    currentWmsSource: Object.values(wmsSources)[0]['url'],
    datetimeRangeSlider: [null, null],
    extent: null,
    framesPerSecond: 3,
    fullTimestepsList: [],
    legendIndex: new IntegerAssigner(),
    imgURL: null,
    intersectDict: {},
    isAnimating: false,
    isAnimationReversed: false,
    isFullSize: false,
    isLooping: true,
    lang: 'en',
    layerTreeItemsEn: Object.keys(wmsSources).map((key) => {
      let treeName
      const lowerCaseKey = key.toLowerCase()
      if (lowerCaseKey === 'presets') {
        treeName = lowerCaseKey
      } else {
        treeName = 'tree_en_' + lowerCaseKey
      }
      return layerTrees[treeName][treeName]
    }),
    layerTreeItemsFr: Object.keys(wmsSources).map((key) => {
      let treeName
      const lowerCaseKey = key.toLowerCase()
      if (lowerCaseKey === 'presets') {
        treeName = lowerCaseKey
      } else {
        treeName = 'tree_fr_' + lowerCaseKey
      }
      return layerTrees[treeName][treeName]
    }),
    mapTimeSettings: {
      SnappedLayer: null,
      Step: null,
      DateIndex: null,
      Extent: null,
    },
    menusOpen: 0,
    modelRunMessages: null,
    MP4ProgressPercent: 0,
    MP4URL: null,
    outputDate: null,
    outputFormat: 'MP4',
    outputSize: null,
    overlays: [],
    pendingErrorResolution: false,
    permalink: null,
    playState: 'pause',
    resolution: '1080p',
    rgb: [],
    showGraticules: false,
    textBoxes: [],
    textBoxFocused: false,
    timeFormat: true,
    uniqueTimestepsList: [],
    wmsSources: wmsSources,
  }),
  getters: {
    getActiveLegends: (state) => state.activeLegendsList,
    getAnimationTitle: (state) => state.animationTitle,
    getAvailableCRS: (state) => state.availableCRS,
    getCollapsedControls: (state) => state.collapseControls,
    getColorBorder: (state) => state.colorBorder,
    getConfigPanelHover: (state) => state.configPanelHover,
    getCrsList: (state) => state.crsList,
    getCurrentAspect: (state) => state.currentAspect,
    getCurrentCRS: (state) => state.currentCRS,
    getCurrentResolution: (state) => state.resolution,
    getCurrentWmsSource: (state) => state.currentWmsSource,
    getDatetimeRangeSlider: (state) => state.datetimeRangeSlider,
    getExtent: (state) => state.extent,
    getFramesPerSecond: (state) => state.framesPerSecond,
    getBasemap: (state) => state.basemap,
    getIsLooping: (state) => state.isLooping,
    getIsFullSize: (state) => state.isFullSize,
    getGeoMetTreeItems: (state) =>
      state.lang === 'en' ? state.layerTreeItemsEn : state.layerTreeItemsFr,
    getGeoMetWmsSources: (state) => state.wmsSources,
    getImgURL: (state) => state.imgURL,
    getIntersectMessageDisplayed: (state) => state.intersectDict,
    getIsAnimating: (state) => state.isAnimating,
    getIsAnimationReversed: (state) => state.isAnimationReversed,
    getLegendIndex: (state) => state.legendIndex,
    getMapTimeSettings: (state) => state.mapTimeSettings,
    getMenusOpen: (state) => state.menusOpen,
    getModelRunMessages: (state) => state.modelRunMessages,
    getMP4ProgressPercent: (state) => state.MP4ProgressPercent,
    getMP4URL: (state) => state.MP4URL,
    getOutputDate: (state) => state.outputDate,
    getOutputFormat: (state) => state.outputFormat,
    getOutputSize: (state) => state.outputSize,
    getOverlays: (state) => state.overlays,
    getPendingErrorResolution: (state) => state.pendingErrorResolution,
    getPermalink: (state) => state.permalink,
    getPlayState: (state) => state.playState,
    getRGB: (state) => state.rgb,
    getShowGraticules: (state) => state.showGraticules,
    getTextBoxes: (state) => state.textBoxes,
    getTextBoxFocused: (state) => state.textBoxFocused,
    getTimeFormat: (state) => state.timeFormat,
    getUniqueTimestepsList: (state) => state.uniqueTimestepsList,
  },
  actions: {
    addActiveLegend(legend) {
      this.legendIndex.addItem(legend)
      this.activeLegendsList.push(legend)
    },
    addTextBox(textBox) {
      this.textBoxes.push(textBox)
    },
    addTimestep(timestep) {
      this.fullTimestepsList.push(timestep)
      if (this.uniqueTimestepsList.indexOf(timestep) === -1) {
        this.uniqueTimestepsList.push(timestep)
      }
    },
    removeActiveLegend(legend) {
      this.legendIndex.removeItem(legend)
      this.activeLegendsList = this.activeLegendsList.filter(
        (l) => l !== legend,
      )
    },
    removeIntersect(layerName) {
      delete this.intersectDict[layerName]
    },
    removeTextBox(textBoxId) {
      this.textBoxes = this.textBoxes.filter(
        (textBox) => textBox.id !== textBoxId,
      )
    },
    removeTimestep(timestep) {
      this.fullTimestepsList.splice(this.fullTimestepsList.indexOf(timestep), 1)
      if (this.fullTimestepsList.indexOf(timestep) === -1) {
        this.uniqueTimestepsList.splice(
          this.uniqueTimestepsList.indexOf(timestep),
          1,
        )
      }
    },
    setAnimationTitle(title) {
      this.animationTitle = title === null ? '' : title
    },
    setCollapsedControls(collapsed) {
      this.collapseControls = collapsed
    },
    setColorBorder(newStatus) {
      this.colorBorder = newStatus
    },
    setConfigPanelHover(hovered) {
      this.configPanelHover = hovered
    },
    setCurrentAspect(res) {
      this.currentAspect = res
    },
    setCurrentCRS(crs) {
      this.currentCRS = crs
    },
    setCurrentResolution(opt) {
      this.resolution = opt
    },
    setDatetimeRangeSlider(range) {
      this.datetimeRangeSlider = range
    },
    setExtent([extent, rotation]) {
      if (rotation !== 0) {
        extent.push(rotation)
      }
      this.extent = extent
    },
    setFramesPerSecond(fps) {
      this.framesPerSecond = fps
    },
    setImgURL(newURL) {
      this.imgURL = newURL
    },
    setIntersect([layerName, intersecting]) {
      this.intersectDict[layerName] = intersecting
    },
    setIsAnimating(newStatus) {
      this.isAnimating = newStatus
    },
    setIsAnimationReversed(isReversed) {
      this.isAnimationReversed = isReversed
    },
    setBasemap(newStatus) {
      this.basemap = newStatus
    },
    setIsFullSize(fullSize) {
      this.isFullSize = fullSize
    },
    setIsLooping(looping) {
      this.isLooping = looping
    },
    setLang(lang) {
      this.lang = lang
    },
    setMapSnappedLayer(layerName) {
      this.mapTimeSettings.SnappedLayer = layerName
    },
    setMapTimeIndex(index) {
      this.mapTimeSettings.DateIndex = index
    },
    setMapTimeSettings(settings) {
      this.mapTimeSettings = settings
    },
    setMenusOpen(open) {
      setTimeout(() => {
        if (open) {
          this.menusOpen += 1
        } else {
          this.menusOpen -= 1
        }
      }, 750)
    },
    setModelRunMessages(messages) {
      this.modelRunMessages = messages
    },
    setMP4Percent(percent) {
      this.MP4ProgressPercent = percent
    },
    setMP4URL(URL) {
      this.MP4URL = URL
    },
    setOutputDate(newOutputDate) {
      this.outputDate = newOutputDate
    },
    setOutputFormat(format) {
      this.outputFormat = format
    },
    setOutputSize(newSize) {
      this.outputSize = newSize
    },
    setPendingErrorResolution(isPending) {
      this.pendingErrorResolution = isPending
    },
    setPermalink(permalink) {
      this.permalink = permalink
    },
    setPlayState(playState) {
      this.playState = playState
    },
    setRGB(newRGB) {
      this.rgb = newRGB
    },
    setShowGraticules(isShown) {
      this.showGraticules = isShown
    },
    setTextBoxFocused(isFocused) {
      setTimeout(() => {
        this.textBoxFocused = isFocused
      }, 750)
    },
    setTimeFormat(newTimeFormat) {
      this.timeFormat = newTimeFormat
    },
    setWmsSourceURL(newWmsSource) {
      this.currentWmsSource = newWmsSource
    },
    toggleOverlay(overlay) {
      const index = this.overlays.indexOf(overlay)
      if (index !== -1) {
        this.overlays.splice(index, 1)
      } else {
        this.overlays.push(overlay)
      }
    },
  },
})
