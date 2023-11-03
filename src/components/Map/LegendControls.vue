<template>
  <div
    class="resizable draggable-container"
    ref="draggableContainer"
    @mousedown="dragMouseDown"
    @touchstart="dragMouseDown"
    v-if="getActiveLegends.length !== 0"
  >
    <img
      :id="name"
      :name="name"
      :src="getMapLegendURL(name)"
      :style="{ border: getStyle }"
      :title="name"
      crossorigin="anonymous"
    />
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  props: ["name"],
  data() {
    return {
      positions: {
        clientX: null,
        clientY: null,
        movementX: 0,
        movementY: 0,
      },
    };
  },
  computed: {
    ...mapGetters("Layers", ["getColorBorder", "getActiveLegends"]),
    ...mapState("Layers", ["isAnimating"]),
    getStyle() {
      if (this.getColorBorder) {
        return `2px solid ${this.getLegendStyle()}`;
      }
      return "none";
    },
  },
  methods: {
    getLegendStyle() {
      const legendRGB = this.$mapLayers.arr
        .find((l) => l.get("layerName") === this.name)
        .get("legendColor");
      return `rgb(${legendRGB.r}, ${legendRGB.g}, ${legendRGB.b})`;
    },
    getMapLegendURL(layerName) {
      if (layerName === null) {
        return null;
      }
      let layer = this.$mapLayers.arr.find(
        (l) => l.get("layerName") === layerName
      );
      if (layer.get("layerStyles").length === 0) {
        return null;
      }
      return layer
        .get("layerStyles")
        .find((style) => style.Name === layer.get("layerCurrentStyle"))
        .LegendURL;
    },
    dragMouseDown: function (event) {
      if (this.isAnimating) {
        event.preventDefault();
        return;
      }
      if (event.target.classList.contains("resizable")) return;
      event.preventDefault();
      // get the mouse cursor position at startup:
      if (event.type === "touchstart") {
        // Touch event
        this.positions.clientX = event.touches[0].clientX;
        this.positions.clientY = event.touches[0].clientY;
        document.ontouchmove = this.elementDrag;
        document.ontouchend = this.closeDragElement;
      } else {
        // Mouse event
        this.positions.clientX = event.clientX;
        this.positions.clientY = event.clientY;
        document.onmousemove = this.elementDrag;
        document.onmouseup = this.closeDragElement;
      }
    },
    elementDrag: function (event) {
      if (event.type === "touchmove") {
        this.positions.movementX =
          this.positions.clientX - event.touches[0].clientX;
        this.positions.movementY =
          this.positions.clientY - event.touches[0].clientY;
        this.positions.clientX = event.touches[0].clientX;
        this.positions.clientY = event.touches[0].clientY;
      } else {
        event.preventDefault();
        this.positions.movementX = this.positions.clientX - event.clientX;
        this.positions.movementY = this.positions.clientY - event.clientY;
        this.positions.clientX = event.clientX;
        this.positions.clientY = event.clientY;
      }
      // set the element's new position:
      this.$refs.draggableContainer.style.top =
        this.$refs.draggableContainer.offsetTop -
        this.positions.movementY +
        "px";
      this.$refs.draggableContainer.style.left =
        this.$refs.draggableContainer.offsetLeft -
        this.positions.movementX +
        "px";
    },
    closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      document.ontouchmove = null;
      document.ontouchend = null;
    },
  },
};
</script>

<style scoped>
.resizable {
  display: inline-block;
  resize: horizontal;
  overflow: auto;
  top: 50px;
  left: 0.5em;
  max-width: 100%;
  max-height: 100%;
}
.resizable img {
  width: 100%;
  height: auto;
  object-fit: contain;
  vertical-align: middle;
}
.draggable-container {
  cursor: move;
  position: absolute;
}
@media (max-width: 1265px) {
  .resizable {
    top: 100px;
  }
}
</style>
