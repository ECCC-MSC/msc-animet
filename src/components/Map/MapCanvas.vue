<template>
  <div>
    <animation-canvas v-if="isAnimating && playState !== 'play'" />
    <div ref="map" class="white map" id="map" :disabled="isAnimating">
      <animation-rectangle />
      <custom-o-l-controls />
      <global-configs />
      <side-panel id="side_panel" />
      <div id="legendMapOverlay">
        <legend-controls
          v-for="name in getActiveLegends"
          :key="name"
          :name="name"
          @legend-click="selectImage"
        />
      </div>
      <time-controls />
    </div>
    <v-progress-linear
      :active="loading > 0"
      absolute
      bottom
      height="2"
      indeterminate
      id="progressBar"
    />
    <get-feature-info />
    <span
      color="primary"
      id="animet_version"
      :class="
        getMapTimeSettings.Step !== null
          ? getCollapsedControls
            ? 'animet-version-collapsed'
            : 'animet-version-open'
          : ''
      "
      >{{ `${$t("MSCAnimet")} ${version}` }}</span
    >
    <auto-refresh />
  </div>
</template>

<script>
import { applyTransform } from "ol/extent.js";
import { Attribution, Control, ScaleLine } from "ol/control";
import { get as getProjection, getTransform } from "ol/proj.js";
import Graticule from "ol/layer/Graticule.js";
import ImageWMS from "ol/source/ImageWMS";
import Map from "ol/Map";
import "ol/ol.css";
import OLImage from "ol/layer/Image";
import OSM from "ol/source/OSM";
import { Overlay } from "ol";
import Rotate from "ol/control/Rotate.js";
import Stroke from "ol/style/Stroke.js";
import TileLayer from "ol/layer/Tile";
import View from "ol/View";

import { mapGetters, mapState } from "vuex";

import AnimationCanvas from "../Animation/AnimationCanvas.vue";
import AnimationRectangle from "../Animation/AnimationRectangle.vue";
import AutoRefresh from "../Time/AutoRefresh.vue";
import CustomOLControls from "./CustomOLControls.vue";
import GetFeatureInfo from "./GetFeatureInfo.vue";
import GlobalConfigs from "./GlobalConfigs.vue";
import LegendControls from "./LegendControls.vue";
import SidePanel from "./SidePanel.vue";
import TimeControls from "../Time/TimeControls.vue";
import { version } from "../../../package.json";

export default {
  components: {
    AnimationCanvas,
    AnimationRectangle,
    AutoRefresh,
    CustomOLControls,
    GetFeatureInfo,
    GlobalConfigs,
    LegendControls,
    SidePanel,
    TimeControls,
  },
  mounted() {
    this.$root.$on("goToExtent", this.goToExtentHandler);
    this.$root.$on("buildLayer", this.buildLayer);
    this.$root.$on("localeChange", () => {
      this.$mapCanvas.mapObj.removeControl(this.rotateArrow);
      this.rotateArrow = new Rotate({ tipLabel: this.$t("ResetRotation") });
      this.$mapCanvas.mapObj.addControl(this.rotateArrow);
    });
    this.$root.$on("overlayToggle", this.manageOverlay);
    this.$root.$on("removeLayer", this.removeLayerHandler);

    window.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        this.removeLegend();
      }
    });

    const scaleControl = new ScaleLine({
      units: "metric",
    });

    this.graticule = new Graticule({
      strokeStyle: new Stroke({
        color: "rgba(0,0,0,0.85)",
        width: 1.2,
        lineDash: [0.5, 4],
      }),
      showLabels: true,
      wrapX: true,
      zIndex: 8000,
      visible: this.getShowGraticules,
    });

    const newProjection = getProjection(this.getCurrentCRS);
    const fromLonLat = getTransform("EPSG:4326", newProjection);
    const worldExtent = this.getCrsList[this.getCurrentCRS];
    newProjection.setWorldExtent(worldExtent);
    const projExtent = applyTransform(worldExtent, fromLonLat, undefined, 8);
    newProjection.setExtent(projExtent);

    this.$mapCanvas.mapObj = new Map({
      target: this.$refs["map"],
      layers: [this.osm, this.graticule],
      view: new View({
        center: fromLonLat([-90, 55]),
        zoom: 4,
        maxZoom: 12,
        projection: this.getCurrentCRS,
      }),
      pixelRatio: 1,
      controls: [scaleControl],
    });

    const attribution = new Attribution();
    const progressBar = new Control({
      element: document.getElementById("progressBar"),
    });
    const legendMapOverlay = new Control({
      element: document.getElementById("legendMapOverlay"),
    });
    const timeControls = new Control({
      element: document.getElementById("time-controls"),
    });
    this.rotateArrow = new Rotate({ tipLabel: this.$t("ResetRotation") });
    const sidePanel = new Control({
      element: document.getElementById("side_panel"),
    });
    const globalConfigs = new Control({
      element: document.getElementById("global_configs"),
    });
    const zoomPlus = new Control({
      element: document.getElementById("customZoomPlus"),
    });
    const zoomMinus = new Control({
      element: document.getElementById("customZoomMinus"),
    });
    const animetVersion = new Control({
      element: document.getElementById("animet_version"),
    });
    const timeSnackbar = new Control({
      element: document.getElementById("time-snackbar"),
    });
    const animationRect = new Control({
      element: document.getElementById("animation-rect"),
    });

    const popupGFI = new Overlay({
      id: "popupGFI",
      element: document.getElementById("popupGFI"),
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });

    this.$mapCanvas.mapObj.addControl(animationRect);
    this.$mapCanvas.mapObj.addControl(animetVersion);
    this.$mapCanvas.mapObj.addControl(attribution);
    this.$mapCanvas.mapObj.addControl(globalConfigs);
    this.$mapCanvas.mapObj.addControl(legendMapOverlay);
    this.$mapCanvas.mapObj.addControl(progressBar);
    this.$mapCanvas.mapObj.addControl(sidePanel);
    this.$mapCanvas.mapObj.addControl(timeControls);
    this.$mapCanvas.mapObj.addControl(timeSnackbar);
    this.$mapCanvas.mapObj.addControl(zoomMinus);
    this.$mapCanvas.mapObj.addControl(zoomPlus);

    this.$mapCanvas.mapObj.addControl(this.rotateArrow);

    this.$mapCanvas.mapObj.addOverlay(popupGFI);

    this.$mapCanvas.mapObj.on("moveend", () => {
      const view = this.$mapCanvas.mapObj.getView();
      const extent = view.calculateExtent(this.$mapCanvas.mapObj.getSize());
      const rotation = view.getRotation();
      this.$store.dispatch("Layers/setExtent", [extent, rotation]);
      this.$root.$emit("updatePermalink");
      this.resizeRefreshExpired();
    });

    this.$mapCanvas.mapObj.on("singleclick", (evt) => {
      this.$root.$emit("onMapClicked", evt, popupGFI);
    });
    this.$mapCanvas.mapObj
      .getViewport()
      .addEventListener("pointerdown", (evt) => {
        if (evt.target.tagName === "CANVAS" || evt.target.tagName === "IMG") {
          this.$root.$emit("changeTab");
        }
      });
    this.$mapCanvas.mapObj.on("movestart", (evt) => {
      this.$root.$emit("changeTab");
    });
    new ResizeObserver(() => {
      this.$mapCanvas.mapObj.updateSize();
    }).observe(this.$refs.map);
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.removeLegend);
  },
  methods: {
    async resizeRefreshExpired() {
      await new Promise((resolve) =>
        this.$mapCanvas.mapObj.once("rendercomplete", resolve)
      );
      this.$root.$emit("checkLoadingErrors");
    },
    async goToExtentHandler(locExtent) {
      let rotation = 0;
      if (locExtent.length === 5) {
        rotation = locExtent.pop();
      }
      const currentView = this.$mapCanvas.mapObj.getView();
      currentView.setRotation(rotation);
      currentView.fit(locExtent, { size: this.$mapCanvas.mapObj.getSize() });
    },
    async removeLayerHandler(removedLayer) {
      if (this.getActiveLegends.includes(removedLayer.get("layerName"))) {
        this.$store.dispatch(
          "Layers/removeActiveLegend",
          removedLayer.get("layerName")
        );
      }
      let layerFound = false;
      if (
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()
          .find((l) => l.get("layerName") === removedLayer.get("layerName")) !==
        undefined
      ) {
        layerFound = true;
        this.$mapCanvas.mapObj.removeLayer(removedLayer);
      }

      this.$mapLayers.arr.splice(removedLayer.get("zIndex"), 1);
      this.$mapLayers.arr.forEach((elem) =>
        elem.setZIndex(
          this.$mapLayers.arr.findIndex(
            (l) => l.get("layerName") === elem.get("layerName")
          )
        )
      );
      if (this.loading !== 0) {
        this.loading = 0;
      }
      if (removedLayer.get("layerIsTemporal") && layerFound) {
        this.$root.$emit("timeLayerRemoved", removedLayer);
      }
      this.$root.$emit("layerRemoved", removedLayer.get("layerName"));
    },
    removeLegend() {
      if (this.selectedLegendLayerName !== null) {
        this.$store.dispatch(
          "Layers/removeActiveLegend",
          this.selectedLegendLayerName
        );
        this.selectedLegendLayerName = null;
        this.$root.$emit("updatePermalink");
      }
    },
    selectImage(layerName) {
      this.selectedLegendLayerName = layerName;
    },
    setLayerZIndex(layer) {
      if (!Number.isInteger(layer.get("zIndex"))) {
        layer.setZIndex(this.$mapLayers.arr.length);
        this.$mapLayers.arr.splice(layer.get("zIndex"), 0, layer);
      } else {
        if (
          this.$mapLayers.arr.length === 0 ||
          layer.get("zIndex") >
            this.$mapLayers.arr[this.$mapLayers.arr.length - 1].get("zIndex")
        ) {
          this.$mapLayers.arr.push(layer);
        } else {
          for (let i = 0; i < this.$mapLayers.arr.length; i++) {
            if (layer.get("zIndex") < this.$mapLayers.arr[i].get("zIndex")) {
              this.$mapLayers.arr.splice(i, 0, layer);
              break;
            }
          }
        }
      }
    },
    async manageOverlay(layer, layerName) {
      const layerFound = this.$mapCanvas.mapObj
        .getLayers()
        .getArray()
        .filter((l) => l.get("layerName") === layerName);
      if (layerFound.length !== 0) {
        this.$mapCanvas.mapObj.removeLayer(layerFound[0]);
      } else {
        let special_layer = new OLImage({
          source: new ImageWMS({
            format: "image/png",
            url: layer.url,
            params: {
              layers: layer.layers,
            },
            transition: 0,
            crossOrigin: "Anonymous",
            ratio: 1,
          }),
          maxZoom: 12.1,
          minZoom: 0.9,
          visible: true,
          opacity: 1,
          zIndex: layer.zIndex,
        });
        special_layer.setProperties({
          layerName: layerName,
        });
        special_layer.getSource().on("imageloadstart", () => {
          this.loading += 1;
        });
        special_layer.getSource().on(["imageloadend", "imageloaderror"], () => {
          this.loading -= 1;
        });
        this.$mapCanvas.mapObj.addLayer(special_layer);
      }
      this.$store.dispatch("Layers/setOverlayDisplayed", layerName);
    },
    async buildLayer(layerData, wmsSource) {
      let imageLayer = null;
      imageLayer = new OLImage({
        source: new ImageWMS({
          format: "image/png",
          url: wmsSource,
          params: { LAYERS: layerData.Name },
          transition: 0,
          crossOrigin: "Anonymous",
          ratio: 1,
        }),
        maxZoom: 12.1,
        minZoom: 0.9,
        visible: Object.hasOwn(layerData, "visible") ? layerData.visible : true,
        opacity: Object.hasOwn(layerData, "opacity") ? layerData.opacity : 0.75,
        zIndex: Object.hasOwn(layerData, "zIndex") ? layerData.zIndex : null,
      });
      imageLayer.setProperties({
        layerCurrentStyle: Object.hasOwn(layerData, "currentStyle")
          ? layerData.currentStyle
          : layerData.Style.length === 0
          ? null
          : layerData.Style[0].Name,
        layerDateIndex: 0,
        layerIsTemporal: layerData.isTemporal,
        layerName: layerData.Name,
        layerStyles: layerData.Style,
        layerVisibilityOn: Object.hasOwn(layerData, "visible")
          ? layerData.visible
          : true,
        layerWmsIndex: layerData.wmsIndex,
        legendColor: this.randomHSVtoRGB(),
      });

      if (layerData.isTemporal) {
        imageLayer.setProperties({
          layerModelRuns: null,
          layerCurrentMR: null,
        });
      }

      this.setLayerZIndex(imageLayer);

      imageLayer.getSource().on("imageloadstart", () => {
        this.loading += 1;
      });
      imageLayer.getSource().on(["imageloadend", "imageloaderror"], () => {
        this.loading -= 1;
      });

      imageLayer.getSource().on("imageloaderror", (e) => {
        if (this.isAnimating && this.playState !== "play") return;
        this.$root.$emit("loadingError", imageLayer, e);
      });

      imageLayer.getSource().updateParams({
        STYLES: imageLayer.get("layerCurrentStyle"),
      });
      if (Object.hasOwn(layerData, "legendDisplayed")) {
        if (layerData.legendDisplayed === "1") {
          this.$store.dispatch(
            "Layers/addActiveLegend",
            imageLayer.get("layerName")
          );
        }
      } else if (imageLayer.get("layerStyles").length !== 0) {
        this.$store.dispatch(
          "Layers/addActiveLegend",
          imageLayer.get("layerName")
        );
      }
      if (imageLayer.get("layerIsTemporal")) {
        this.$root.$emit("addTemporalLayer", imageLayer, layerData);
      } else {
        this.$mapCanvas.mapObj.addLayer(imageLayer);
      }
    },
    randomHSVtoRGB() {
      var r, g, b, i, f, p, q, t;
      this.h += this.golden_ratio_conjugate;
      this.h %= 1;

      i = Math.floor(this.h * 6);
      f = this.h * 6 - i;
      p = this.v * (1 - this.s);
      q = this.v * (1 - f * this.s);
      t = this.v * (1 - (1 - f) * this.s);
      switch (i % 6) {
        case 0:
          (r = this.v), (g = t), (b = p);
          break;
        case 1:
          (r = q), (g = this.v), (b = p);
          break;
        case 2:
          (r = p), (g = this.v), (b = t);
          break;
        case 3:
          (r = p), (g = q), (b = this.v);
          break;
        case 4:
          (r = t), (g = p), (b = this.v);
          break;
        case 5:
          (r = this.v), (g = p), (b = q);
          break;
      }
      return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
      };
    },
    waitForElements() {
      return new Promise((resolve) => {
        const selectors = [
          ".ol-scale-line",
          ".ol-attribution.ol-uncollapsible",
          ".ol-rotate",
        ];
        let allExist = selectors.every(
          (selector) => document.querySelector(selector) !== null
        );

        if (!allExist) {
          setTimeout(() => {
            this.waitForElements().then(resolve);
          }, 250);
        } else {
          resolve();
        }
      });
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating", "playState"]),
    ...mapGetters("Layers", [
      "getActiveLegends",
      "getCollapsedControls",
      "getCrsList",
      "getCurrentCRS",
      "getHoldExtent",
      "getMapTimeSettings",
      "getShowGraticules",
    ]),
    mapHeight() {
      return this.$mapCanvas.mapObj.getSize()[1];
    },
    mapWidth() {
      return this.$mapCanvas.mapObj.getSize()[0];
    },
    timeStep() {
      return this.getMapTimeSettings.Step;
    },
  },
  watch: {
    async getCollapsedControls(collapsed) {
      await this.waitForElements();
      const scaleLineElement = document.querySelector(".ol-scale-line");
      const attributionElement = document.querySelector(
        ".ol-attribution.ol-uncollapsible"
      );
      const rotateElement = document.querySelector(".ol-rotate");
      if (collapsed) {
        attributionElement.classList.add("attribution-collapsed");
        attributionElement.classList.remove("attribution-open");
        rotateElement.classList.add("rotate-collapsed");
        rotateElement.classList.remove("rotate-open");
        scaleLineElement.classList.add("scale-line-collapsed");
        scaleLineElement.classList.remove("scale-line-open");
      } else {
        attributionElement.classList.add("attribution-open");
        attributionElement.classList.remove("attribution-collapsed");
        rotateElement.classList.add("rotate-open");
        rotateElement.classList.remove("rotate-collapsed");
        scaleLineElement.classList.add("scale-line-open");
        scaleLineElement.classList.remove("scale-line-collapsed");
      }
    },
    getShowGraticules(isShown) {
      if (this.graticule !== null) {
        this.graticule.setVisible(isShown);
      }
    },
    async timeStep(newStep, oldStep) {
      await this.waitForElements();
      const scaleLineElement = document.querySelector(".ol-scale-line");
      const attributionElement = document.querySelector(
        ".ol-attribution.ol-uncollapsible"
      );
      const rotateElement = document.querySelector(".ol-rotate");
      if (newStep !== null && oldStep === null) {
        if (this.getCollapsedControls) {
          attributionElement.classList.add("attribution-collapsed");
          attributionElement.classList.remove("attribution-open");
          rotateElement.classList.add("rotate-collapsed");
          rotateElement.classList.remove("rotate-open");
          scaleLineElement.classList.add("scale-line-collapsed");
          scaleLineElement.classList.remove("scale-line-open");
        } else {
          attributionElement.classList.add("attribution-open");
          attributionElement.classList.remove("attribution-collapsed");
          rotateElement.classList.add("rotate-open");
          rotateElement.classList.remove("rotate-collapsed");
          scaleLineElement.classList.add("scale-line-open");
          scaleLineElement.classList.remove("scale-line-collapsed");
        }
      } else if (newStep === null && oldStep !== null) {
        scaleLineElement.classList.remove("scale-line-open");
        rotateElement.classList.remove("rotate-open");
        attributionElement.classList.remove("attribution-open");
        scaleLineElement.classList.remove("scale-line-collapsed");
        rotateElement.classList.remove("rotate-collapsed");
        attributionElement.classList.remove("attribution-collapsed");
      }
    },
  },
  data() {
    return {
      golden_ratio_conjugate: (1 + Math.sqrt(5)) / 2 - 1,
      h: Math.random(),
      s: 0.95,
      v: 0.75,
      graticule: null,
      loading: 0,
      osm: new TileLayer({ source: new OSM() }),
      rotateArrow: null,
      selectedLegendLayerName: null,
      version: version,
    };
  },
};
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
  .scale-line-collapsed {
    bottom: 65px;
  }
  .scale-line-open {
    bottom: 132px;
  }
  .rotate-collapsed {
    bottom: 92px;
  }
  .rotate-open {
    bottom: 159px;
  }
  .attribution-collapsed {
    bottom: 46px !important;
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
</style>

<style scoped>
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
#progressBar {
  pointer-events: none !important;
  z-index: 3;
}
@media (max-width: 1120px) {
  .animet-version-collapsed {
    bottom: 49px !important;
  }
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
