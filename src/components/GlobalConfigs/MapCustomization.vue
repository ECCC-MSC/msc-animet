<template>
  <div id="expandableCustomControl" fluid>
    <v-menu
      eager
      bottom
      offset-y
      nudge-bottom="10"
      nudge-right="5"
      content-class="white black--text"
      v-model="toggleMenu"
    >
      <template v-slot:activator="{ on: onMenu }">
        <v-tooltip bottom>
          <template v-slot:activator="{ on: onTooltip }">
            <v-btn
              width="34px"
              height="34px"
              v-on="{ ...onMenu, ...onTooltip }"
              fab
              elevation="4"
              :disabled="isAnimating"
            >
              <v-icon> mdi-earth </v-icon>
            </v-btn>
          </template>
          <span>{{ $t("MapCustomizations") }}</span>
        </v-tooltip>
      </template>
      <v-container @click.stop :class="getCurrentTheme">
        <projection-handler />
        <v-switch
          v-model="graticules"
          :label="$t('ShowGraticules')"
          color="primary"
          hide-details
          class="mt-0 graticules"
        ></v-switch>
        <color-picker />
      </v-container>
    </v-menu>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import ColorPicker from "./ColorPicker.vue";
import ProjectionHandler from "./ProjectionHandler.vue";

export default {
  components: {
    ColorPicker,
    ProjectionHandler,
  },
  mounted() {
    window.addEventListener("keydown", this.closeMenu);
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.closeMenu);
  },
  methods: {
    closeMenu(event) {
      if (event.key === "Escape" && this.menuOpen) {
        this.menuOpen = false;
        this.$store.dispatch("Layers/setMenusOpen", this.menuOpen);
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getShowGraticules"]),
    ...mapState("Layers", ["isAnimating"]),
    getCurrentTheme() {
      return {
        "grey darken-4 white--text": this.$vuetify.theme.dark,
        "white black--text": !this.$vuetify.theme.dark,
      };
    },
    graticules: {
      get() {
        return this.getShowGraticules;
      },
      set(isShown) {
        this.$store.dispatch("Layers/setShowGraticules", isShown);
        this.$root.$emit("updatePermalink");
      },
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
  data() {
    return {
      menuOpen: false,
    };
  },
};
</script>

<style scoped>
.graticules {
  padding-bottom: 9px;
}
#expandableCustomControl {
  max-width: 60px;
  max-height: 400px;
  z-index: 4;
  pointer-events: auto;
}
</style>
