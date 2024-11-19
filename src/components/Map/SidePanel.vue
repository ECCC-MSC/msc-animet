<template>
  <div id="side_panel">
    <v-menu
      eager
      v-model="toggleMenu"
      class="v-overlay-menu"
      transition="scale-transition"
      persistent
      no-click-animation
    >
      <template v-slot:activator="{ props }">
        <v-btn
          class="panel_button"
          :class="{
            'button-color': buttonShown,
            'button-translated': !buttonShown,
          }"
          elevation="4"
          icon
          hide-details
          v-bind="props"
        >
          <transition name="fade">
            <v-icon v-if="buttonShown" key="0" class="panel-icon">
              {{ getIcon() }}
            </v-icon>
            <v-icon v-else key="1" class="panel-icon">mdi-close</v-icon>
          </transition>
        </v-btn>
      </template>
      <v-container
        @click.stop
        @mouseover="
          () => {
            store.setConfigPanelHover(true)
          }
        "
        @mouseleave="
          () => {
            this.store.setConfigPanelHover(false)
          }
        "
      >
        <v-toolbar class="toolbar">
          <template v-slot:extension>
            <v-tabs v-model="tab" color="primary" center-active>
              <v-tab>
                <v-icon left>mdi-layers-plus</v-icon>
                <span v-if="tab === 0 && screenWidth >= 500">{{
                  $t('LayerTree')
                }}</span>
              </v-tab>
              <v-tab v-if="$mapLayers.arr.length !== 0">
                <v-icon left>mdi-layers-edit</v-icon>
                <span v-if="tab === 1 && screenWidth >= 500">{{
                  $t('LayerControlsTitle')
                }}</span>
              </v-tab>
              <v-tab v-if="mapTimeSettings.Step !== null">
                <v-icon left>mdi-movie-open-play</v-icon>
                <span v-if="tab === 2 && screenWidth >= 500">{{
                  $t('MP4CreateTitle')
                }}</span>
              </v-tab>
            </v-tabs>
            <v-spacer></v-spacer>
            <v-btn icon @click="onMenuToggle">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
        </v-toolbar>
        <v-tabs-window
          v-model="tab"
          :class="{
            'hide-header':
              isAnimating &&
              !configPanelHover &&
              playState === 'play' &&
              tab === 1,
          }"
        >
          <v-tabs-window-item eager>
            <layer-tree id="layer-tree" />
          </v-tabs-window-item>
          <v-tabs-window-item eager @click="stopLoop">
            <layer-configuration
              id="layer-configuration"
              v-show="$mapLayers.arr.length !== 0"
            />
          </v-tabs-window-item>
          <v-tabs-window-item eager>
            <animation-configuration
              id="animation-configuration"
              v-show="mapTimeSettings.Step !== null"
            />
          </v-tabs-window-item>
        </v-tabs-window>
      </v-container>
    </v-menu>
  </div>
</template>

<script>
export default {
  name: 'SidePanel',
  inject: ['store'],
  mounted() {
    this.emitter.on('openPanel', () => {
      if (!this.menuOpen) {
        this.onMenuToggle()
      }
    })
    this.emitter.on('changeTab', () => {
      if (this.tab === 0 && this.$mapLayers.arr.length !== 0) this.tab = 1
    })
    window.addEventListener('keydown', this.closeMenu)
    window.addEventListener('resize', this.updateScreenSize)
    this.emitter.on('collapseMenu', () => {
      if (!this.buttonShown) {
        var unwatch = this.$watch(
          'layersLength',
          (_, oldVal) => {
            if (oldVal !== undefined) {
              this.tab = 1
              unwatch()
            }
          },
          { immediate: true },
        )
        this.buttonShown = true
        this.menuOpen = false
      }
    })
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.closeMenu)
    window.removeEventListener('resize', this.updateScreenSize)
  },
  data() {
    return {
      buttonShown: false,
      color: null,
      menuOpen: true,
      screenWidth: window.innerWidth,
      tab: null,
    }
  },
  methods: {
    closeMenu(event) {
      if (event.key === 'Escape' && this.menuOpen && !event.defaultPrevented) {
        this.buttonShown = true
        this.menuOpen = false
      }
    },
    getIcon() {
      switch (this.tab) {
        case 1:
          return 'mdi-layers-edit'
        case 2:
          return 'mdi-movie-open-play'
        case 0:
        default:
          return 'mdi-layers-plus'
      }
    },
    onMenuToggle() {
      this.buttonShown = !this.buttonShown
      if (this.menuOpen) {
        this.menuOpen = false
      } else {
        setTimeout(() => {
          this.menuOpen = true
        }, 250)
      }
    },
    stopLoop() {
      if (this.isAnimating && this.playState === 'play') {
        this.emitter.emit('stopAnimation')
      }
    },
    togglePreview(on) {
      let controlElement = document.getElementById('animation-rect')
      if (on) {
        controlElement.style.visibility = 'visible'
        this.emitter.emit('checkIntersect')
      } else {
        controlElement.style.visibility = 'hidden'
      }
    },
    updateScreenSize() {
      this.screenWidth = window.innerWidth
      if (
        document.getElementById('animation-rect').style.visibility === 'visible'
      ) {
        this.emitter.emit('checkIntersect')
      }
    },
  },
  computed: {
    configPanelHover() {
      return this.store.getConfigPanelHover
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    playState() {
      return this.store.getPlayState
    },
    layersLength() {
      return this.$mapLayers.arr.length
    },
    toggleMenu: {
      get() {
        return this.menuOpen
      },
      set() {
        this.onMenuToggle()
      },
    },
  },
  watch: {
    layersLength(newLength) {
      if (newLength === 0) {
        this.tab = 0
      }
    },
    tab(newTab, oldTab) {
      if (newTab === 2) {
        this.togglePreview(true)
      } else if (oldTab === 2) {
        this.togglePreview(false)
      }
    },
  },
}
</script>

<style>
.v-overlay-menu .v-overlay__content {
  position: absolute;
  left: auto !important;
  right: 0.5em;
  top: calc(34px + 0.5em * 2) !important;
  min-width: 350px !important;
  max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px);
  overflow: hidden;
  transform-origin: right top !important;
}
@media (max-width: 1120px) {
  .v-overlay-menu .v-overlay__content {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px + 24px);
  }
}
@media (max-width: 959px) {
  .v-overlay-menu .v-overlay__content {
    top: calc(34px + 42px + 0.5em * 2) !important;
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 42px + 24px);
  }
}
@media (max-width: 565px) {
  .v-overlay-menu .v-overlay__content {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 158px - 42px - 10px);
  }
}
</style>

<style scoped>
/* Pre-defined elements */
.v-container {
  padding: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition:
    color 0.25s,
    opacity 0.45s ease;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.hide-header {
  margin-top: -56px;
  padding-top: 8px;
}
@media (max-width: 959px) {
  .button-translated {
    transform: translateY(calc(-50vh + 92px)) !important;
  }
}
@media (max-width: 960px), (min-width: 959px) {
  .panel_button {
    transition: none;
  }
}
.v-tabs:not(.v-tabs--vertical):not(.v-tabs--right):deep(
    .v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(
        .v-slide-group--has-affixes
      )
  )
  .v-slide-group__prev {
  display: none !important;
}
/* Custom classes */
.button-color {
  background-color: #1689e7 !important;
  color: white;
}
.button-translated {
  transform: translateY(calc(-50vh + 50px));
}
.panel_button {
  width: 48px;
  height: 48px;
  transition:
    background-color 0.35s,
    color 0.25s,
    opacity 0.45s,
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
.toolbar:deep(.v-toolbar__content) {
  height: 0 !important;
  padding: 0;
}
/* Custom ids */
#animation-configuration {
  padding: 4px 10px 6px 10px;
  width: 390px;
  max-width: 390px;
}
#layer-configuration {
  max-width: 390px;
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
