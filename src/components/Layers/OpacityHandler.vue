<template>
  <v-menu open-on-hover :close-delay="150" bottom offset-y>
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        x-large
        :color="color"
        v-bind="attrs"
        v-on="on"
        icon
        :disabled="isAnimating"
      >
        <v-icon> mdi-opacity </v-icon>
      </v-btn>
    </template>

    <v-card class="pl-4 pr-4 pt-4" min-width="300">
      <v-row class="d-flex justify-space-between">
        <v-card-title>
          {{ $t("LayerBarOpacity") }}
        </v-card-title>
        <v-card-title>
          {{ Math.ceil(Math.round(item.get("opacity") * 100)) + "%" }}
        </v-card-title>
      </v-row>
      <v-card-text>
        <v-slider
          :value="item.get('opacity')"
          @change="$root.$emit('updatePermalink')"
          @input="item.setOpacity($event)"
          min="0"
          max="1"
          step="0.05"
          :disabled="isAnimating"
        >
        </v-slider>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script>
import { mapState } from "vuex";

export default {
  props: ["item", "color"],
  computed: {
    ...mapState("Layers", ["isAnimating"]),
  },
};
</script>
