<template>
  <v-tooltip class="remove-layer-tooltip" bottom>
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        x-large
        :color="color"
        icon
        v-bind="attrs"
        v-on="on"
        @click="removeLayerHandler(item.get('layerName'))"
        :disabled="isAnimating"
      >
        <v-icon> mdi-close </v-icon>
      </v-btn>
    </template>
    <span>{{ $t("LayerBarRemoveTooltip") }}</span>
  </v-tooltip>
</template>

<script>
import { mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mixins: [datetimeManipulations],
  props: ["item", "color"],
  methods: {
    removeLayerHandler(removedLayerName) {
      this.$root.$emit("removeLayer", removedLayerName);
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
  },
};
</script>
