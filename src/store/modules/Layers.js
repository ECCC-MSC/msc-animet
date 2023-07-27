import { default as layerTrees } from "../../assets/trees";
import wmsSources from "../../../scripts/wms_sources_configs.json";

const state = {
  animationTitle: "",
  currentWmsSource: Object.values(wmsSources)[0]["url"],
  datetimeRangeSlider: [null, null],
  exportStyle: null,
  extent: null,
  framesPerSecond: 3,
  fullTimestepsList: [],
  isAnimating: false,
  lang: "en",
  activeLegendsList: [],
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
  MP4CreateFlag: true,
  MP4ProgressPercent: 0,
  MP4URL: "null",
  playState: "pause",
  rgb: [],
  outputDate: null,
  outputMapWH: [],
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
  timeFormat: true,
  uniqueTimestepsList: [],
  wmsSources: wmsSources,
};

const getters = {
  getGeoMetTreeItems: (state) => {
    if (state.lang === "en") {
      return state.layerTreeItemsEn;
    } else {
      return state.layerTreeItemsFr;
    }
  },
  getPossibleOverlays: (state) => {
    return state.overlays;
  },
  getGeoMetWmsSources: (state) => {
    return state.wmsSources;
  },
  getUniqueTimestepsList: (state) => {
    return state.uniqueTimestepsList;
  },
  getActiveLegends: (state) => {
    return state.activeLegendsList;
  },
  getMP4URL: (state) => {
    return state.MP4URL;
  },
  getMapTimeSettings: (state) => {
    return state.mapTimeSettings;
  },
  getExtent: (state) => {
    return state.extent;
  },
  getPermalink: (state) => {
    return state.permalink;
  },
  getOutputDate: (state) => {
    return state.outputDate;
  },
  getExportStyle: (state) => {
    return state.exportStyle;
  },
  getOutputSize: (state) => {
    return state.outputSize;
  },
  getOutputWH: (state) => {
    return state.outputMapWH;
  },
  getRGB: (state) => {
    return state.rgb;
  },
  getTimeFormat: (state) => {
    return state.timeFormat;
  },
  getDatetimeRangeSlider: (state) => {
    return state.datetimeRangeSlider;
  },
  getAnimationTitle: (state) => {
    return state.animationTitle;
  },
  getCurrentWmsSource: (state) => {
    return state.currentWmsSource;
  },
};

const mutations = {
  setLang: (state, lang) => {
    state.lang = lang;
  },
  addTimestep: (state, timestep) => {
    state.fullTimestepsList.push(timestep);
    if (state.uniqueTimestepsList.indexOf(timestep) === -1) {
      state.uniqueTimestepsList.push(timestep);
    }
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
  addActiveLegend: (state, legend) => {
    state.activeLegendsList.push(legend);
  },
  removeActiveLegend: (state, legend) => {
    state.activeLegendsList = state.activeLegendsList.filter(
      (l) => l !== legend
    );
  },
  setMP4URL: (state, URL) => {
    state.MP4URL = URL;
  },
  setMP4Percent: (state, percent) => {
    state.MP4ProgressPercent = percent;
  },
  setMapTimeSettings: (state, settings) => {
    state.mapTimeSettings = settings;
  },
  setMapTimeIndex: (state, index) => {
    state.mapTimeSettings.DateIndex = index;
  },
  setMapSnappedLayer: (state, layerName) => {
    state.mapTimeSettings.SnappedLayer = layerName;
  },
  setMP4CreateFlag: (state, flag) => {
    state.MP4CreateFlag = flag;
  },
  setExtent: (state, extent) => {
    state.extent = extent;
  },
  setPermalink: (state, permalink) => {
    state.permalink = permalink;
  },
  setOutputDate: (state, newOutputDate) => {
    state.outputDate = newOutputDate;
  },
  setOverlayDisplayed: (state, overlay) => {
    return (state.overlays[overlay]["isShown"] =
      !state.overlays[overlay]["isShown"]);
  },
  setExportStyle: (state, styleUpdate) => {
    state.exportStyle = styleUpdate;
  },
  setOutputSize: (state, newSize) => {
    state.outputSize = newSize;
  },
  setIsAnimating: (state, newStatus) => {
    state.isAnimating = newStatus;
  },
  setOutputWH: (state, newWH) => {
    state.outputMapWH = newWH;
  },
  setRGB: (state, newRGB) => {
    state.rgb = newRGB;
  },
  setTimeFormat: (state, newTimeFormat) => {
    state.timeFormat = newTimeFormat;
  },
  setAnimationTitle: (state, title) => {
    state.animationTitle = title === null ? "" : title;
  },
  setWmsSourceURL: (state, newWmsSource) => {
    state.currentWmsSource = newWmsSource;
  },
  setFramesPerSecond: (state, fps) => {
    state.framesPerSecond = fps;
  },
  setDatetimeRangeSlider: (state, range) => {
    state.datetimeRangeSlider = range;
  },
  setPlayState: (state, playState) => {
    state.playState = playState;
  },
};

const actions = {
  addTimestep({ commit }, payload) {
    commit("addTimestep", payload);
  },
  removeTimestep({ commit }, payload) {
    commit("removeTimestep", payload);
  },
  addActiveLegend({ commit }, payload) {
    commit("addActiveLegend", payload);
  },
  removeActiveLegend({ commit }, payload) {
    commit("removeActiveLegend", payload);
  },
  setLang({ commit }, payload) {
    commit("setLang", payload);
  },
  setMP4URL({ commit }, payload) {
    commit("setMP4URL", payload);
  },
  setMP4Percent({ commit }, payload) {
    commit("setMP4Percent", payload);
  },
  setMapTimeSettings({ commit }, payload) {
    commit("setMapTimeSettings", payload);
  },
  setMapTimeIndex({ commit }, payload) {
    commit("setMapTimeIndex", payload);
  },
  setMapSnappedLayer({ commit }, payload) {
    commit("setMapSnappedLayer", payload);
  },
  setMP4CreateFlag({ commit }, payload) {
    commit("setMP4CreateFlag", payload);
  },
  setExtent({ commit }, payload) {
    commit("setExtent", payload);
  },
  setPermalink({ commit }, payload) {
    commit("setPermalink", payload);
  },
  setOutputDate({ commit }, payload) {
    commit("setOutputDate", payload);
  },
  setOverlayDisplayed({ commit }, payload) {
    commit("setOverlayDisplayed", payload);
  },
  setExportStyle({ commit }, payload) {
    commit("setExportStyle", payload);
  },
  setOutputSize({ commit }, payload) {
    commit("setOutputSize", payload);
  },
  setIsAnimating({ commit }, payload) {
    commit("setIsAnimating", payload);
  },
  setOutputWH({ commit }, payload) {
    commit("setOutputWH", payload);
  },
  setRGB({ commit }, payload) {
    commit("setRGB", payload);
  },
  setTimeFormat({ commit }, payload) {
    commit("setTimeFormat", payload);
  },
  setAnimationTitle({ commit }, payload) {
    commit("setAnimationTitle", payload);
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
