import { default as layerTrees } from "../../assets/trees";
import wmsSources from "../../../scripts/wms_sources_configs.json";

const state = {
  activeLegendsList: [],
  animationTitle: "",
  collapseControls: false,
  colorBorder: false,
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
  currentWmsSource: Object.values(wmsSources)[0]["url"],
  datetimeRangeSlider: [null, null],
  extent: null,
  framesPerSecond: 3,
  fullTimestepsList: [],
  hidden: {
    info: false,
    title: false,
    topMenus: false,
    timeControls: false,
    sidePanel: false,
    zoom: false,
  },
  isAnimating: false,
  isAnimationReversed: false,
  isBasemapVisible: true,
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
  MP4CreateFlag: true,
  MP4ProgressPercent: 0,
  MP4URL: "null",
  outputDate: null,
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
  permalink: null,
  playState: "pause",
  resolution: "1080p",
  rgb: [],
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
  getCollapsedControls: (state) => {
    return state.collapseControls;
  },
  getColorBorder: (state) => {
    return state.colorBorder;
  },
  getCurrentAspect: (state) => {
    return state.currentAspect;
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
  getHidden: (state) => {
    return state.hidden;
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
  getTimeFormat: (state) => {
    return state.timeFormat;
  },
  getUniqueTimestepsList: (state) => {
    return state.uniqueTimestepsList;
  },
};

const mutations = {
  addActiveLegend: (state, legend) => {
    state.activeLegendsList.push(legend);
  },
  addTimestep: (state, timestep) => {
    state.fullTimestepsList.push(timestep);
    if (state.uniqueTimestepsList.indexOf(timestep) === -1) {
      state.uniqueTimestepsList.push(timestep);
    }
  },
  removeActiveLegend: (state, legend) => {
    state.activeLegendsList = state.activeLegendsList.filter(
      (l) => l !== legend
    );
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
  setHidden: (state, hiddenComponents) => {
    state.hidden = hiddenComponents;
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
  setMP4CreateFlag: (state, flag) => {
    state.MP4CreateFlag = flag;
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
  setOutputSize: (state, newSize) => {
    state.outputSize = newSize;
  },
  setOverlayDisplayed: (state, overlay) => {
    return (state.overlays[overlay]["isShown"] =
      !state.overlays[overlay]["isShown"]);
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
  setCurrentResolution({ commit }, payload) {
    commit("setCurrentResolution", payload);
  },
  setExtent({ commit }, payload) {
    commit("setExtent", payload);
  },
  setHidden({ commit }, payload) {
    commit("setHidden", payload);
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
  setMP4CreateFlag({ commit }, payload) {
    commit("setMP4CreateFlag", payload);
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
  setOutputSize({ commit }, payload) {
    commit("setOutputSize", payload);
  },
  setOverlayDisplayed({ commit }, payload) {
    commit("setOverlayDisplayed", payload);
  },
  setPermalink({ commit }, payload) {
    commit("setPermalink", payload);
  },
  setRGB({ commit }, payload) {
    commit("setRGB", payload);
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
