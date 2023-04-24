import treeEn_weather from "../../assets/trees/tree_en_weather";
import treeFr_weather from "../../assets/trees/tree_fr_weather";
import treeEn_climate from "../../assets/trees/tree_en_climate";
import treeFr_climate from "../../assets/trees/tree_fr_climate";
import locEn from "../../assets/locations/loc_en";
import locFr from "../../assets/locations/loc_fr";
import wmsSources from "../../../scripts/wms_sources_configs.json";
import i18n from "../../plugins/i18n.js";

const state = {
  animationTitle: "",
  currentWmsSource: "https://geo.weather.gc.ca/geomet",
  darkModeFlag: false,
  datetimeRangeSlider: [0, 1],
  exportStyle: null,
  extent: null,
  framesPerSecond: 3,
  fullTimestepsList: [],
  isAnimating: false,
  isTitleCustom: false,
  lang: "en",
  layerList: [],
  layerTreeItemsEn: [
    treeEn_weather.tree_en_weather,
    treeEn_climate.tree_en_climate,
  ],
  layerTreeItemsFr: [
    treeFr_weather.tree_fr_weather,
    treeFr_climate.tree_fr_climate,
  ],
  locationsEn: locEn.loc_en,
  locationsFr: locFr.loc_fr,
  mapTimeSettings: {
    SnappedLayer: null,
    Step: null,
    DateIndex: null,
    Extent: null,
    MapLegendLayer: null,
  },
  MP4CreateFlag: true,
  MP4ProgressPercent: 0,
  MP4URL: "null",
  rgb: {
    r: 200,
    g: 200,
    b: 200,
  },
  orderedLayers: [],
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
    Water_bodies: {
      layers: "shoreline_small,shoreline_mid,shoreline_large",
      url: "https://maps.geogratis.gc.ca/wms/canvec_en",
      zIndex: 9997,
      isShown: false,
    },
    Major_cities: {
      layers: "places_small,places_mid,places_large",
      url: "https://maps.geogratis.gc.ca/wms/canvec_en",
      zIndex: 9999,
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
  getFullTimestepsList: (state) => {
    return state.fullTimestepsList;
  },
  getUniqueTimestepsList: (state) => {
    return state.uniqueTimestepsList;
  },
  getLayerList: (state) => {
    return state.layerList;
  },
  getMP4URL: (state) => {
    return state.MP4URL;
  },
  getMapTimeSettings: (state) => {
    return state.mapTimeSettings;
  },
  getMP4CreateFlag: (state) => {
    return state.MP4CreateFlag;
  },
  getLocations: (state) => {
    if (state.lang === "en") {
      return state.locationsEn;
    } else {
      return state.locationsFr;
    }
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
  getOrderedLayers: (state) => {
    return state.orderedLayers;
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
  addLayer: (state, layer) => {
    state.layerList.push(layer);
  },
  removeLayer: (state, removedLayerName) => {
    state.layerList = state.layerList.filter(
      (l) => l.Name !== removedLayerName
    );
  },
  setLayerProperty: (state, [layerName, property, newVal]) => {
    state.layerList.find((l) => l.Name === layerName)[property] = newVal;
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
  setMapSnappedLayer: (state, layer) => {
    state.mapTimeSettings.SnappedLayer = layer;
  },
  setMapLegendLayer: (state, layer) => {
    if (layer !== "") {
      state.mapTimeSettings.MapLegendLayer = layer;
    } else {
      state.mapTimeSettings.MapLegendLayer = null;
    }
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
  setOrderedLayers: (state, newOrderOfLists) => {
    state.orderedLayers = newOrderOfLists;
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
  isTitleCustom: (state, isCustom) => {
    state.isTitleCustom = isCustom;
  },
  setCustomTitle: (state, title) => {
    state.animationTitle = title;
  },
  setAnimationTitle: (state, title) => {
    if (!state.isTitleCustom) {
      let titleLayer = state.layerList.filter((l) => i18n.t(l.Name) === title);
      if (titleLayer.length !== 0) {
        if (state.mapTimeSettings.SnappedLayer !== null) {
          state.animationTitle = title;
          state.mapTimeSettings.SnappedLayer.Title = state.animationTitle;
          let snapped = state.layerList.find(
            (l) => l.Name === state.mapTimeSettings.SnappedLayer.Name
          );
          snapped.Title = state.animationTitle;
        } else {
          state.animationTitle = title;
          titleLayer[0].Title = state.animationTitle;
        }
      } else {
        state.animationTitle = title;
      }
    }
  },
  setDefaultAnimationTitle: (state) => {
    if (state.mapTimeSettings.SnappedLayer !== null) {
      state.animationTitle = i18n.t(state.mapTimeSettings.SnappedLayer.Name);
      state.mapTimeSettings.SnappedLayer.Title = state.animationTitle;
      let titleLayer = state.layerList.filter((l) => i18n.t(l.Name) === title);
      titleLayer[0].Title = state.animationTitle;
      state.isTitleCustom = false;
    } else {
      let currentIntervalLayers = state.layerList.filter(
        (l) => l.isTemporal && l.dateTriplet[2] === state.mapTimeSettings.Step
      );
      if (currentIntervalLayers.length === 1) {
        state.animationTitle = i18n.t(currentIntervalLayers[0].Name);
        currentIntervalLayers[0].Title = state.animationTitle;
        state.isTitleCustom = false;
      }
    }
  },
};

const actions = {
  addTimestep({ commit }, payload) {
    commit("addTimestep", payload);
  },
  removeTimestep({ commit }, payload) {
    commit("removeTimestep", payload);
  },
  addLayer({ commit }, payload) {
    commit("addLayer", payload);
  },
  removeLayer({ commit }, payload) {
    commit("removeLayer", payload);
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
  setMapLegendLayer({ commit }, payload) {
    commit("setMapLegendLayer", payload);
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
  setOrderedLayers: ({ commit }, payload) => {
    commit("setOrderedLayers", payload);
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
