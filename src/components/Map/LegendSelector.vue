<template>
  <v-menu
    top
    offset-y
    nudge-bottom="0"
    nudge-left="5"
    content-class="white black--text"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        elevation="4"
        rounded
        color="primary"
        dark
        v-bind="attrs"
        v-on="on"
        :disabled="getItemsList.length === 0 || isAnimating"
      >
        <v-icon> mdi-palette-outline </v-icon>
        {{ $t("Legends") }}
      </v-btn>
    </template>
    <v-container @click.stop>
      {{ $t("LegendSelector") }}
      <v-switch
        hide-details
        class="mt-0 pt-0"
        :label="$t('ColorBorder')"
        v-model="colorBorder"
      ></v-switch>
      <v-checkbox
        v-for="(name, index) in getItemsList"
        :key="index"
        :disabled="isAnimating"
        :input-value="getActiveLegends.includes(name)"
        hide-details
        class="pl-12 font-weight-medium"
        :color="legendStyle(name)"
        @change="toggleLegends(name, $event)"
      >
        <template v-slot:label>
          <span class="black--text">{{ $t(name) }}</span>
        </template>
      </v-checkbox>
    </v-container>
  </v-menu>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  mounted() {},
  data() {
    return {
      selection: null,
    };
  },
  computed: {
    ...mapGetters("Layers", ["getColorBorder", "getActiveLegends"]),
    ...mapState("Layers", ["isAnimating"]),
    getItemsList() {
      return this.$mapLayers.arr
        .slice()
        .filter((l) => l.get("layerStyles").length !== 0)
        .map((l) => l.get("layerName"));
    },
    colorBorder: {
      get() {
        return this.getColorBorder;
      },
      set(state) {
        this.$store.dispatch("Layers/setColorBorder", state);
      },
    },
  },
  methods: {
    legendStyle(name) {
      if (this.colorBorder) {
        const legendRGB = this.$mapLayers.arr
          .find((l) => l.get("layerName") === name)
          .get("legendColor");
        return `rgb(${legendRGB.r}, ${legendRGB.g}, ${legendRGB.b})`;
      }
      return undefined;
    },
    toggleLegends(name, on) {
      if (on) {
        this.$store.dispatch("Layers/addActiveLegend", name);
      } else {
        this.$store.dispatch("Layers/removeActiveLegend", name);
      }
    },
  },
};
</script>

<style>
.legend-selector .v-select__selections {
  flex-flow: nowrap;
  flex-wrap: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
</style>
