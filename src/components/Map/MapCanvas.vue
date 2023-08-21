<template>
  <div>
    <div class="map-container">
      <div ref="map" class="map" id="map" :disabled="isAnimating">
        <map-controls :map="map"></map-controls>
        <div fluid class="ma-2" id="legendMapSelector">
          <legend-selector />
        </div>
        <div id="legendMapOverlay">
          <legend-controls
            v-for="name in getActiveLegends"
            :key="name"
            :name="name"
          />
        </div>
        <v-progress-linear :active="loading" indeterminate id="progressBar" />
      </div>
    </div>
    <time-controls :map="map" />
    <layer-tree id="geoMetTree" class="my-4" />
    <layer-configuration v-show="$mapLayers.arr.length !== 0" class="my-4" />
    <animation-configuration
      id="createMP4Controls"
      v-show="getMapTimeSettings.Step !== null"
      class="my-4"
    />
    <create-animation :map="map" />
  </div>
</template>

<script>
import { Attribution, Control, ScaleLine } from "ol/control";
import OLImage from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import Map from "ol/Map";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import ImageWMS from "ol/source/ImageWMS";
import OSM from "ol/source/OSM";
import View from "ol/View";

import { mapGetters, mapState } from "vuex";

import AnimationConfiguration from "../Animation/AnimationConfiguration.vue";
import CreateAnimation from "../Animation/CreateAnimation.vue";
import LayerConfiguration from "../Layers/LayerConfiguration.vue";
import LayerTree from "../Layers/LayerTree.vue";
import LegendControls from "./LegendControls.vue";
import LegendSelector from "./LegendSelector.vue";
import MapControls from "./MapControls.vue";
import TimeControls from "../Time/TimeControls.vue";

export default {
  components: {
    AnimationConfiguration,
    CreateAnimation,
    LayerConfiguration,
    LayerTree,
    LegendControls,
    LegendSelector,
    MapControls,
    TimeControls,
  },
  mounted() {
    this.$root.$on("goToExtent", this.goToExtentHandler);
    this.$root.$on("buildLayer", this.buildLayer);
    this.$root.$on("loadingStop", () => {
      this.loading = false;
    });
    this.$root.$on("overlayToggle", this.manageOverlay);
    this.$root.$on("removeLayer", this.removeLayerHandler);
    this.$root.$on("setMapSize", (wh) => {
      document.getElementById("map").style.width = `${wh[0]}px`;
      document.getElementById("map").style.height = `${wh[1]}px`;
      this.map.updateSize();
    });

    const scaleControl = new ScaleLine({
      units: "metric",
    });

    this.map = new Map({
      target: this.$refs["map"],
      layers: [this.osm],
      view: new View({
        center: fromLonLat([-90, 55]),
        zoom: 4,
        maxZoom: 12,
      }),
      pixelRatio: 1,
      controls: [scaleControl],
    });

    let attribution = new Attribution();
    let zoomPlus = new Control({
      element: document.getElementById("customZoomPlus"),
    });
    let zoomMinus = new Control({
      element: document.getElementById("customZoomMinus"),
    });
    let expandableCustomControl = new Control({
      element: document.getElementById("expandableCustomControl"),
    });
    let progressBar = new Control({
      element: document.getElementById("progressBar"),
    });
    let legendMapOverlay = new Control({
      element: document.getElementById("legendMapOverlay"),
    });
    let legendMapSelector = new Control({
      element: document.getElementById("legendMapSelector"),
    });

    this.map.addControl(attribution);
    this.map.addControl(zoomPlus);
    this.map.addControl(zoomMinus);
    this.map.addControl(expandableCustomControl);
    this.map.addControl(progressBar);
    this.map.addControl(legendMapOverlay);
    this.map.addControl(legendMapSelector);

    this.map.on("moveend", () => {
      this.resizeRefreshExpired();
    });

    new ResizeObserver(() => {
      this.map.updateSize();
    }).observe(this.$refs.map);
  },
  methods: {
    async resizeRefreshExpired() {
      await new Promise((resolve) => this.map.once("rendercomplete", resolve));
      this.$root.$emit("checkLoadingErrors");
    },
    goToExtentHandler(locExtent) {
      this.map.getView().fit(locExtent);
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
        this.map
          .getLayers()
          .getArray()
          .find((l) => l.get("layerName") === removedLayer.get("layerName")) !==
        undefined
      ) {
        layerFound = true;
        this.map.removeLayer(removedLayer);
      }

      this.$mapLayers.arr.splice(removedLayer.get("zIndex"), 1);
      this.$mapLayers.arr.forEach((elem) =>
        elem.setZIndex(
          this.$mapLayers.arr.findIndex(
            (l) => l.get("layerName") === elem.get("layerName")
          )
        )
      );
      if (this.loading) {
        this.loading = false;
      }
      if (removedLayer.get("layerIsTemporal") && layerFound) {
        this.$root.$emit("timeLayerRemoved", removedLayer);
      }
      this.$root.$emit("layerRemoved", removedLayer.get("layerName"));
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
      const layerFound = this.map
        .getLayers()
        .getArray()
        .filter((l) => l.get("layerName") === layerName);
      if (layerFound.length !== 0) {
        this.map.removeLayer(layerFound[0]);
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
          this.loading = true;
        });

        special_layer.getSource().on("imageloadend", () => {
          this.loading = false;
        });
        this.map.addLayer(special_layer);
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
        this.loading = true;
      });

      imageLayer.getSource().on("imageloadend", () => {
        this.loading = false;
      });

      imageLayer.getSource().on("imageloaderror", (e) => {
        this.$root.$emit("loadingError", imageLayer, e);
      });

      imageLayer.getSource().updateParams({
        STYLES: imageLayer.get("layerCurrentStyle"),
      });

      if (this.getActiveLegends.length === 0) {
        this.$store.dispatch(
          "Layers/addActiveLegend",
          imageLayer.get("layerName")
        );
      }
      if (imageLayer.get("layerIsTemporal")) {
        this.$root.$emit("addTemporalLayer", imageLayer, layerData);
      } else {
        this.map.addLayer(imageLayer);
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
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
    ...mapGetters("Layers", ["getActiveLegends", "getMapTimeSettings"]),
    mapHeight() {
      return this.map.getSize()[1];
    },
    mapWidth() {
      return this.map.getSize()[0];
    },
  },
  data() {
    return {
      golden_ratio_conjugate: (1 + Math.sqrt(5)) / 2 - 1,
      h: Math.random(),
      s: 0.95,
      v: 0.75,
      loading: false,
      osm: new TileLayer({ source: new OSM() }),
      map: null,
    };
  },
};
</script>

<style scoped>
.map-container {
  overflow-y: hidden;
  overflow-x: auto;
  padding-right: 12px;
  width: 101%;
}
.map {
  width: 100%;
  min-width: 600px;
  max-width: 4096px;
  height: 600px;
  min-height: 500px;
  max-height: 2160px;
  resize: both;
  overflow: auto;
  z-index: 0;
  position: relative;
}

#progressBar {
  position: absolute;
  bottom: 0;
}

#legendMapSelector {
  position: absolute;
  bottom: 24px;
  right: 0;
}
</style>
