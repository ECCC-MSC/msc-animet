import axios from "axios";
import SaxonJS from "saxon-js";
import treeEn from "../../assets/trees/tree_en";
import treeFr from "../../assets/trees/tree_fr";
import locEn from "../../assets/locations/loc_en";
import locFr from "../../assets/locations/loc_fr";
import i18n from "../../plugins/i18n.js";

const state = {
  lang: "en",
  navBarMiniFlag: true,
  fetchAwaitFlag: false,
  layerTreeItemsEn: treeEn.tree_en,
  layerTreeItemsFr: treeFr.tree_fr,
  layerList: [],
  fullTimestepsList: [],
  uniqueTimestepsList: [],
  MP4URL: "null",
  MP4InProgress: false,
  MP4ProgressPercent: 0,
  mapTimeSettings: {
    SnappedLayer: null,
    Step: null,
    DateIndex: null,
    Extent: null,
    MapLegendLayer: null,
  },
  MP4CreateFlag: true,
  locationsEn: locEn.loc_en,
  locationsFr: locFr.loc_fr,
  extent: null,
  permalink: null,
  outputDate: null,
  exportStyle: null,
  outputSize: null,
  isAnimating: false,
  outputMapWH: [],
  timeFormat: true,
  darkModeFlag: false,
  orderedLayers: [],
  framesPerSecond: 3,
  datetimeRangeSlider: [0, 1],
  animationTitle: "",
  isTitleCustom: false,
};

const getters = {
  getGeoMetTreeItems: (state) => {
    if (state.lang === "en") {
      return state.layerTreeItemsEn;
    } else {
      return state.layerTreeItemsFr;
    }
  },
  getFetchAwaitFlag: (state) => {
    return state.fetchAwaitFlag;
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
  getNavBarMiniFlag: (state) => {
    return state.navBarMiniFlag;
  },
  getMP4URL: (state) => {
    return state.MP4URL;
  },
  getMP4Flag: (state) => {
    return state.MP4InProgress;
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
  getTimeFormat: (state) => {
    return state.timeFormat;
  },
  getDarkModeMap: (state) => {
    return state.darkModeFlag;
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
};

const mutations = {
  setLang: (state, lang) => {
    state.lang = lang;
  },
  setLayerTreeItemsEn: (state, items) => {
    state.layerTreeItemsEn = items;
  },
  setLayerTreeRootEn: (state, root) => {
    state.layerTreeRootEn = root;
  },
  setLayerTreeItemsFr: (state, items) => {
    state.layerTreeItemsFr = items;
  },
  setLayerTreeRootFr: (state, root) => {
    state.layerTreeRootFr = root;
  },
  setFetchAwaitFlag: (state, flag) => {
    state.fetchAwaitFlag = flag;
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
  setNavBarMiniFlag: (state, flag) => {
    state.navBarMiniFlag = flag;
  },
  setMP4URL: (state, URL) => {
    state.MP4URL = URL;
  },
  setMP4Flag: (state, flag) => {
    state.MP4InProgress = flag;
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
  setTimeFormat: (state, newTimeFormat) => {
    state.timeFormat = newTimeFormat;
  },
  setDarkModeMap: (state, newDarkModeMap) => {
    state.darkModeFlag = newDarkModeMap;
  },
  setOrderedLayers: (state, newOrderOfLists) => {
    state.orderedLayers = newOrderOfLists;
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
  setNavBarMiniFlag({ commit }, payload) {
    commit("setNavBarMiniFlag", payload);
  },
  setMP4URL({ commit }, payload) {
    commit("setMP4URL", payload);
  },
  setMP4Flag({ commit }, payload) {
    commit("setMP4Flag", payload);
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
  setTimeFormat({ commit }, payload) {
    commit("setTimeFormat", payload);
  },
  setDarkModeMap({ commit }, payload) {
    commit("setDarkModeMap", payload);
  },
  setOrderedLayers: ({ commit }, payload) => {
    commit("setOrderedLayers", payload);
  },
  async getCapabilities({ commit, dispatch }, payload) {
    if (state.layerTreeItemsEn === null) {
      const fullTree = await dispatch("fetchCapabilities", payload);
      commit("setLayerTreeItemsEn", fullTree.children);
      commit("setLayerTreeRootEn", fullTree.Title);
    }
    if (payload === "fr" && state.layerTreeItemsFr === null) {
      const fullTree = await dispatch("fetchCapabilities", payload);
      commit("setLayerTreeItemsFr", fullTree.children);
      commit("setLayerTreeRootFr", fullTree.Title);
    }
  },
  async fetchCapabilities({ state, commit }) {
    commit("setFetchAwaitFlag", false);
    let fetchedTree = null;
    await axios
      .get(
        `https://geo.weather.gc.ca/geomet?lang=${state.lang}&service=WMS&version=1.3.0&request=GetCapabilities`
      )
      .then((response) => {
        const xslt = `<xsl:stylesheet 
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
            xmlns:xs="http://www.w3.org/2001/XMLSchema"
            xmlns:mf="http://example.com/mf"
            exclude-result-prefixes="#all"
            xpath-default-namespace="http://www.opengis.net/wms"
            xmlns="http://www.w3.org/2005/xpath-functions"
            expand-text="yes"
            version="3.0">

            <xsl:strip-space elements="*"/>
            
            <xsl:mode on-no-match="shallow-skip"/>

            <xsl:output method="json" build-tree="no" indent="yes"/>
            
            <xsl:template match="/WMS_Capabilities/Capability/Layer" priority="5">
                <xsl:map>
                <xsl:apply-templates/>
                </xsl:map>
            </xsl:template>
            
            <xsl:template match="Layer/Title[1] | Layer/Name[1] | Layer/Abstract[1] | Layer/Dimension[1]">
                <xsl:map-entry key="local-name()" select="data()"/>
            </xsl:template>
            
            <xsl:template match="Layer[1]">
                <xsl:map-entry key="'children'">
                <xsl:sequence select="array { ../Layer/mf:apply-templates(.) }"/>
                </xsl:map-entry>
            </xsl:template>
            
            <xsl:template match="Layer[position() > 1]"/>
            
            <xsl:function name="mf:apply-templates" as="item()*">
                <xsl:param name="elements" as="element(*)*"/>
                <xsl:map>
                <xsl:apply-templates select="$elements/*"/>      
                </xsl:map>
            </xsl:function>
            
            </xsl:stylesheet>`;
        const jsonResult = SaxonJS.XPath.evaluate(
          `
            transform(
                map { 
                'source-node' : parse-xml($xml), 
                'stylesheet-text' : $xslt, 
                'delivery-format' : 'raw' 
                }
                )?output`,
          [],
          { params: { xml: response.data, xslt: xslt } }
        );
        return jsonResult;
      })
      .then((response) => {
        commit("setFetchAwaitFlag", true);
        fetchedTree = response;
      });
    return fetchedTree;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
