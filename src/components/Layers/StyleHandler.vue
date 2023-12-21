<template>
  <v-menu bottom offset-y>
    <template v-slot:activator="{ on: menu, attrs }">
      <v-tooltip bottom>
        <template v-slot:activator="{ on: tooltip }">
          <v-btn
            x-large
            :color="color"
            v-bind="attrs"
            v-on="{ ...tooltip, ...menu }"
            icon
            :disabled="isAnimating || item.get('layerStyles').length === 0"
            hide-details
            class="style-selector"
          >
            <v-icon> mdi-palette </v-icon>
          </v-btn>
        </template>
        <span>{{ $t("LayerStyle") }}</span>
      </v-tooltip>
    </template>

    <v-list class="style-list">
      <v-list-item
        v-for="(style, styleIndex) in item.get('layerStyles')"
        :key="styleIndex"
        @click="changeStyleHandler(item, style.Name)"
      >
        <v-list-item-title>
          {{ style.Name }}
          <img :src="style.LegendURL" class="d-block" />
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import { mapState } from "vuex";

export default {
  props: ["item", "color"],
  methods: {
    changeStyleHandler(layer, styleName) {
      layer.setProperties({
        layerCurrentStyle: styleName,
      });
      layer.getSource().updateParams({ STYLES: styleName });
      this.$root.$emit("updatePermalink");
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
  },
};
</script>

<style scoped>
.style-list {
  max-height: 300px;
  overflow-y: auto;
}
.style-selector {
  max-width: 600px;
}
</style>
