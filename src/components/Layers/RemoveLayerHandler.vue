<template>
  <v-tooltip class="remove-layer-tooltip" bottom>
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        x-large
        :color="color"
        icon
        v-bind="attrs"
        v-on="on"
        @click="removeLayerHandler(item)"
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
    removeLayerHandler(removedLayer) {
      this.$root.$emit("removeLayer", removedLayer);
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
  },
};
</script>
