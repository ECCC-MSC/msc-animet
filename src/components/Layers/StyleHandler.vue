<template>
  <v-menu eager bottom offset-y class="style-selector" v-model="menuVisible">
    <template v-slot:activator="{ on: menu, attrs }">
      <v-tooltip bottom :disabled="menuVisible">
        <template v-slot:activator="{ on: tooltip }">
          <v-btn
            x-large
            :color="color"
            v-bind="attrs"
            v-on="{ ...tooltip, ...menu }"
            icon
            :disabled="isAnimating || item.get('layerStyles').length === 0"
            hide-details
          >
            <v-icon v-if="getActiveLegends.includes(item.get('layerName'))">
              mdi-palette
            </v-icon>
            <v-icon v-else> mdi-palette-outline </v-icon>
          </v-btn>
        </template>
        <span>{{ $t("LayerStyle") }}</span>
      </v-tooltip>
    </template>
    <v-container @click.stop :class="getCurrentTheme" class="pa-2">
      <v-checkbox
        :disabled="isAnimating"
        :input-value="getActiveLegends.includes(item.get('layerName'))"
        hide-details
        class="font-weight-medium display-cb"
        :color="legendStyle(item.get('layerName'))"
        @change="toggleLegends(item.get('layerName'), $event)"
      >
        <template v-slot:label>
          <span :class="getCurrentTheme">{{ $t("DisplayLegend") }}</span>
        </template>
      </v-checkbox>
      <v-list class="style-list">
        <v-list-item-group v-model="selectedItem" color="primary" mandatory>
          <v-list-item
            v-for="(style, styleIndex) in item.get('layerStyles')"
            class="pa-0"
            :key="styleIndex"
            @click="changeStyleHandler(item, style.Name)"
          >
            <v-list-item-icon class="ma-0 selected-icon">
              <v-icon v-if="selectedItem === styleIndex"
                >mdi-check-circle-outline</v-icon
              >
            </v-list-item-icon>
            <v-list-item-title>
              {{ style.Name }}
              <img :src="getImgSrc(style.LegendURL)" class="d-block image" />
            </v-list-item-title>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-container>
  </v-menu>
</template>

<script>
import { mapState, mapGetters } from "vuex";

export default {
  props: ["item", "color"],
  data() {
    return {
      menuVisible: false,
      selectedItem: this.item
        .get("layerStyles")
        .findIndex(
          (style) => style.Name === this.item.get("layerCurrentStyle")
        ),
    };
  },
  methods: {
    changeStyleHandler(layer, styleName) {
      layer.setProperties({
        layerCurrentStyle: styleName,
      });
      layer.getSource().updateParams({ STYLES: styleName });
      this.$root.$emit("updatePermalink");
    },
    getImgSrc(legendUrl) {
      return `${legendUrl}&lang=${this.$i18n.locale}`;
    },
    legendStyle(name) {
      if (this.getColorBorder) {
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
      this.$root.$emit("updatePermalink");
    },
  },
  computed: {
    ...mapGetters("Layers", ["getColorBorder", "getActiveLegends"]),
    ...mapState("Layers", ["isAnimating"]),
    getCurrentTheme() {
      return {
        "grey darken-4 white--text": this.$vuetify.theme.dark,
        "white black--text": !this.$vuetify.theme.dark,
      };
    },
  },
};
</script>

<style scoped>
.display-cb {
  padding: 0;
  padding-bottom: 8px;
  margin: 0;
}
.image {
  border: 1px solid;
  border-color: #212121;
}
.selected-icon {
  align-self: center;
}
.style-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 0;
}
.style-selector {
  max-width: 600px;
}
</style>
