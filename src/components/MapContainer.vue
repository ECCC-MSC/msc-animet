<template>
  <div class="map-container">
    <MapCanvas :mapId="mapId" />
  </div>
</template>

<script setup>
import { provide, reactive, shallowReactive, onBeforeUnmount } from 'vue'
import mitt from 'mitt'
import { createStore } from '@/stores/store'
import MapCanvas from '@/components/Map/MapCanvas.vue'

const props = defineProps({
  mapId: {
    type: String,
    required: true,
  },
})

// Create a unique store for this map instance
const useMapStore = createStore(props.mapId)
const store = useMapStore()

// Provide the store to children
provide('store', store)

// Create a local emitter for this map instance
const emitter = mitt()
provide('emitter', emitter)

// Create and provide map-specific state
const mapLayers = reactive({ arr: [] })
const mapCanvas = shallowReactive({ mapObj: {} })
const animationCanvas = shallowReactive({ mapObj: {} })

provide('mapLayers', mapLayers)
provide('mapCanvas', mapCanvas)
provide('animationCanvas', animationCanvas)

// Expose the store so the parent can access it for synchronization
defineExpose({
  store,
  mapCanvas,
})

// Clean up the store when the component is destroyed
onBeforeUnmount(() => {
  store.$dispose()
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
