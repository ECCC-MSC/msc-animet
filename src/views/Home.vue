<template>
  <div class="Home">
    <v-main>
      <v-container fluid>
        <map-canvas id="mapComponent" />
      </v-container>
    </v-main>
  </div>
</template>

<script>
import MapCanvas from "../components/Map/MapCanvas.vue";
import { mapGetters } from "vuex";

import localeData from "../locales/importLocaleFiles";

export default {
  name: "Home",
  props: ["layers", "extent", "color", "basemap", "hide"],
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
    if (this.color !== undefined) {
      if (this.color.match(/none/gi)) {
        this.$root.$emit("invisibleBasemap");
      } else {
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
    }
    if (this.hide !== undefined) {
      const componentsToHide = this.hide.split(",");
      if (componentsToHide.includes("all")) {
        const objectsToHide = {
          title: true,
          topMenus: true,
          timeControls: true,
          sidePanel: true,
          zoom: true,
        };
        this.$store.dispatch("Layers/setHidden", objectsToHide);
      } else {
        const objectsToHide = {
          title: componentsToHide.includes("title"),
          topMenus: componentsToHide.includes("top"),
          timeControls: componentsToHide.includes("time"),
          sidePanel: componentsToHide.includes("side"),
          zoom: componentsToHide.includes("zoom"),
        };
        this.$store.dispatch("Layers/setHidden", objectsToHide);
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
      style,
      legendDisplayed
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
      this.$root.$emit("collapseMenu");
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
      if (legendDisplayed !== undefined) {
        layer.legendDisplayed = legendDisplayed;
      }
      this.$root.$emit("permaLinkLayer", layer);
    },
    findKeyInLocaleFiles(key) {
      for (const sourceName in localeData["enLocaleData"]) {
        if (Object.hasOwn(localeData["enLocaleData"][sourceName], key)) {
          return sourceName;
        }
      }
      return null; // Key not found in any file
    },
  },
  computed: {
    ...mapGetters("Layers", ["getGeoMetWmsSources"]),
  },
  components: {
    MapCanvas,
  },
};
</script>
