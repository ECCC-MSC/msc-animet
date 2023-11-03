<template>
  <v-tooltip bottom v-if="item.get('layerIsTemporal')" v-model="showTooltip">
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        x-large
        v-bind="attrs"
        v-on="on"
        icon
        :color="color"
        :disabled="isAnimating"
        @click="snapLayerToAnimation(item)"
        @touchstart="showTooltip = true"
        @touchend="showTooltip = false"
      >
        <v-icon>
          {{ color !== "" ? "mdi-clock-check" : "mdi-clock" }}
        </v-icon>
      </v-btn>
    </template>
    <v-container class="primary darken-2 rounded pl-4 pr-4" v-if="color !== ''">
      <v-row>
        {{ $t("SnappedLayer") }}
      </v-row>
    </v-container>
    <v-container v-else>
      <v-row>
        {{ $t("SnapLayerToExtent") }}
      </v-row>
    </v-container>
    <v-container>
      <v-row
        v-if="
          !(item.get('layerDateIndex') < 0) && item.get('layerVisibilityOn')
        "
      >
        {{ $t("LayerBarCurrentTooltip") }} :
        {{
          localeDateFormat(
            item.get("layerDateArray")[item.get("layerDateIndex")],
            item.get("layerTimeStep")
          )
        }}
      </v-row>
      <v-row>
        {{ $t("LayerBarStartsTooltip") }} :
        {{
          localeDateFormat(
            item.get("layerStartTime"),
            item.get("layerTimeStep")
          )
        }}
      </v-row>
      <v-row>
        {{ $t("LayerBarEndsTooltip") }} :
        {{
          localeDateFormat(item.get("layerEndTime"), item.get("layerTimeStep"))
        }}
      </v-row>
      <v-row>
        {{ $t("LayerBarStepTooltip") }} :
        {{ item.get("layerTrueTimeStep") }}
      </v-row>
    </v-container>
  </v-tooltip>
  <v-tooltip bottom v-else>
    <template v-slot:activator="{ on, attrs }">
      <v-btn x-large v-bind="attrs" v-on="on" icon color="rgb(235,235,228)">
        <v-icon>
          {{ "mdi-clock-remove" }}
        </v-icon>
      </v-btn>
    </template>
    {{ $t("NoTimeTooltip") }}
  </v-tooltip>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mixins: [datetimeManipulations],
  props: ["item", "color"],
  data() {
    return {
      showTooltip: false,
    };
  },
  methods: {
    snapLayerToAnimation(layer) {
      if (layer.get("layerName") !== this.getMapTimeSettings.SnappedLayer) {
        if (this.getMapTimeSettings.Step === layer.get("layerTimeStep")) {
          this.$store.dispatch(
            "Layers/setMapSnappedLayer",
            layer.get("layerName")
          );
        } else {
          this.changeMapTime(layer.get("layerTimeStep"), layer);
        }
      }
      this.$root.$emit("updatePermalink");
    },
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating"]),
  },
};
</script>
