<template>
  <v-select
    class="proj-select"
    hide-details
    v-model="currentCRS"
    :label="$t('SelectCRS')"
    :items="Object.keys(getCrsList)"
    :disabled="isAnimating"
    @change="changeProjectionHandler($event)"
  >
  </v-select>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import { applyTransform } from "ol/extent.js";
import {
  getPointResolution,
  get as getProjection,
  getTransform,
  transform,
} from "ol/proj.js";
import View from "ol/View.js";

export default {
  methods: {
    changeProjectionHandler(newProjCode = null) {
      if (!newProjCode) {
        newProjCode = this.getCurrentCRS;
      }
      const currentView = this.$mapCanvas.mapObj.getView();
      const currentProjection = currentView.getProjection();
      const newProjection = getProjection(newProjCode);
      const fromLonLat = getTransform("EPSG:4326", newProjection);
      const worldExtent = this.getCrsList[newProjCode];
      newProjection.setWorldExtent(worldExtent);
      const extent = applyTransform(worldExtent, fromLonLat, undefined, 8);

      newProjection.setExtent(extent);
      const currentResolution = currentView.getResolution();
      const currentCenter = currentView.getCenter();
      const currentRotation = currentView.getRotation();
      const newCenter = transform(
        currentCenter,
        currentProjection,
        newProjection
      );
      const currentMPU = currentProjection.getMetersPerUnit();
      const newMPU = newProjection.getMetersPerUnit();
      const currentPointResolution =
        getPointResolution(
          currentProjection,
          1 / currentMPU,
          currentCenter,
          "m"
        ) * currentMPU;
      const newPointResolution =
        getPointResolution(newProjection, 1 / newMPU, newCenter, "m") * newMPU;
      const newResolution =
        (currentResolution * currentPointResolution) / newPointResolution;
      const newView = new View({
        center: newCenter,
        resolution: newResolution,
        rotation: currentRotation,
        projection: newProjection,
      });
      this.$mapCanvas.mapObj.setView(newView);
    },
  },
  computed: {
    ...mapGetters("Layers", ["getCrsList", "getCurrentCRS"]),
    ...mapState("Layers", ["isAnimating"]),
    currentCRS: {
      get() {
        return this.getCurrentCRS;
      },
      set(crs) {
        this.$store.dispatch("Layers/setCurrentCRS", crs);
      },
    },
  },
};
</script>

<style scoped>
.proj-select {
  width: 300px;
  padding-bottom: 6px;
}
</style>
