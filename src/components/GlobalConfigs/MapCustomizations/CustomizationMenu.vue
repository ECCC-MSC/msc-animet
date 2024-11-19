<template>
  <div id="expandableCustomControl" fluid>
    <v-menu eager class="customize-menu" offset="10" v-model="toggleMenu">
      <template v-slot:activator="{ props: onMenu }">
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props: onTooltip }">
            <v-btn
              size="34"
              class="rounded-circle"
              v-bind="{ ...onMenu, ...onTooltip }"
              elevation="4"
              :disabled="isAnimating"
            >
              <v-icon size="24"> mdi-earth </v-icon>
            </v-btn>
          </template>
          <span>{{ $t('MapCustomizations') }}</span>
        </v-tooltip>
      </template>
      <v-container @click.stop :class="getCurrentTheme" class="menu-container">
        <projection-handler />
        <v-switch
          v-model="graticules"
          :label="$t('ShowGraticules')"
          color="primary"
          density="compact"
          hide-details
          class="mt-0 grat"
        ></v-switch>
        <map-previews></map-previews>
      </v-container>
    </v-menu>
  </div>
</template>

<script>
import { useTheme } from 'vuetify'

export default {
  inject: ['store'],
  mounted() {
    window.addEventListener('keydown', this.closeMenu)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.closeMenu)
  },
  methods: {
    closeMenu(event) {
      if (event.key === 'Escape' && this.menuOpen) {
        this.menuOpen = false
        this.store.setMenusOpen(this.menuOpen)
      }
    },
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    getCurrentTheme() {
      const theme = useTheme()
      return theme.global.current.value.dark ? 'bg-grey-darken-4' : 'bg-white'
    },
    graticules: {
      get() {
        return this.store.getShowGraticules
      },
      set(isShown) {
        this.store.setShowGraticules(isShown)
        this.emitter.emit('updatePermalink')
      },
    },
    toggleMenu: {
      get() {
        return this.menuOpen
      },
      set() {
        this.menuOpen = !this.menuOpen
        this.store.setMenusOpen(this.menuOpen)
        if (this.menuOpen) {
          this.emitter.emit('collapseMenu')
        }
      },
    },
  },
  data() {
    return {
      menuOpen: false,
    }
  },
}
</script>

<style>
.customize-menu:not(.v-overlay--active) {
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
}
.customize-menu .v-overlay__content {
  display: flex !important;
  position: absolute;
  left: auto !important;
  right: calc(48px + 0.5em * 2);
  top: calc(34px + 0.5em * 2) !important;
}
@media (max-width: 959px) {
  .customize-menu .v-overlay__content {
    top: calc(34px + 0.5em * 2 + 42px) !important;
  }
}
@media (max-width: 565px) {
  .customize-menu .v-overlay__content {
    right: unset;
  }
}
</style>

<style scoped>
/* opacity glitches out a bit so it has to be very short */
.customize-menu {
  transition:
    opacity 0.1s ease,
    visibility 0.3s ease;
}
.grat {
  padding-left: 6px;
}
.menu-container {
  padding: 12px;
  padding-bottom: 4px;
  border-radius: 4px;
}
#expandableCustomControl {
  max-width: 60px;
  max-height: 400px;
  z-index: 4;
  pointer-events: auto;
}
</style>
