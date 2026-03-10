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
])
const emit = defineEmits(['checkIntersect'])

const store = inject('store')
const isAnimating = computed(() => store.getIsAnimating)
const playState = computed(() => store.getPlayState)

const draggableContainer = ref(null)

const positions = ref({
  clientX: null,
  clientY: null,
})

const interactionState = ref({
  isTextEditable: false,
  dragStarted: false,
})

const pinchState = ref({
  active: false,
  startDistance: 0,
  startWidth: 0,
  startHeight: 0,
  startTouch0: null,
  startTouch1: null,
})

const getDistance = (touch1, touch2) =>
  Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)

const dragMouseDown = (event) => {
  if (isAnimating.value && playState.value !== 'play') {
    event.preventDefault()
    return
  }

  // Ignore container drag start on action controls
  if (event.target.closest('button')) {
    return
  }

  // For touch controls, allow pinch resize and single-finger drag
  if (event.type === 'touchstart') {
    const isContentEditable = !!event.target.closest('[contenteditable="true"]')
    interactionState.value.isTextEditable = isContentEditable
    interactionState.value.dragStarted = false

    if (event.touches.length === 2) {
      event.preventDefault()
      const distance = getDistance(event.touches[0], event.touches[1])
      pinchState.value = {
        active: true,
        startDistance: distance,
        startWidth: draggableContainer.value.offsetWidth,
        startHeight: draggableContainer.value.offsetHeight,
        startTouch0: {
          clientX: event.touches[0].clientX,
          clientY: event.touches[0].clientY,
        },
        startTouch1: {
          clientX: event.touches[1].clientX,
          clientY: event.touches[1].clientY,
        },
      }
      document.ontouchmove = resizeWithPinch
      document.ontouchend = closePinchElement
      document.ontouchcancel = closePinchElement
      return
    }

    if (event.touches.length === 1) {
      if (!isContentEditable) {
        event.preventDefault()
      }
      positions.value.clientX = event.touches[0].clientX
      positions.value.clientY = event.touches[0].clientY
      document.ontouchmove = elementDrag
      document.ontouchend = closeDragElement
      return
    }
  }

  // On desktop mouse mode, do not hijack bottom-right corner drags
  if (
    event.type === 'mousedown' &&
    draggableContainer.value &&
    props.resizeDirection
  ) {
    const rect = draggableContainer.value.getBoundingClientRect()
    const cornerThreshold = 18
    if (
      event.clientX >= rect.right - cornerThreshold &&
      event.clientY >= rect.bottom - cornerThreshold
    ) {
      return
    }
  }

  if (props.preventDefault) {
    event.preventDefault()
  }

  if (event.type === 'mousedown') {
    positions.value.clientX = event.clientX
    positions.value.clientY = event.clientY
    document.onmousemove = elementDrag
    document.onmouseup = closeDragElement
  }
}

const elementDrag = (event) => {
  let movementX, movementY

  if (event.type === 'touchmove') {
    movementX = positions.value.clientX - event.touches[0].clientX
    movementY = positions.value.clientY - event.touches[0].clientY
    positions.value.clientX = event.touches[0].clientX
    positions.value.clientY = event.touches[0].clientY
  } else {
    event.preventDefault()
    movementX = positions.value.clientX - event.clientX
    movementY = positions.value.clientY - event.clientY
    positions.value.clientX = event.clientX
    positions.value.clientY = event.clientY
  }

  const moveDist = Math.hypot(movementX, movementY)
  if (
    interactionState.value.isTextEditable &&
    !interactionState.value.dragStarted &&
    moveDist < 8
  ) {
    return
  }

  if (
    interactionState.value.isTextEditable &&
    !interactionState.value.dragStarted
  ) {
    interactionState.value.dragStarted = true
  }

  draggableContainer.value.style.top =
    draggableContainer.value.offsetTop - movementY + 'px'
  draggableContainer.value.style.left =
    draggableContainer.value.offsetLeft - movementX + 'px'
}

const resizeWithPinch = (event) => {
  if (!pinchState.value.active || event.touches.length !== 2) return
  if (pinchState.value.startDistance === 0) return

  const distance = getDistance(event.touches[0], event.touches[1])
  const scale = distance / pinchState.value.startDistance

  if (props.resizeDirection === 'vertical') {
    draggableContainer.value.style.height = `${Math.max(30, pinchState.value.startHeight * scale)}px`
  } else if (props.resizeDirection === 'horizontal') {
    draggableContainer.value.style.width = `${Math.max(50, pinchState.value.startWidth * scale)}px`
  } else {
    // Scale each axis independently based on finger spread direction
    const dx = Math.abs(event.touches[0].clientX - event.touches[1].clientX)
    const dy = Math.abs(event.touches[0].clientY - event.touches[1].clientY)
    const startDx = Math.abs(
      pinchState.value.startTouch0.clientX -
        pinchState.value.startTouch1.clientX,
    )
    const startDy = Math.abs(
      pinchState.value.startTouch0.clientY -
        pinchState.value.startTouch1.clientY,
    )

    if (startDx > 0) {
      const scaleX = dx / startDx
      draggableContainer.value.style.width = `${Math.max(50, pinchState.value.startWidth * scaleX)}px`
    }
    if (startDy > 0) {
      const scaleY = dy / startDy
      draggableContainer.value.style.height = `${Math.max(30, pinchState.value.startHeight * scaleY)}px`
    }
  }
}

const closePinchElement = () => {
  pinchState.value.active = false
  document.ontouchmove = null
  document.ontouchend = null
  document.ontouchcancel = null
  if (
    document.getElementById('animation-rect')?.style.visibility === 'visible'
  ) {
    emit('checkIntersect')
  }
}

const closeDragElement = () => {
  interactionState.value.dragStarted = false
  document.onmouseup = null
  document.onmousemove = null
  document.ontouchmove = null
  document.ontouchend = null
  if (
    document.getElementById('animation-rect')?.style.visibility === 'visible'
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
  touch-action: none;
}
.resizable {
  display: inline-block;
  resize: v-bind(resizeDirection);
  overflow: auto;
  max-width: 100%;
  max-height: 100%;
  touch-action: none;
}
@media (max-width: 959px) {
  .resizable {
    top: 100px;
  }
}
</style>
