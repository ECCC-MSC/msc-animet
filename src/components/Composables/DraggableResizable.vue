<template>
  <div
    class="resizable draggable-container"
    ref="draggableContainer"
    @mousedown="dragMouseDown"
    @touchstart="dragMouseDown"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps([
  'initialPosition',
  'resizeDirection',
  'preventDefault',
  'mapId',
])
const emit = defineEmits(['checkIntersect'])

const store = inject('store')
const isAnimating = computed(() => store.getIsAnimating)
const playState = computed(() => store.getPlayState)

const draggableContainer = ref(null)

const positions = ref({
  clientX: null,
  clientY: null,
  movementX: 0,
  movementY: 0,
})

const dragMouseDown = (event) => {
  if (isAnimating.value && playState.value !== 'play') {
    event.preventDefault()
    return
  }

  if (event.target.classList.contains('resizable')) {
    const animRect = document.getElementById(`animation-rect-${props.mapId}`)
    if (
      animRect && animRect.style.visibility === 'visible'
    ) {
      if (event.type === 'touchstart') {
        document.addEventListener('touchend', onResizeEnd)
      } else {
        document.addEventListener('mouseup', onResizeEnd)
      }
    }
    return
  }
  if (props.preventDefault) {
    event.preventDefault()
  }
  if (event.type === 'touchstart') {
    positions.value.clientX = event.touches[0].clientX
    positions.value.clientY = event.touches[0].clientY
    document.ontouchmove = elementDrag
    document.ontouchend = closeDragElement
  } else {
    positions.value.clientX = event.clientX
    positions.value.clientY = event.clientY
    document.onmousemove = elementDrag
    document.onmouseup = closeDragElement
  }
}

const elementDrag = (event) => {
  if (event.type === 'touchmove') {
    positions.value.movementX =
      positions.value.clientX - event.touches[0].clientX
    positions.value.movementY =
      positions.value.clientY - event.touches[0].clientY
    positions.value.clientX = event.touches[0].clientX
    positions.value.clientY = event.touches[0].clientY
  } else {
    event.preventDefault()
    positions.value.movementX = positions.value.clientX - event.clientX
    positions.value.movementY = positions.value.clientY - event.clientY
    positions.value.clientX = event.clientX
    positions.value.clientY = event.clientY
  }
  draggableContainer.value.style.top =
    draggableContainer.value.offsetTop - positions.value.movementY + 'px'
  draggableContainer.value.style.left =
    draggableContainer.value.offsetLeft - positions.value.movementX + 'px'
}

const closeDragElement = () => {
  document.onmouseup = null
  document.onmousemove = null
  document.ontouchmove = null
  document.ontouchend = null
  const animRect = document.getElementById(`animation-rect-${props.mapId}`)
  if (
    animRect && animRect.style.visibility === 'visible'
  ) {
    emit('checkIntersect')
  }
}

const onResizeEnd = () => {
  document.removeEventListener('mouseup', onResizeEnd)
  emit('checkIntersect')
}

onMounted(() => {
  if (props.initialPosition) {
    draggableContainer.value.style.top = props.initialPosition.top
    draggableContainer.value.style.left = props.initialPosition.left
  }
})
</script>

<style scoped>
.draggable-container {
  cursor: move;
  position: absolute;
}
.resizable {
  display: inline-block;
  resize: v-bind(resizeDirection);
  overflow: auto;
  max-width: 100%;
  max-height: 100%;
}
@media (max-width: 959px) {
  .resizable {
    top: 100px;
  }
}
</style>
