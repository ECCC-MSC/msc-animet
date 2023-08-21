<template>
  <div class="Home">
    <v-main>
      <v-container fluid>
        <map-canvas id="mapComponent" />
        <export-animation v-if="MP4ExportFlag" id="MP4exportid" class="my-4" />
      </v-container>
    </v-main>
  </div>
</template>

<script>
import MapCanvas from "../components/Map/MapCanvas.vue";
import { mapGetters } from "vuex";
import ExportAnimation from "../components/Animation/ExportAnimation.vue";

import localeData from "../locales/importLocaleFiles";

export default {
  name: "Home",
  props: ["layers", "extent", "width", "height", "color"],
  async mounted() {
    if (this.layers !== undefined) {
      const layersPassed = this.layers.split(",");
      layersPassed.forEach((layer, index) => {
        this.addLayerEvent(index, ...layer.split(";"));
      });
    }
    if (this.extent !== undefined) {
      let extentPassed = this.extent.split(",");
      let castedExtent = [];
      extentPassed.forEach((element) => {
        castedExtent.push(parseFloat(element));
      });
      this.$root.$emit("goToExtent", castedExtent);
    }
    if (this.width !== undefined && this.height !== undefined) {
      this.$root.$emit("setMapSize", [
        parseInt(this.width),
        parseInt(this.height),
      ]);
    }
    if (this.color !== undefined) {
      let matchColor = /((\d{1,3}),(\d{1,3}),(\d{1,3}))/;
      let match = matchColor.exec(this.color);
      if (match !== null) {
        this.$store.dispatch("Layers/setRGB", [
          Number(match[2]),
          Number(match[3]),
          Number(match[4]),
        ]);
        this.$root.$emit("permalinkColor", true);
      }
    }
  },
  methods: {
    async addLayerEvent(
      index,
      layerName,
      opacity,
      isSnapped,
      isVisible,
      style
    ) {
      var baseURL;
      const sourceContainingLayerName = this.findKeyInLocaleFiles(layerName);
      if (sourceContainingLayerName) {
        const configName = Object.keys(this.getGeoMetWmsSources).find(
          (key) => key.toLowerCase() === sourceContainingLayerName
        );
        baseURL = this.getGeoMetWmsSources[configName]["url"];
      } else {
        return;
      }
      this.$root.$emit("collapseLayerTree");
      let layer = {};
      layer.Name = layerName;
      layer.isLeaf = true;
      layer.zIndex = index;
      layer.wmsSource = baseURL;
      layer.isSnapped = isSnapped !== "0" ? true : false;
      let op = parseFloat(opacity);
      layer.opacity = isNaN(op) || op > 1 || op < 0 ? 0.75 : op;
      layer.visible = isVisible === "0" ? false : true;
      if (style !== "0") {
        layer.currentStyle = style;
      }
      this.$root.$emit("permaLinkLayer", layer);
    },
    findKeyInLocaleFiles(key) {
      for (const sourceName in localeData) {
        if (Object.hasOwn(localeData[sourceName], key)) {
          return sourceName;
        }
      }
      return null; // Key not found in any file
    },
  },
  computed: {
    ...mapGetters("Layers", ["getGeoMetWmsSources", "getMP4URL"]),
    MP4ExportFlag() {
      return this.getMP4URL !== "null";
    },
  },
  components: {
    MapCanvas,
    ExportAnimation,
  },
};
</script>

<style scoped></style>
