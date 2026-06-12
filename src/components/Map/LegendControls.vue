<template>
  <DraggableResizable
    v-if="activeLegends.length !== 0"
    :initialPosition="initialPosStyle()"
    :preventDefault="true"
    resizeDirection="horizontal"
    @checkIntersect="checkIntersect"
    @updatePermalink="emitter.emit('updatePermalink')"
    @dblclick="emitter.emit('openPanel')"
    @click="emit('legend-click', name)"
  >
    <div class="image-container">
      <img
        class="white"
        :class="getLegendHidden"
        :id="name"
        :name="name"
        :src="getMapLegendURL"
        :style="{ border: getStyle }"
        :title="name"
        crossorigin="anonymous"
        @load="checkResize"
      />
      <button
        class="close-button mdi mdi-close"
        @pointerup="emit('legend-remove', name)"
      ></button>
    </div>
  </DraggableResizable>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'

import { getLegendScaleFactor } from '@/utils/legendScale'

const { proxy } = getCurrentInstance()

const props = defineProps(['name'])
const emit = defineEmits(['legend-click', 'legend-remove'])

const store = inject('store')
const { locale } = useI18n()

const activeLegends = computed(() => store.getActiveLegends)
const colorBorder = computed(() => store.getColorBorder)
const legendIndex = computed(() => store.getLegendIndex)

const checkResize = (event) => {
  const img = event.target
  const naturalRatio = img.naturalWidth / img.naturalHeight

  const vw = window.innerWidth
  const vh = window.innerHeight
  const topSafeZone = vw < 960 ? 84 : 40

  const scaleFactor = getLegendScaleFactor(naturalRatio)

  const maxWidth = vw * 0.9
  const maxHeight = vh * 0.85

  const layer = proxy.$mapLayers.arr.find(
    (l) => l.get('layerName') === img.getAttribute('name'),
  )
  const savedPos = layer?.get('legendPosition')
  const container = img.closest('.draggable-container')
  if (!container) return

  if (savedPos && savedPos.w > 0) {
    const targetWidth = (savedPos.w / 100) * img.naturalWidth * scaleFactor

    const excessRatio = Math.max(
      targetWidth / maxWidth,
      targetWidth / naturalRatio / maxHeight,
    )
    const finalWidth = excessRatio > 1 ? targetWidth / excessRatio : targetWidth
    container.style.width = `${finalWidth}px`

    const finalHeight = container.offsetHeight

    const left = Math.max(
      0,
      Math.min(vw - finalWidth, (savedPos.cx / 100) * vw - finalWidth / 2),
    )
    const top = Math.max(
      topSafeZone,
      Math.min(vh - finalHeight, (savedPos.cy / 100) * vh - finalHeight / 2),
    )
    container.style.left = `${left}px`
    container.style.top = `${top}px`
    return
  }

  const scaledWidth = img.naturalWidth * scaleFactor
  const scaledHeight = img.naturalHeight * scaleFactor

  const excessRatio = Math.max(scaledWidth / maxWidth, scaledHeight / maxHeight)
  container.style.width =
    excessRatio > 1 ? `${scaledWidth / excessRatio}px` : `${scaledWidth}px`
}

const getLegendHidden = computed(() => {
  const getVisible = proxy.$mapLayers.arr
    .find((l) => l.get('layerName') === props.name)
    .get('layerVisibilityOn')
  return {
    'legend-hidden': !getVisible,
  }
})

const getMapLegendURL = computed(() => {
  if (props.name === null) {
    return null
  }
  let layer = proxy.$mapLayers.arr.find(
    (l) => l.get('layerName') === props.name,
  )
  if (layer.get('layerStyles').length === 0) {
    return null
  }

  const legendUrl = layer
    .get('layerStyles')
    .find((style) => style.Name === layer.get('layerCurrentStyle')).LegendURL
  if (legendUrl.includes('GetLegendGraphic'))
    return `${legendUrl}&lang=${locale.value}`
  return legendUrl
})

const getStyle = computed(() => {
  if (colorBorder.value) {
    return `2px solid ${getLegendStyle()}`
  }
  return 'none'
})

const getLegendStyle = () => {
  const legendRGB = proxy.$mapLayers.arr
    .find((l) => l.get('layerName') === props.name)
    .get('legendColor')
  return `rgb(${legendRGB.r}, ${legendRGB.g}, ${legendRGB.b})`
}

const initialPosStyle = () => {
  const offset = legendIndex.value.getItemInteger(props.name) * 10

  const layer = proxy.$mapLayers.arr.find(
    (l) => l.get('layerName') === props.name,
  )
  const savedPos = layer?.get('legendPosition')

  if (savedPos && savedPos.w > 5) {
    return {
      top: '0px',
      left: '0px',
    }
  }

  const initialX = 8
  const initialY = window.innerWidth < 960 ? 100 : 50
  return {
    top: `${initialY + offset}px`,
    left: `${initialX + offset}px`,
  }
}

const checkIntersect = () => {
  let layer = proxy.$mapLayers.arr.find(
    (l) => l.get('layerName') === props.name,
  )
  if (!layer.get('layerVisibilityOn')) {
    store.setIntersect([props.name, false])
    return
  }

  const previewDims = document
    .getElementById('animation-rect')
    .getBoundingClientRect()
  const imgDims = document.getElementById(props.name).getBoundingClientRect()
  if (
    imgDims.top < previewDims.top ||
    imgDims.bottom > previewDims.bottom ||
    imgDims.left < previewDims.left ||
    imgDims.right > previewDims.right
  ) {
    store.setIntersect([props.name, true])
  } else {
    store.setIntersect([props.name, false])
  }
}

onMounted(() => {
  proxy.emitter.on('checkIntersect', checkIntersect)
})

onBeforeUnmount(() => {
  store.removeIntersect(props.name)
  proxy.emitter.off('checkIntersect', checkIntersect)
})
</script>

<style scoped>
.legend-hidden {
  display: none;
}
.resizable img {
  width: 100%;
  height: auto;
  object-fit: contain;
  vertical-align: middle;
}
@media (pointer: coarse) {
  .image-container .close-button {
    display: block;
  }
}
@media (hover: hover) {
  .image-container:hover .close-button {
    display: block;
  }
}
.close-button {
  position: absolute;
  top: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: none;
  transition: background-color 0.3s;
}
.close-button:hover {
  background-color: rgba(255, 0, 0, 0.7);
}
</style>
