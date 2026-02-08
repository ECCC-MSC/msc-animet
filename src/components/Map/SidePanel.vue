<template>
  <div :id="panelId" class="side-panel" ref="panelRoot">
    <v-menu
      v-model="toggleMenu"
      :attach="panelRoot"
      class="v-overlay-menu"
      transition="scale-transition"
      no-click-animation
      location="top right"
      offset="10"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          class="panel_button"
          :class="{
            'button-active': !buttonShown,
            'button-hidden': !buttonShown && screenWidth < 960,
          }"
          elevation="8"
          icon
          hide-details
          v-bind="props"
        >
          <transition name="rotate-fade" mode="out-in">
            <v-icon v-if="buttonShown" key="open" class="panel-icon" size="28">
              {{ getIcon() }}
            </v-icon>
            <v-icon v-else key="close" class="panel-icon" size="28">mdi-close</v-icon>
          </transition>
        </v-btn>
      </template>
      <div
        class="glass-panel-container"
        :class="{ 'compact-panel': !!mapId }"
        @click.stop
        @mouseover="store.setConfigPanelHover(true)"
        @mouseleave="store.setConfigPanelHover(false)"
      >
        <v-toolbar flat class="glass-toolbar">
          <v-tabs v-model="tab" color="primary" align-tabs="start" class="modern-tabs">
            <v-tab value="0">
              <v-icon start>mdi-layers-plus</v-icon>
              <span v-if="screenWidth >= 600">{{ $t('LayerTree') }}</span>
            </v-tab>
            <v-tab v-if="$mapLayers.arr.length !== 0" value="1">
              <v-icon start>mdi-layers-edit</v-icon>
              <span v-if="screenWidth >= 600">{{ $t('LayerControlsTitle') }}</span>
            </v-tab>
            <v-tab v-if="$mapLayers.arr.length !== 0" value="2">
              <v-icon start>mdi-movie-open-play</v-icon>
              <span v-if="screenWidth >= 600">{{ $t('MP4CreateTitle') }}</span>
            </v-tab>
          </v-tabs>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="onMenuToggle" class="close-btn">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <div class="panel-content">
          <v-window v-model="tab">
            <v-window-item value="0" eager>
              <layer-tree 
                :id="'layer-tree-' + mapId" 
                :class="{ 'layer-tree-compact': !!mapId }"
              />
            </v-window-item>
            <v-window-item value="1" eager @click="stopLoop">
              <layer-configuration
                :id="'layer-configuration-' + mapId"
                :class="{ 'layer-configuration-compact': !!mapId }"
                v-show="$mapLayers.arr.length !== 0"
              />
            </v-window-item>
            <v-window-item value="2" eager>
              <animation-configuration
                :id="'animation-configuration-' + mapId"
                :class="{ 'animation-configuration-compact': !!mapId }"
                v-show="$mapLayers.arr.length !== 0"
              />
            </v-window-item>
          </v-window>
        </div>
      </div>
    </v-menu>
  </div>
</template>

<script>
export default {
  name: 'SidePanel',
  inject: {
    store: { from: 'store' },
    $mapLayers: { from: 'mapLayers' },
    emitter: { from: 'emitter' },
  },
  props: ['mapId'],

  mounted() {
    this.panelRoot = this.$refs.panelRoot
    this.emitter.on('changeTab', this.onChangeTab)
    this.emitter.on('collapseMenu', this.onCollapseMenu)
    this.emitter.on('openPanel', this.onOpenPanel)
    window.addEventListener('keydown', this.closeMenu)
    window.addEventListener('resize', this.updateScreenSize)
  },
  beforeUnmount() {
    this.emitter.off('changeTab', this.onChangeTab)
    this.emitter.off('collapseMenu', this.onCollapseMenu)
    this.emitter.off('openPanel', this.onOpenPanel)
    window.removeEventListener('keydown', this.closeMenu)
    window.removeEventListener('resize', this.updateScreenSize)
  },
  data() {
    return {
      buttonAnimation: false,
      buttonShown: true,
      color: null,
      menuOpen: false,
      panelRoot: null,
      screenWidth: window.innerWidth,
      tab: '0',
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
        case '1':
          return 'mdi-layers-edit'
        case '2':
          return 'mdi-movie-open-play'
        case '0':
        default:
          return 'mdi-layers-plus'
      }
    },
    onMenuToggle() {
      if (this.buttonAnimation) return
      this.buttonAnimation = true
      this.buttonShown = !this.buttonShown
      if (this.menuOpen) {
        this.menuOpen = false
        this.buttonAnimation = false
      } else {
        setTimeout(() => {
          this.menuOpen = true
          this.buttonAnimation = false
        }, 250)
      }
    },
    onChangeTab() {
      if (this.tab === '0' && this.$mapLayers.arr.length !== 0) this.tab = '1'
    },
    onCollapseMenu(permalinkSetup) {
      if (permalinkSetup) {
        var unwatch = this.$watch(
          'layersLength',
          (_, oldVal) => {
            if (oldVal !== undefined) {
              this.tab = '1'
              unwatch()
            }
          },
          { immediate: true },
        )
      }
      if (!this.buttonShown) {
        this.buttonShown = true
        this.menuOpen = false
      }
    },
    onOpenPanel() {
      if (!this.menuOpen) {
        this.onMenuToggle()
      }
    },
    stopLoop() {
      if (this.isAnimating && this.playState === 'play') {
        this.emitter.emit('toggleAnimation')
      }
    },
    togglePreview(on) {
      let controlElement = document.getElementById(this.rectId)
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
        document.getElementById(this.rectId).style.visibility === 'visible'
      ) {
        this.emitter.emit('checkIntersect')
      }
    },
  },
  computed: {
    panelId() {
      return `side_panel-${this.mapId}`
    },
    rectId() {
      return `animation-rect-${this.mapId}`
    },
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
    preventGFI() {
      return this.menuOpen && this.tab === '0'
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
        this.tab = '0'
      }
    },
    preventGFI(newVal) {
      this.store.setMenusOpen(newVal)
    },
    tab(newTab, oldTab) {
      if (newTab === '2') {
        this.togglePreview(true)
      } else if (oldTab === '2') {
        this.togglePreview(false)
      }
    },
  },
}
</script>

<style>
.v-overlay-menu .v-overlay__content {
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
  margin: 0 !important;
  display: flex;
  justify-content: flex-end;
}
</style>

<style scoped>
.side-panel {
  position: absolute;
  top: 50%;
  right: 0.5em;
  z-index: 4;
  transform: translateY(-50%);
}

.panel_button {
  width: 56px !important;
  height: 56px !important;
  background: rgba(var(--v-theme-primary), 0.9) !important;
  color: white !important;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}

.panel_button:hover {
  transform: scale(1.1);
  background: rgb(var(--v-theme-primary)) !important;
}

.button-active {
  transform: rotate(90deg);
}

.glass-panel-container {
  background: rgba(var(--v-theme-surface), 0.75);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  width: 420px;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 100px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.compact-panel {
  width: 360px;
}

.glass-toolbar {
  background: rgba(255, 255, 255, 0.05) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modern-tabs :deep(.v-tab) {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.panel-content {
  flex-grow: 1;
  overflow-y: auto;
}

.rotate-fade-enter-active,
.rotate-fade-leave-active {
  transition: all 0.3s ease;
}

.rotate-fade-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.rotate-fade-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.close-btn {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.close-btn:hover {
  color: rgb(var(--v-theme-error));
}

@media (max-width: 959px) {
  .side-panel {
    top: auto;
    bottom: 20px;
    right: 20px;
    transform: none;
  }
}
</style>
