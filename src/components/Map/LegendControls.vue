<template>
  <div
    class="resizable draggable-container"
    :style="initialPosStyle()"
    ref="draggableContainer"
    @mousedown="dragMouseDown"
    @touchstart="dragMouseDown"
    v-if="getActiveLegends.length !== 0"
  >
    <img
      :class="getLegendHidden"
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
    ...mapGetters("Layers", [
      "getActiveLegends",
      "getColorBorder",
      "getLegendIndex",
    ]),
    ...mapState("Layers", ["isAnimating"]),
    getLegendHidden() {
      const getVisible = this.$mapLayers.arr
        .find((l) => l.get("layerName") === this.name)
        .get("layerVisibilityOn");
      return {
        "legend-hidden": !getVisible,
      };
    },
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
    initialPosStyle() {
      const initialX = 8;
      let initialY;
      if (window.innerWidth < 1265) {
        initialY = 100;
      } else {
        initialY = 50;
      }
      const offset = this.getLegendIndex.getItemInteger(this.name) * 10;
      return {
        top: `${initialY + offset}px`,
        left: `${initialX + offset}px`,
      };
    },
  },
};
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
@media (max-width: 1265px) {
  .resizable {
    top: 100px;
  }
}
</style>
