<template>
  <v-select
    class="proj-select"
    hide-details
    variant="underlined"
    v-model="currentCRS"
    :label="$t('SelectCRS')"
    :items="Object.keys(crsList)"
    :disabled="isAnimating"
    @update:modelValue="changeProjectionHandler($event)"
  >
    <template v-slot:item="{ props, item }">
      <v-list-item v-bind="props">
        <template v-slot:title>
          <v-chip size="small">{{ item.value.split(':')[1] }}</v-chip>
          <span>{{ `${$t(item.value.replace(':', ''))}` }}</span>
        </template>
      </v-list-item>
    </template>
    <template v-slot:selection="{ item }">
      <v-chip size="small">{{ item.value.split(':')[1] }}</v-chip>
      {{ `${$t(item.value.replace(':', ''))}` }}
    </template>
  </v-select>
</template>

<script>
import { applyTransform } from 'ol/extent.js'
import {
  getPointResolution,
  get as getProjection,
  getTransform,
  transform,
} from 'ol/proj.js'
import View from 'ol/View.js'

export default {
  inject: ['store'],
  methods: {
    changeProjectionHandler(newProjCode = null) {
      if (!newProjCode) {
        newProjCode = this.currentCRS
      }
      const currentView = this.$mapCanvas.mapObj.getView()
      const currentProjection = currentView.getProjection()
      const newProjection = getProjection(newProjCode)
      const fromLonLat = getTransform('EPSG:4326', newProjection)
      const worldExtent = this.crsList[newProjCode]
      newProjection.setWorldExtent(worldExtent)
      const extent = applyTransform(worldExtent, fromLonLat, undefined, 8)

      newProjection.setExtent(extent)
      const currentResolution = currentView.getResolution()
      const currentCenter = currentView.getCenter()
      const currentRotation = currentView.getRotation()
      const newCenter = transform(
        currentCenter,
        currentProjection,
        newProjection,
      )
      const currentMPU = currentProjection.getMetersPerUnit()
      const newMPU = newProjection.getMetersPerUnit()
      const currentPointResolution =
        getPointResolution(
          currentProjection,
          1 / currentMPU,
          currentCenter,
          'm',
        ) * currentMPU
      const newPointResolution =
        getPointResolution(newProjection, 1 / newMPU, newCenter, 'm') * newMPU
      const newResolution =
        (currentResolution * currentPointResolution) / newPointResolution
      const newView = new View({
        center: newCenter,
        resolution: newResolution,
        rotation: currentRotation,
        projection: newProjection,
      })
      this.$mapCanvas.mapObj.setView(newView)
    },
  },
  computed: {
    crsList() {
      return this.store.getCrsList
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    currentCRS: {
      get() {
        return this.store.getCurrentCRS
      },
      set(crs) {
        this.store.setCurrentCRS(crs)
      },
    },
  },
}
</script>

<style scoped>
.proj-select {
  width: 300px;
}
</style>
