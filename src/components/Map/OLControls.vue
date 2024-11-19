<template>
  <div>
    <v-btn
      id="zoomPlus"
      class="zoom-plus rounded-circle"
      :class="
        mapTimeSettings.Step !== null
          ? collapsedControls
            ? 'zoom-plus-collapsed'
            : 'zoom-plus-open'
          : ''
      "
      elevation="4"
      size="28"
      absolute
      @click="zoomIn"
      :disabled="isAnimating && playState !== 'play'"
    >
      <v-icon size="18">mdi-plus</v-icon>
    </v-btn>

    <v-btn
      id="zoomMinus"
      class="zoom-minus rounded-circle"
      :class="
        mapTimeSettings.Step !== null
          ? collapsedControls
            ? 'zoom-minus-collapsed'
            : 'zoom-minus-open'
          : ''
      "
      elevation="4"
      icon="mdi-minus"
      size="28"
      absolute
      @click="zoomOut"
      :disabled="isAnimating && playState !== 'play'"
    >
      <v-icon size="18">mdi-minus</v-icon>
    </v-btn>
  </div>
</template>

<script>
export default {
  inject: ['store'],
  methods: {
    zoomIn() {
      let currentZoom = this.$mapCanvas.mapObj.getView().getZoom()
      if (currentZoom < 20) {
        this.$mapCanvas.mapObj.getView().setZoom(currentZoom + 0.1)
      }
    },
    zoomOut() {
      let currentZoom = this.$mapCanvas.mapObj.getView().getZoom()
      if (currentZoom > 1) {
        this.$mapCanvas.mapObj.getView().setZoom(currentZoom - 0.1)
      }
    },
  },
  computed: {
    collapsedControls() {
      return this.store.getCollapsedControls
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
  },
}
</script>

<style scoped>
.zoom-plus {
  position: absolute;
  bottom: 56px;
  right: 8px;
}
.zoom-minus {
  position: absolute;
  bottom: 24px;
  right: 8px;
}
@media (max-width: 1120px) {
  .zoom-plus-open {
    bottom: 170px;
  }
  .zoom-minus-open {
    bottom: 138px;
  }
}
@media (max-width: 565px) {
  .zoom-plus-open {
    bottom: 224px;
  }
  .zoom-plus-collapsed {
    bottom: 103px;
  }
  .zoom-minus-open {
    bottom: 192px;
  }
  .zoom-minus-collapsed {
    bottom: 71px;
  }
}
</style>
