<template>
  <div fluid id="legendMapSelector">
    <v-menu
      bottom
      offset-y
      nudge-bottom="10"
      nudge-right="5"
      v-model="toggleMenu"
      class="selector-menu"
    >
      <template v-slot:activator="{ on: onMenu }">
        <v-tooltip bottom>
          <template v-slot:activator="{ on: onTooltip }">
            <v-btn
              min-width="34px"
              width="34px"
              height="34px"
              class="rounded-circle"
              elevation="4"
              v-on="{ ...onMenu, ...onTooltip }"
              :disabled="getItemsList.length === 0 || isAnimating"
            >
              <v-icon> mdi-map-legend </v-icon>
            </v-btn>
          </template>
          <span>{{ $t("Legends") }}</span>
        </v-tooltip>
      </template>

      <v-container @click.stop :class="getCurrentTheme">
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
            <span :class="getCurrentTheme">{{ $t(name) }}</span>
          </template>
        </v-checkbox>
      </v-container>
    </v-menu>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  mounted() {
    window.addEventListener("keydown", this.closeMenu);
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.closeMenu);
  },
  data() {
    return {
      menuOpen: false,
      selection: null,
    };
  },
  computed: {
    ...mapGetters("Layers", ["getColorBorder", "getActiveLegends"]),
    ...mapState("Layers", ["isAnimating"]),
    colorBorder: {
      get() {
        return this.getColorBorder;
      },
      set(state) {
        this.$store.dispatch("Layers/setColorBorder", state);
      },
    },
    getCurrentTheme() {
      return {
        "grey darken-4 white--text": this.$vuetify.theme.dark,
        "white black--text": !this.$vuetify.theme.dark,
      };
    },
    getItemsList() {
      return this.$mapLayers.arr
        .slice()
        .filter((l) => l.get("layerStyles").length !== 0)
        .map((l) => l.get("layerName"))
        .reverse();
    },
    toggleMenu: {
      get() {
        return this.menuOpen;
      },
      set() {
        this.menuOpen = !this.menuOpen;
        this.$store.dispatch("Layers/setMenusOpen", this.menuOpen);
        if (this.menuOpen) {
          this.$root.$emit("collapseMenu");
        }
      },
    },
  },
  methods: {
    closeMenu(event) {
      if (event.key === "Escape" && this.menuOpen) {
        this.menuOpen = false;
        this.$store.dispatch("Layers/setMenusOpen", this.menuOpen);
      }
    },
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
      this.$root.$emit("updatePermalink");
    },
  },
};
</script>

<style scoped>
.selector-menu {
  min-width: 400px;
  max-width: 600px;
}

@media (max-width: 400px) {
  .selector-menu {
    min-width: 0;
  }
}

#legendMapSelector {
  pointer-events: auto;
  z-index: 4;
}
</style>
