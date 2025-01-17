<template>
  <DraggableResizable
    :initialPosition="initialPosStyle()"
    resizeDirection="both"
    @checkIntersect="checkIntersect"
  >
    <div class="text-box-container">
      <div
        :id="`text-box-${id}`"
        class="text-box"
        contentEditable="true"
        spellcheck="false"
        @blur="handleUnfocus"
        @focus="onTextboxFocus"
        @paste="handlePaste"
        @keydown.left.right.space.enter.stop
      ></div>
      <button
        class="close-button mdi mdi-close"
        @click="destroyTextbox"
      ></button>
    </div>
  </DraggableResizable>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getCurrentInstance } from 'vue'

const props = defineProps(['id', 'coord'])
const { proxy } = getCurrentInstance()
const element = ref(null)

const store = inject('store')
const isAnimating = computed(() => store.getIsAnimating)
const playState = computed(() => store.getPlayState)

const destroyTextbox = () => {
  store.removeTextBox(props.id)
}

onMounted(() => {
  proxy.emitter.on('checkIntersect', checkIntersect)
  element.value = document.getElementById(`text-box-${props.id}`)
  element.value.focus()
  checkIntersect()
})

onBeforeUnmount(() => {
  store.removeIntersect(`text-box-${props.id}`)
  proxy.emitter.off('checkIntersect', checkIntersect)
})

const onTextboxFocus = () => {
  if (isAnimating.value && playState.value !== 'play') return
  store.setTextBoxFocused(true)
}

const handleUnfocus = () => {
  store.setTextBoxFocused(false)
}

const handlePaste = (evt) => {
  evt.preventDefault()
  const text = evt.clipboardData?.getData('text/plain')
  const selectedRange = window.getSelection()?.getRangeAt(0)
  if (!selectedRange || !text) return

  selectedRange.deleteContents()
  selectedRange.insertNode(document.createTextNode(text))
  selectedRange.setStart(selectedRange.endContainer, selectedRange.endOffset)
}

const initialPosStyle = () => {
  const pixelPosition = proxy.$mapCanvas.mapObj.getPixelFromCoordinate(
    props.coord,
  )
  return {
    top: `${pixelPosition[1]}px`,
    left: `${pixelPosition[0]}px`,
  }
}

const checkIntersect = () => {
  const previewDims = document
    .getElementById('animation-rect')
    .getBoundingClientRect()
  const imgDims = document
    .getElementById(`text-box-${props.id}`)
    .getBoundingClientRect()
  if (
    imgDims.top < previewDims.top ||
    imgDims.bottom > previewDims.bottom ||
    imgDims.left < previewDims.left ||
    imgDims.right > previewDims.right
  ) {
    store.setIntersect([`text-box-${props.id}`, true])
  } else {
    store.setIntersect([`text-box-${props.id}`, false])
  }
}
</script>

<style scoped>
.text-box-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.text-box {
  color: black;
  background-color: rgba(255, 255, 255, 0.75);
  padding: 2px 5px 2px 5px;
  width: 100%;
  height: 100%;
  outline: 0px solid transparent;
}
.text-box:empty::before {
  opacity: 0;
  content: 'placeholder';
}
@media (pointer: coarse) {
  .text-box-container:focus-within .close-button {
    display: block;
  }
}
@media (hover: hover) {
  .text-box-container:hover .close-button {
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
