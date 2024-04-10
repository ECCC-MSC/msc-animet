<template>
  <div>
    <v-btn
      id="customZoomPlus"
      class="zoom-plus"
      :class="
        getMapTimeSettings.Step !== null
          ? getCollapsedControls
            ? 'zoom-plus-collapsed'
            : 'zoom-plus-open'
          : ''
      "
      elevation="4"
      fab
      x-small
      absolute
      @click="zoomIn"
      :disabled="isAnimating && playState !== 'play'"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>

    <v-btn
      id="customZoomMinus"
      class="zoom-minus"
      :class="
        getMapTimeSettings.Step !== null
          ? getCollapsedControls
            ? 'zoom-minus-collapsed'
            : 'zoom-minus-open'
          : ''
      "
      elevation="4"
      fab
      x-small
      absolute
      @click="zoomOut"
      :disabled="isAnimating && playState !== 'play'"
    >
      <v-icon>mdi-minus</v-icon>
    </v-btn>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  methods: {
    zoomIn() {
      let currentZoom = this.$mapCanvas.mapObj.getView().getZoom();
      if (currentZoom < 20) {
        this.$mapCanvas.mapObj.getView().setZoom(currentZoom + 0.1);
      }
    },
    zoomOut() {
      let currentZoom = this.$mapCanvas.mapObj.getView().getZoom();
      if (currentZoom > 1) {
        this.$mapCanvas.mapObj.getView().setZoom(currentZoom - 0.1);
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getCollapsedControls", "getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating", "playState"]),
  },
};
</script>

<style scoped>
.zoom-plus {
  width: 28px;
  height: 28px;
  position: absolute;
  bottom: 56px;
  right: 8px;
}
.zoom-minus {
  width: 28px;
  height: 28px;
  position: absolute;
  bottom: 24px;
  right: 8px;
}
@media (max-width: 1120px) {
  .zoom-plus-open {
    bottom: 170px;
  }
  .zoom-plus-collapsed {
    bottom: 103px;
  }
  .zoom-minus-open {
    bottom: 138px;
  }
  .zoom-minus-collapsed {
    bottom: 71px;
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
