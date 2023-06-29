<template>
  <v-tooltip class="visibility-tooltip" bottom>
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        :color="colorScheme(item)"
        icon
        x-large
        v-bind="attrs"
        v-on="on"
        @click="setVisibleHandler(item)"
        :disabled="isAnimating"
      >
        <v-icon>
          {{ selectIcon(item) }}
        </v-icon>
      </v-btn>
    </template>
    <span>
      {{ $t("LayerBarVisibilityTooltip") }}
    </span>
    <v-container
      v-if="item.get('layerDateIndex') < 0 && item.get('layerVisibilityOn')"
      class="red darken-2 rounded pl-4 pr-4"
    >
      <v-row>
        {{ $t("LayerBarInvisibleTooltip") }}
      </v-row>
      <v-row>
        {{ $t("LayerBarMapTime") }}
        {{
          localeDateFormat(
            getMapTimeSettings.Extent[getMapTimeSettings.DateIndex],
            getMapTimeSettings.Step
          )
        }}
      </v-row>
      <v-row>
        {{ $t("LayerBarClosestTime") }}
        {{
          localeDateFormat(
            item.get("layerDateIndex") === -1
              ? item.get("layerStartTime")
              : item.get("layerEndTime"),
            item.get("layerTimeStep")
          )
        }}
      </v-row>
    </v-container>
  </v-tooltip>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mixins: [datetimeManipulations],
  props: ["item", "color"],
  methods: {
    colorScheme(layer) {
      if (layer.get("layerDateIndex") < 0 && layer.get("layerVisibilityOn")) {
        return "error";
      } else {
        return this.color;
      }
    },
    OOBHandler(imageLayer) {
      let layerDateIndex = this.findLayerIndex(
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
        imageLayer.get("layerDateArray"),
        imageLayer.get("layerTimeStep")
      );
      imageLayer.setProperties({
        layerDateIndex: layerDateIndex,
      });
      if (!(layerDateIndex < 0)) {
        imageLayer.setVisible(true);
      }
    },
    selectIcon(layer) {
      if (!layer.get("layerVisibilityOn")) {
        return "mdi-eye-off";
      } else if (!(layer.get("layerDateIndex") < 0)) {
        return "mdi-eye";
      } else {
        return "mdi-eye-remove";
      }
    },
    setVisibleHandler(layer) {
      layer.setProperties({
        layerVisibilityOn: !layer.get("layerVisibilityOn"),
      });
      if (!layer.get("layerIsTemporal")) {
        layer.setVisible(!layer.get("visible"));
      } else {
        if (layer.get("visible")) {
          layer.setVisible(false);
        } else {
          this.OOBHandler(layer);
        }
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating"]),
  },
};
</script>
