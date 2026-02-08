<template>
  <div class="quad-view">
    <div class="map-grid">
      <MapContainer
        v-for="i in 4"
        :key="i"
        :mapId="`map_${i}`"
        class="map-cell"
        ref="mapContainers"
      />
    </div>

  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import MapContainer from '@/components/MapContainer.vue'

const mapContainers = ref([])
const isSyncingExtent = ref(false)



onMounted(() => {
  // Wait for map instances to be ready
  setTimeout(() => {
    mapContainers.value.forEach((container, index) => {
      const mapObj = container.mapCanvas.mapObj
      const store = container.store

      // 1. Extent Synchronization
      mapObj.on('moveend', () => {
        if (isSyncingExtent.value) return
        isSyncingExtent.value = true

        const view = mapObj.getView()
        const center = view.getCenter()
        const zoom = view.getZoom()
        const rotation = view.getRotation()

        mapContainers.value.forEach((target, tIndex) => {
          if (index === tIndex || !target) return
          const targetMap = target.mapCanvas.mapObj
          if (targetMap && targetMap.getView) {
            const targetView = targetMap.getView()
            targetView.setCenter(center)
            targetView.setZoom(zoom)
            targetView.setRotation(rotation)
          }
        })
        
        isSyncingExtent.value = false
      })

      // NOTE: Time and Play State synchronization have been removed to allow independent control per panel
    })

  }, 2000) // Small delay to ensure OpenLayers maps are initialized
})

</script>

<style scoped>
.quad-view {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.map-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  width: 100%;
  height: 100%;
}

.map-cell {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(0,0,0,0.1);
  position: relative;
}


</style>
