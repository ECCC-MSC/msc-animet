import { default as layerTrees } from "../../assets/trees";
import Vue from "vue";
import wmsSources from "../../../scripts/wms_sources_configs.json";

import IntegerAssigner from "../../utils/IntegerAssigner.js";

const state = {
  activeLegendsList: [],
  animationTitle: "",
  availableCRS: Object.keys(wmsSources).map((key) => {
    const treeName = "tree_en_" + key.toLowerCase();
    const projections = "proj_" + key.toLowerCase();
    return layerTrees[treeName][projections];
  }),
  collapseControls: false,
  colorBorder: false,
  crsList: {
    "EPSG:3857": [-180.0, -85.06, 180.0, 85.06],
    "EPSG:3978": [-180.0, -80.0, 180.0, 86.46],
    "EPSG:3995": [-180.0, -70.0, 180.0, 90.0],
    "EPSG:4326": [-180.0, -90.0, 180.0, 90.0],
  },
  currentAspect: {
    name: "Widescreen",
    "720p": {
      height: 720,
      width: 1280,
    },
    "1080p": {
      height: 1080,
      width: 1920,
    },
    aspect: "[16:9]",
  },
  currentCRS: "EPSG:3857",
  currentWmsSource: Object.values(wmsSources)[0]["url"],
  datetimeRangeSlider: [null, null],
  extent: null,
  framesPerSecond: 3,
  fullTimestepsList: [],
  legendIndex: new IntegerAssigner(),
  imgURL: null,
  intersectDict: {},
  isAnimating: false,
  isAnimationReversed: false,
  isBasemapVisible: true,
  isFullSize: false,
  isLooping: true,
  lang: "en",
  layerTreeItemsEn: Object.keys(wmsSources).map((key) => {
    const treeName = "tree_en_" + key.toLowerCase();
    return layerTrees[treeName][treeName];
  }),
  layerTreeItemsFr: Object.keys(wmsSources).map((key) => {
    const treeName = "tree_fr_" + key.toLowerCase();
    return layerTrees[treeName][treeName];
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
  outputFormat: "MP4",
  outputSize: null,
  overlays: {
    Boundaries: {
      layers:
        "boundary_large_01,boundary_small,boundary_mid,boundary_large_02,boundary_large_03",
      url: "https://maps.geogratis.gc.ca/wms/canvec_en",
      zIndex: 9998,
      isShown: false,
    },
    Major_cities: {
      layers: "places_small,places_mid,places_large",
      url: "https://maps.geogratis.gc.ca/wms/canvec_en",
      zIndex: 9999,
      isShown: false,
    },
    Water_bodies: {
      layers: "shoreline_small,shoreline_mid,shoreline_large",
      url: "https://maps.geogratis.gc.ca/wms/canvec_en",
      zIndex: 9997,
      isShown: false,
    },
  },
  pendingErrorResolution: false,
  permalink: null,
  playState: "pause",
  resolution: "1080p",
  rgb: [],
  showGraticules: false,
  timeFormat: true,
  uniqueTimestepsList: [],
  wmsSources: wmsSources,
};

const getters = {
  getActiveLegends: (state) => {
    return state.activeLegendsList;
  },
  getAnimationTitle: (state) => {
    return state.animationTitle;
  },
  getAvailableCRS: (state) => {
    return state.availableCRS;
  },
  getCollapsedControls: (state) => {
    return state.collapseControls;
  },
  getColorBorder: (state) => {
    return state.colorBorder;
  },
  getCrsList: (state) => {
    return state.crsList;
  },
  getCurrentAspect: (state) => {
    return state.currentAspect;
  },
  getCurrentCRS: (state) => {
    return state.currentCRS;
  },
  getCurrentResolution: (state) => {
    return state.resolution;
  },
  getCurrentWmsSource: (state) => {
    return state.currentWmsSource;
  },
  getDatetimeRangeSlider: (state) => {
    return state.datetimeRangeSlider;
  },
  getExtent: (state) => {
    return state.extent;
  },
  getGeoMetTreeItems: (state) => {
    if (state.lang === "en") {
      return state.layerTreeItemsEn;
    } else {
      return state.layerTreeItemsFr;
    }
  },
  getGeoMetWmsSources: (state) => {
    return state.wmsSources;
  },
  getImgURL: (state) => {
    return state.imgURL;
  },
  getIntersectMessageDisplayed: (state) => {
    return state.intersectDict;
  },
  getLegendIndex: (state) => {
    return state.legendIndex;
  },
  getMapTimeSettings: (state) => {
    return state.mapTimeSettings;
  },
  getMenusOpen: (state) => {
    return state.menusOpen;
  },
  getModelRunMessages: (state) => {
    return state.modelRunMessages;
  },
  getMP4URL: (state) => {
    return state.MP4URL;
  },
  getOutputDate: (state) => {
    return state.outputDate;
  },
  getOutputFormat: (state) => {
    return state.outputFormat;
  },
  getOutputSize: (state) => {
    return state.outputSize;
  },
  getPermalink: (state) => {
    return state.permalink;
  },
  getPossibleOverlays: (state) => {
    return state.overlays;
  },
  getRGB: (state) => {
    return state.rgb;
  },
  getShowGraticules: (state) => {
    return state.showGraticules;
  },
  getTimeFormat: (state) => {
    return state.timeFormat;
  },
  getUniqueTimestepsList: (state) => {
    return state.uniqueTimestepsList;
  },
};

const mutations = {
  addActiveLegend: (state, legend) => {
    state.legendIndex.addItem(legend);
    state.activeLegendsList.push(legend);
  },
  addTimestep: (state, timestep) => {
    state.fullTimestepsList.push(timestep);
    if (state.uniqueTimestepsList.indexOf(timestep) === -1) {
      state.uniqueTimestepsList.push(timestep);
    }
  },
  removeActiveLegend: (state, legend) => {
    state.legendIndex.removeItem(legend);
    state.activeLegendsList = state.activeLegendsList.filter(
      (l) => l !== legend
    );
  },
  removeIntersect: (state, layerName) => {
    Vue.delete(state.intersectDict, layerName);
  },
  removeTimestep: (state, timestep) => {
    state.fullTimestepsList.splice(
      state.fullTimestepsList.indexOf(timestep),
      1
    );
    if (state.fullTimestepsList.indexOf(timestep) === -1) {
      state.uniqueTimestepsList.splice(
        state.uniqueTimestepsList.indexOf(timestep),
        1
      );
    }
  },
  setAnimationTitle: (state, title) => {
    state.animationTitle = title === null ? "" : title;
  },
  setCollapsedControls: (state, collapsed) => {
    state.collapseControls = collapsed;
  },
  setColorBorder: (state, newStatus) => {
    state.colorBorder = newStatus;
  },
  setCurrentAspect: (state, res) => {
    state.currentAspect = res;
  },
  setCurrentCRS: (state, crs) => {
    state.currentCRS = crs;
  },
  setCurrentResolution: (state, opt) => {
    state.resolution = opt;
  },
  setDatetimeRangeSlider: (state, range) => {
    state.datetimeRangeSlider = range;
  },
  setExtent: (state, [extent, rotation]) => {
    if (rotation !== 0) {
      extent.push(rotation);
    }
    state.extent = extent;
  },
  setFramesPerSecond: (state, fps) => {
    state.framesPerSecond = fps;
  },
  setImgURL: (state, newURL) => {
    state.imgURL = newURL;
  },
  setIntersect: (state, [layerName, intersecting]) => {
    Vue.set(state.intersectDict, layerName, intersecting);
  },
  setIsAnimating: (state, newStatus) => {
    state.isAnimating = newStatus;
  },
  setIsAnimationReversed: (state, isReversed) => {
    state.isAnimationReversed = isReversed;
  },
  setIsBasemapVisible: (state, newStatus) => {
    state.isBasemapVisible = newStatus;
  },
  setIsFullSize: (state, fullSize) => {
    state.isFullSize = fullSize;
  },
  setIsLooping: (state, looping) => {
    state.isLooping = looping;
  },
  setLang: (state, lang) => {
    state.lang = lang;
  },
  setMapSnappedLayer: (state, layerName) => {
    state.mapTimeSettings.SnappedLayer = layerName;
  },
  setMapTimeIndex: (state, index) => {
    state.mapTimeSettings.DateIndex = index;
  },
  setMapTimeSettings: (state, settings) => {
    state.mapTimeSettings = settings;
  },
  setMenusOpen: (state, open) => {
    if (open) {
      state.menusOpen += 1;
    } else {
      state.menusOpen -= 1;
    }
  },
  setModelRunMessages: (state, messages) => {
    state.modelRunMessages = messages;
  },
  setMP4Percent: (state, percent) => {
    state.MP4ProgressPercent = percent;
  },
  setMP4URL: (state, URL) => {
    state.MP4URL = URL;
  },
  setOutputDate: (state, newOutputDate) => {
    state.outputDate = newOutputDate;
  },
  setOutputFormat: (state, format) => {
    state.outputFormat = format;
  },
  setOutputSize: (state, newSize) => {
    state.outputSize = newSize;
  },
  setOverlayDisplayed: (state, overlay) => {
    return (state.overlays[overlay]["isShown"] =
      !state.overlays[overlay]["isShown"]);
  },
  setPendingErrorResolution: (state, isPending) => {
    state.pendingErrorResolution = isPending;
  },
  setPermalink: (state, permalink) => {
    state.permalink = permalink;
  },
  setPlayState: (state, playState) => {
    state.playState = playState;
  },
  setRGB: (state, newRGB) => {
    state.rgb = newRGB;
  },
  setShowGraticules: (state, isShown) => {
    state.showGraticules = isShown;
  },
  setTimeFormat: (state, newTimeFormat) => {
    state.timeFormat = newTimeFormat;
  },
  setWmsSourceURL: (state, newWmsSource) => {
    state.currentWmsSource = newWmsSource;
  },
};

const actions = {
  addActiveLegend({ commit }, payload) {
    commit("addActiveLegend", payload);
  },
  addTimestep({ commit }, payload) {
    commit("addTimestep", payload);
  },
  removeActiveLegend({ commit }, payload) {
    commit("removeActiveLegend", payload);
  },
  removeIntersect({ commit }, payload) {
    commit("removeIntersect", payload);
  },
  removeTimestep({ commit }, payload) {
    commit("removeTimestep", payload);
  },
  setAnimationTitle({ commit }, payload) {
    commit("setAnimationTitle", payload);
  },
  setCollapsedControls({ commit }, payload) {
    commit("setCollapsedControls", payload);
  },
  setColorBorder({ commit }, payload) {
    commit("setColorBorder", payload);
  },
  setCurrentAspect({ commit }, payload) {
    commit("setCurrentAspect", payload);
  },
  setCurrentCRS({ commit }, payload) {
    commit("setCurrentCRS", payload);
  },
  setCurrentResolution({ commit }, payload) {
    commit("setCurrentResolution", payload);
  },
  setExtent({ commit }, payload) {
    commit("setExtent", payload);
  },
  setImgURL({ commit }, payload) {
    commit("setImgURL", payload);
  },
  setIntersect({ commit }, payload) {
    commit("setIntersect", payload);
  },
  setIsAnimating({ commit }, payload) {
    commit("setIsAnimating", payload);
  },
  setIsAnimationReversed({ commit }, payload) {
    commit("setIsAnimationReversed", payload);
  },
  setIsBasemapVisible({ commit }, payload) {
    commit("setIsBasemapVisible", payload);
  },
  setIsFullSize({ commit }, payload) {
    commit("setIsFullSize", payload);
  },
  setIsLooping({ commit }, payload) {
    commit("setIsLooping", payload);
  },
  setLang({ commit }, payload) {
    commit("setLang", payload);
  },
  setMapSnappedLayer({ commit }, payload) {
    commit("setMapSnappedLayer", payload);
  },
  setMapTimeIndex({ commit }, payload) {
    commit("setMapTimeIndex", payload);
  },
  setMapTimeSettings({ commit }, payload) {
    commit("setMapTimeSettings", payload);
  },
  setMenusOpen({ commit }, payload) {
    setTimeout(() => {
      commit("setMenusOpen", payload);
    }, 1000);
  },
  setModelRunMessages({ commit }, payload) {
    commit("setModelRunMessages", payload);
  },
  setMP4Percent({ commit }, payload) {
    commit("setMP4Percent", payload);
  },
  setMP4URL({ commit }, payload) {
    commit("setMP4URL", payload);
  },
  setOutputDate({ commit }, payload) {
    commit("setOutputDate", payload);
  },
  setOutputFormat({ commit }, payload) {
    commit("setOutputFormat", payload);
  },
  setOutputSize({ commit }, payload) {
    commit("setOutputSize", payload);
  },
  setOverlayDisplayed({ commit }, payload) {
    commit("setOverlayDisplayed", payload);
  },
  setPendingErrorResolution({ commit }, payload) {
    commit("setPendingErrorResolution", payload);
  },
  setPermalink({ commit }, payload) {
    commit("setPermalink", payload);
  },
  setRGB({ commit }, payload) {
    commit("setRGB", payload);
  },
  setShowGraticules({ commit }, payload) {
    commit("setShowGraticules", payload);
  },
  setTimeFormat({ commit }, payload) {
    commit("setTimeFormat", payload);
  },
  setWmsSourceURL({ commit }, payload) {
    commit("setWmsSourceURL", payload);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
