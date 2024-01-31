<template>
  <div id="side_panel" v-if="!getHidden.sidePanel">
    <v-menu
      eager
      v-model="toggleMenu"
      absolute
      transition="scale-transition"
      origin="top right"
      :close-on-click="false"
    >
      <template v-slot:activator="{ attrs }">
        <transition name="move-transition">
          <v-btn
            class="panel_button rounded-circle"
            :class="{ 'button-color': buttonShown }"
            elevation="4"
            fab
            hide-details
            v-bind="attrs"
            v-show="buttonShown"
            @click="onMenuToggle"
          >
            <transition name="fade">
              <v-icon v-if="buttonShown" key="0" class="panel-icon">
                {{ getIcon() }}
              </v-icon>
              <v-icon v-else key="1" class="panel-icon">mdi-close</v-icon>
            </transition>
          </v-btn>
        </transition>
      </template>
      <v-container @click.stop>
        <v-toolbar class="toolbar">
          <template v-slot:extension>
            <v-tabs v-model="tab" bg-color="deep-purple-darken-4" center-active>
              <v-tab>
                <v-icon left>mdi-layers-plus</v-icon>
                <span v-if="tab === 0 && screenWidth >= 500">{{
                  $t("LayerTree")
                }}</span>
              </v-tab>
              <v-tab v-if="$mapLayers.arr.length !== 0">
                <v-icon left>mdi-layers-edit</v-icon>
                <span v-if="tab === 1 && screenWidth >= 500">{{
                  $t("LayerControlsTitle")
                }}</span>
              </v-tab>
              <v-tab v-if="getMapTimeSettings.Step !== null">
                <v-icon left>mdi-movie-open-play</v-icon>
                <span v-if="tab === 2 && screenWidth >= 500">{{
                  $t("MP4CreateTitle")
                }}</span>
              </v-tab>
            </v-tabs>
            <v-spacer></v-spacer>
            <v-btn icon @click="onMenuToggle">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
        </v-toolbar>
        <v-tabs-items v-model="tab">
          <v-tab-item eager>
            <layer-tree id="layer-tree" />
          </v-tab-item>
          <v-tab-item eager>
            <layer-configuration
              id="layer-configuration"
              v-show="$mapLayers.arr.length !== 0"
            />
          </v-tab-item>
          <v-tab-item eager>
            <animation-configuration
              id="animation-configuration"
              v-show="getMapTimeSettings.Step !== null"
            />
          </v-tab-item>
        </v-tabs-items>
      </v-container>
    </v-menu>
  </div>
</template>

<script>
import AnimationConfiguration from "../Animation/AnimationConfiguration.vue";
import LayerConfiguration from "../Layers/LayerConfiguration.vue";
import LayerTree from "../Layers/LayerTree.vue";

import { mapGetters } from "vuex";

export default {
  name: "SidePanel",
  components: {
    AnimationConfiguration,
    LayerConfiguration,
    LayerTree,
  },
  mounted() {
    this.$root.$on("changeTab", () => {
      if (this.tab === 0 && this.$mapLayers.arr.length !== 0) this.tab = 1;
    });
    window.addEventListener("keydown", this.closeMenu);
    window.addEventListener("resize", this.updateScreenSize);
    this.$root.$on("collapseMenu", () => {
      if (!this.buttonShown) {
        var unwatch = this.$watch(
          "layersLength",
          (_, oldVal) => {
            if (oldVal !== undefined) {
              this.tab = 1;
              unwatch();
            }
          },
          { immediate: true }
        );
        this.buttonShown = true;
        this.menuOpen = false;
      }
    });
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.closeMenu);
    window.removeEventListener("resize", this.updateScreenSize);
  },
  data() {
    return {
      buttonShown: false,
      color: null,
      menuOpen: true,
      screenWidth: window.innerWidth,
      tab: null,
    };
  },
  methods: {
    closeMenu(event) {
      if (event.key === "Escape" && this.menuOpen) {
        this.buttonShown = true;
        this.menuOpen = false;
      }
    },
    getIcon() {
      switch (this.tab) {
        case 1:
          return "mdi-layers-edit";
        case 2:
          return "mdi-movie-open-play";
        case 0:
        default:
          return "mdi-layers-plus";
      }
    },
    onMenuToggle() {
      this.buttonShown = !this.buttonShown;
      if (this.menuOpen) {
        this.menuOpen = false;
      } else {
        setTimeout(() => {
          this.menuOpen = true;
        }, 250);
      }
    },
    togglePreview(on) {
      let controlElement = document.getElementById("animation-rect");
      if (on) {
        controlElement.style.display = "block";
      } else {
        controlElement.style.display = "none";
      }
    },
    updateScreenSize() {
      this.screenWidth = window.innerWidth;
    },
  },
  computed: {
    ...mapGetters("Layers", ["getHidden", "getMapTimeSettings"]),
    layersLength() {
      return this.$mapLayers.arr.length;
    },
    toggleMenu: {
      get() {
        return this.menuOpen;
      },
      set() {
        this.onMenuToggle();
      },
    },
  },
  watch: {
    tab(newTab, oldTab) {
      if (newTab === 2) {
        this.togglePreview(true);
      } else if (oldTab === 2) {
        this.togglePreview(false);
      }
    },
  },
};
</script>

<style scoped>
/* Pre-defined elements */
.container {
  padding: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: color 0.25s, opacity 0.45s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.move-transition-enter,
.move-transition-leave-to {
  transform: translateY(calc(-50vh + 50px)) !important;
}
.move-transition-enter-to,
.move-transition-leave {
  transform: translateY(0) !important;
}
.v-menu__content {
  position: absolute;
  left: auto !important;
  right: 0.5em;
  top: calc(34px + 0.5em * 2) !important;
  min-width: 345px !important;
  max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px);
  overflow: hidden;
}
@media (max-width: 1265px) {
  .v-menu__content {
    top: calc(34px + 42px + 0.5em * 2) !important;
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 42px);
  }
  .move-transition-enter,
  .move-transition-leave-to {
    transform: translateY(calc(-50vh + 92px)) !important;
  }
}
@media (max-width: 1120px) {
  .v-menu__content {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 42px + 24px);
  }
}
@media (max-width: 565px) {
  .v-menu__content {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 158px - 42px - 10px);
  }
}
.v-tabs:not(.v-tabs--vertical):not(.v-tabs--right)
  >>> .v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(
    .v-slide-group--has-affixes
  )
  .v-slide-group__prev {
  display: none !important;
}
/* Custom classes */
.button-color {
  background-color: #1689e7 !important;
  color: white;
}
.panel_button {
  width: 48px;
  height: 48px;
  transition: background-color 0.35s, color 0.25s, opacity 0.45s,
    transform 0.45s;
}
.panel_button:before {
  transition-duration: 0.45s;
}
.panel-icon {
  position: absolute;
}
.toolbar {
  height: 48px !important;
}
.toolbar::v-deep .v-toolbar__content {
  height: 0 !important;
  padding: 0;
}
.toolbar::v-deep .v-toolbar__extension {
  padding: 4px 12px 4px 16px;
}
/* Custom ids */
#animation-configuration {
  padding: 10px 10px 6px 10px;
  width: 390px;
  max-width: 390px;
}
#layer-configuration {
  width: 390px;
}
#layer-tree {
  width: 700px;
}
#side_panel {
  position: absolute;
  top: 50%;
  right: 0.5em;
  z-index: 4;
}
</style>
