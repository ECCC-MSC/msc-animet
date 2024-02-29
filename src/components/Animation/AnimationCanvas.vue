<template>
  <div ref="animation-canvas" id="animation-canvas"></div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

import { applyTransform } from "ol/extent.js";
import { get as getProjection, getTransform } from "ol/proj.js";
import Graticule from "ol/layer/Graticule.js";
import ImageWMS from "ol/source/ImageWMS";
import Map from "ol/Map";
import OLImage from "ol/layer/Image";
import OSM from "ol/source/OSM";
import Stroke from "ol/style/Stroke.js";
import TileLayer from "ol/layer/Tile";
import View from "ol/View";

import "ol/ol.css";

export default {
  data() {
    return {
      cancelExpired: false,
      copiedLayers: [],
      darkOSMCallback: null,
      loaded: 0,
      loading: 0,
    };
  },
  mixins: [datetimeManipulations],
  mounted() {
    this.$root.$on("animationCanvasReset", this.mapControls);
    this.$root.$on("cancelExpired", this.handleCancelExpired);
    this.$root.$on("redoAnimation", this.resetCounters);
    this.animationCanvasSetup();
  },
  beforeDestroy() {
    this.$root.$off("animationCanvasReset", this.mapControls);
    this.$root.$off("cancelExpired", this.handleCancelExpired);
    this.$root.$off("redoAnimation", this.resetCounters);
    this.$animationCanvas.mapObj = {};
  },
  methods: {
    addOverlays() {
      for (const [key, values] of Object.entries(this.getPossibleOverlays)) {
        if (values.isShown) {
          let special_layer = new OLImage({
            source: new ImageWMS({
              format: "image/png",
              url: values.url,
              params: {
                layers: values.layers,
              },
              transition: 0,
              crossOrigin: "Anonymous",
              ratio: 1,
            }),
            maxZoom: 12.1,
            minZoom: 0.9,
            visible: true,
            opacity: 1,
            zIndex: values.zIndex,
          });
          special_layer.setProperties({
            layerName: key,
          });
          this.$animationCanvas.mapObj.addLayer(special_layer);
        }
      }
    },
    animationCanvasSetup() {
      let theMap = document.getElementById("map");
      theMap.style.height = `${theMap.offsetHeight}px`;
      theMap.style.width = `${theMap.offsetWidth}px`;
      document.getElementById("animation-canvas").style.height = `${
        this.getCurrentAspect[this.getCurrentResolution].height
      }px`;
      document.getElementById("animation-canvas").style.width = `${
        this.getCurrentAspect[this.getCurrentResolution].width
      }px`;

      const graticule = new Graticule({
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

      this.$animationCanvas.mapObj = new Map({
        target: this.$refs["animation-canvas"],
        layers: [new TileLayer({ source: new OSM() }), graticule],
        view: new View({
          center: fromLonLat([-90, 55]),
          zoom: 4,
          maxZoom: 12,
          projection: this.getCurrentCRS,
        }),
        pixelRatio: 1,
        controls: [],
        interactions: [],
      });
      const isBasemapVisible = this.$mapCanvas.mapObj
        .getLayers()
        .getArray()[0]
        .get("visible");
      if (isBasemapVisible) {
        this.coloredBasemapHandler();
      } else {
        this.$animationCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .setVisible(isBasemapVisible);
      }
      this.copyLayers();
      this.addOverlays();
      if (this.getMapTimeSettings.DateIndex === this.datetimeRangeSlider[0])
        this.mapControls();
      this.$mapCanvas.mapObj.getLayers().forEach((layer) => {
        if (layer instanceof OLImage) {
          layer.getSource().on("imageloadstart", () => {
            this.loading++;
          });

          layer.getSource().on("imageloadend", () => {
            this.loaded++;
          });
        }
      });

      this.$animationCanvas.mapObj.getLayers().forEach((layer) => {
        if (layer instanceof OLImage) {
          layer.getSource().on("imageloadstart", () => {
            this.loading++;
          });

          layer.getSource().on("imageloadend", () => {
            this.loaded++;
          });
        }
      });
      const previewRect = document.getElementById("animation-rect");
      const size = [previewRect.offsetWidth, previewRect.offsetHeight];
      const mapView = this.$mapCanvas.mapObj.getView();
      const extent = mapView.calculateExtent(size);
      const rotation = mapView.getRotation();

      this.$animationCanvas.mapObj.getView().setRotation(rotation);
      this.$animationCanvas.mapObj.getView().fit(extent, {
        size: [
          this.getCurrentAspect[this.getCurrentResolution].width,
          this.getCurrentAspect[this.getCurrentResolution].height,
        ],
      });
    },
    coloredBasemapHandler() {
      if (this.getRGB.length === 0) return;
      if (this.darkOSMCallback === null) {
        this.darkOSMCallback = (evt) => {
          evt.context.globalCompositeOperation = "color";
          evt.context.fillStyle = "rgb(0,0,0)";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "overlay";
          evt.context.fillStyle = "rgb(0,0,0)";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "difference";
          evt.context.fillStyle =
            "rgba(" +
            [
              255 - this.getRGB[0],
              255 - this.getRGB[1],
              255 - this.getRGB[2],
              1.0,
            ].toString() +
            ")";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "source-over";
        };
      }
      this.$animationCanvas.mapObj
        .getLayers()
        .getArray()[0]
        .on("postrender", this.darkOSMCallback);
      this.$animationCanvas.mapObj.updateSize();
    },
    copyLayers() {
      this.$mapLayers.arr.forEach((layer) => {
        if (layer.get("layerVisibilityOn")) {
          const originalSource = layer.getSource();
          const originalUrl = originalSource.getUrl();
          const originalParams = originalSource.getParams();
          let originalProperties = Object.assign({}, layer.getProperties());
          delete originalProperties.map;
          delete originalProperties.source;

          const newSource = new ImageWMS({
            format: "image/png",
            url: originalUrl,
            params: originalParams,
            transition: 0,
            crossOrigin: "Anonymous",
            ratio: 1,
          });
          const newLayer = new OLImage({
            source: newSource,
          });
          newLayer.setProperties(originalProperties);
          newLayer.getSource().on("imageloaderror", (e) => {
            let layer = this.$mapLayers.arr.find(
              (l) => l.get("layerName") === newLayer.get("layerName")
            );
            this.$root.$emit("loadingError", layer, e);
            this.$root.$emit("loadingError", newLayer, e);
          });
          this.copiedLayers.push(newLayer);
          this.$animationCanvas.mapObj.addLayer(newLayer);
        }
      });
    },
    handleCancelExpired() {
      this.cancelExpired = true;
    },
    async mapControls() {
      this.cancelExpired = false;
      const driverDate =
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex];
      let visibleTLayers = this.copiedLayers.filter((l) => {
        return l.get("layerVisibilityOn") && l.get("layerIsTemporal");
      });
      let noChange = true;
      const numVisibleLayers = visibleTLayers.length;
      for (let i = 0; i < numVisibleLayers; i++) {
        let dateArray = visibleTLayers[i].get("layerDateArray");
        const layerDateIndex = this.findLayerIndex(
          driverDate,
          dateArray,
          visibleTLayers[i].get("layerTimeStep")
        );
        visibleTLayers[i].setProperties({
          layerDateIndex: layerDateIndex,
        });
        if (layerDateIndex >= 0) {
          this.setDateTime(visibleTLayers[i], dateArray[layerDateIndex]);
          noChange = false;
          if (
            visibleTLayers[i].get("layerVisibilityOn") &&
            !visibleTLayers[i].get("visible")
          ) {
            visibleTLayers[i].setVisible(true);
          }
        } else if (visibleTLayers[i].get("visible")) {
          visibleTLayers[i].setVisible(false);
        }
      }
      if (noChange) {
        this.$animationCanvas.mapObj.updateSize();
        return;
      }
      await new Promise((resolve) =>
        this.$animationCanvas.mapObj.once("rendercomplete", resolve)
      );
      if (this.cancelExpired) {
        this.$root.$emit("fixTimeExtent");
      }
    },
    resetCounters() {
      this.loaded = 0;
      this.loading = 0;
    },
    async setDateTime(layer, date) {
      layer.getSource().updateParams({
        TIME: this.getProperDateString(date, layer.get("layerDateFormat")),
      });
    },
  },
  computed: {
    ...mapGetters("Layers", [
      "getCrsList",
      "getCurrentAspect",
      "getCurrentCRS",
      "getCurrentResolution",
      "getMapTimeSettings",
      "getPossibleOverlays",
      "getRGB",
      "getShowGraticules",
    ]),
    ...mapState("Layers", ["datetimeRangeSlider", "isAnimationReversed"]),
    dateIndex() {
      return this.getMapTimeSettings.DateIndex;
    },
  },
  watch: {
    dateIndex: {
      deep: true,
      handler(newIndex, oldIndex) {
        let correctIndex;
        if (!this.isAnimationReversed) {
          correctIndex =
            newIndex - oldIndex === 1 ||
            newIndex === this.datetimeRangeSlider[0];
        } else {
          correctIndex =
            oldIndex - newIndex === 1 ||
            newIndex === this.datetimeRangeSlider[1];
        }
        if (newIndex !== null && correctIndex) {
          this.mapControls();
        }
      },
    },
    loaded() {
      if (this.loading === this.loaded) {
        this.$root.$emit("layersRendered");
      }
    },
  },
};
</script>

<style scoped>
#animation-canvas {
  position: absolute;
  top: -100%;
  visibility: hidden;
}
</style>
