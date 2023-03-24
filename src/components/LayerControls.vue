<template>
  <v-expansion-panels :value="0">
    <v-expansion-panel>
      <v-expansion-panel-header>
        {{ $t("LayerControlsTitle") }}
      </v-expansion-panel-header>
      <v-expansion-panel-content>
        <map-time-controls />
        <v-divider class="mr-12"></v-divider>
        <v-list>
          <layer-control-item v-model="layerProperties" />
        </v-list>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import LayerControlItem from "../components/LayerControlItem.vue";
import MapTimeControls from "./MapTimeControls.vue";

export default {
  components: {
    LayerControlItem,
    MapTimeControls,
  },
  mounted() {
    this.$root.$on("addLayer", this.addLayerHandler);
  },
  data() {
    return {
      layerProperties: [],
    };
  },
  methods: {
    async addLayerHandler(layer) {
      if (!this.layerProperties.find((l) => l.Name === layer.Name)) {
        let addedLayer = null;
        if (layer.isTemporal) {
          addedLayer = {
            Name: layer.Name,
            dateTriplet: layer.dateTriplet,
            currentTime: layer.extentDateArray[0],
            Extent: layer.extentDateArray,
            layerIndexOOB: false,
            Opacity: layer.Opacity,
            Visible: layer.Visible,
            VisibilityMapTime: "",
            VisibilityLayerTime: "",
            ZIndex: Object.hasOwn(layer, "ZIndex") ? layer.ZIndex : null,
            isTemporal: layer.isTemporal,
            Style: layer.Style,
          };
        } else {
          addedLayer = {
            Name: layer.Name,
            layerIndexOOB: false,
            Opacity: layer.Opacity,
            Visible: layer.Visible,
            ZIndex: Object.hasOwn(layer, "ZIndex") ? layer.ZIndex : null,
            isTemporal: layer.isTemporal,
            Style: layer.Style,
          };
        }
        if (addedLayer.ZIndex === null) {
          addedLayer.ZIndex = 10;
          this.layerProperties.unshift(addedLayer);
        } else if (
          addedLayer.ZIndex === 0 ||
          this.layerProperties.length === 0 ||
          addedLayer.ZIndex <
            this.layerProperties[this.layerProperties.length - 1].ZIndex
        ) {
          this.layerProperties.push(addedLayer);
        } else {
          for (let i = 0; i < this.layerProperties.length; i++) {
            if (addedLayer.ZIndex > this.layerProperties[i].ZIndex) {
              this.layerProperties.splice(i, 0, addedLayer);
              break;
            }
          }
        }
        this.$root.$emit("layerAdded", layer);
      }
    },
  },
  watch: {
    layerProperties(newLayerProperties) {
      this.$store.dispatch(
        "Layers/setOrderedLayers",
        newLayerProperties.map((l) => l.Name)
      );
    },
  },
};
</script>
