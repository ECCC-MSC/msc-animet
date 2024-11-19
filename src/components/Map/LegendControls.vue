<template>
  <div
    class="resizable draggable-container"
    :style="initialPosStyle()"
    ref="draggableContainer"
    @mousedown="dragMouseDown"
    @touchstart="dragMouseDown"
    @dblclick="emitter.emit('openPanel')"
    @click="$emit('legend-click', name)"
    v-if="activeLegends.length !== 0"
  >
    <img
      class="white"
      :class="getLegendHidden"
      :id="name"
      :name="name"
      :src="getMapLegendURL"
      :style="{ border: getStyle }"
      :title="name"
      crossorigin="anonymous"
    />
  </div>
</template>

<script>
export default {
  inject: ['store'],
  props: ['name'],
  mounted() {
    this.emitter.on('checkIntersect', this.checkIntersect)
  },
  beforeUnmount() {
    this.store.removeIntersect(this.name)
    this.emitter.off('checkIntersect', this.checkIntersect)
  },
  data() {
    return {
      positions: {
        clientX: null,
        clientY: null,
        movementX: 0,
        movementY: 0,
      },
    }
  },
  computed: {
    activeLegends() {
      return this.store.getActiveLegends
    },
    colorBorder() {
      return this.store.getColorBorder
    },
    legendIndex() {
      return this.store.getLegendIndex
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    playState() {
      return this.store.getPlayState
    },
    getLegendHidden() {
      const getVisible = this.$mapLayers.arr
        .find((l) => l.get('layerName') === this.name)
        .get('layerVisibilityOn')
      return {
        'legend-hidden': !getVisible,
      }
    },
    getMapLegendURL() {
      if (this.name === null) {
        return null
      }
      let layer = this.$mapLayers.arr.find(
        (l) => l.get('layerName') === this.name,
      )
      if (layer.get('layerStyles').length === 0) {
        return null
      }

      const legendUrl = layer
        .get('layerStyles')
        .find(
          (style) => style.Name === layer.get('layerCurrentStyle'),
        ).LegendURL
      if (legendUrl.includes('GetLegendGraphic'))
        return `${legendUrl}&lang=${this.$i18n.locale}`
      return legendUrl
    },
    getStyle() {
      if (this.colorBorder) {
        return `2px solid ${this.getLegendStyle()}`
      }
      return 'none'
    },
  },
  methods: {
    getLegendStyle() {
      const legendRGB = this.$mapLayers.arr
        .find((l) => l.get('layerName') === this.name)
        .get('legendColor')
      return `rgb(${legendRGB.r}, ${legendRGB.g}, ${legendRGB.b})`
    },
    dragMouseDown: function (event) {
      if (this.isAnimating && this.playState !== 'play') {
        event.preventDefault()
        return
      }

      if (event.target.classList.contains('resizable')) {
        if (
          document.getElementById('animation-rect').style.visibility ===
          'visible'
        ) {
          if (event.type === 'touchstart') {
            document.addEventListener('touchend', this.onResizeEnd)
          } else {
            document.addEventListener('mouseup', this.onResizeEnd)
          }
        }
        return
      }
      event.preventDefault()
      // get the mouse cursor position at startup:
      if (event.type === 'touchstart') {
        // Touch event
        this.positions.clientX = event.touches[0].clientX
        this.positions.clientY = event.touches[0].clientY
        document.ontouchmove = this.elementDrag
        document.ontouchend = this.closeDragElement
      } else {
        // Mouse event
        this.positions.clientX = event.clientX
        this.positions.clientY = event.clientY
        document.onmousemove = this.elementDrag
        document.onmouseup = this.closeDragElement
      }
    },
    elementDrag: function (event) {
      if (event.type === 'touchmove') {
        this.positions.movementX =
          this.positions.clientX - event.touches[0].clientX
        this.positions.movementY =
          this.positions.clientY - event.touches[0].clientY
        this.positions.clientX = event.touches[0].clientX
        this.positions.clientY = event.touches[0].clientY
      } else {
        event.preventDefault()
        this.positions.movementX = this.positions.clientX - event.clientX
        this.positions.movementY = this.positions.clientY - event.clientY
        this.positions.clientX = event.clientX
        this.positions.clientY = event.clientY
      }
      // set the element's new position:
      this.$refs.draggableContainer.style.top =
        this.$refs.draggableContainer.offsetTop -
        this.positions.movementY +
        'px'
      this.$refs.draggableContainer.style.left =
        this.$refs.draggableContainer.offsetLeft -
        this.positions.movementX +
        'px'
    },
    closeDragElement() {
      document.onmouseup = null
      document.onmousemove = null
      document.ontouchmove = null
      document.ontouchend = null
      if (
        document.getElementById('animation-rect').style.visibility === 'visible'
      ) {
        this.checkIntersect()
      }
    },
    initialPosStyle() {
      const initialX = 8
      let initialY
      if (window.innerWidth < 960) {
        initialY = 100
      } else {
        initialY = 50
      }
      const offset = this.legendIndex.getItemInteger(this.name) * 10
      return {
        top: `${initialY + offset}px`,
        left: `${initialX + offset}px`,
      }
    },
    onResizeEnd() {
      document.removeEventListener('mouseup', this.onResizeEnd)
      this.checkIntersect()
    },
    checkIntersect() {
      let layer = this.$mapLayers.arr.find(
        (l) => l.get('layerName') === this.name,
      )
      if (!layer.get('layerVisibilityOn')) {
        this.store.setIntersect([this.name, false])
        return
      }

      const previewDims = document
        .getElementById('animation-rect')
        .getBoundingClientRect()
      const imgDims = document.getElementById(this.name).getBoundingClientRect()
      if (
        imgDims.top < previewDims.top ||
        imgDims.bottom > previewDims.bottom ||
        imgDims.left < previewDims.left ||
        imgDims.right > previewDims.right
      ) {
        this.store.setIntersect([this.name, true])
      } else {
        this.store.setIntersect([this.name, false])
      }
    },
  },
}
</script>

<style scoped>
.draggable-container {
  cursor: move;
  position: absolute;
}
.legend-hidden {
  display: none;
}
.resizable {
  display: inline-block;
  resize: horizontal;
  overflow: auto;
  max-width: 100%;
  max-height: 100%;
}
.resizable img {
  width: 100%;
  height: auto;
  object-fit: contain;
  vertical-align: middle;
}
@media (max-width: 959px) {
  .resizable {
    top: 100px;
  }
}
</style>
