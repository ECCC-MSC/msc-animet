<template>
  <div
    class="resizable draggable-container"
    ref="draggableContainer"
    @mousedown="dragMouseDown"
    v-if="getActiveLegends.length !== 0"
  >
    <img
      :name="name"
      :id="name"
      crossorigin="anonymous"
      :src="getMapLegendURL(name)"
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
    ...mapGetters("Layers", ["getActiveLegends"]),
    ...mapState("Layers", ["isAnimating"]),
  },
  methods: {
    getMapLegendURL(layerName) {
      if (layerName === null) {
        return null;
      }
      let layer = this.$mapLayers.arr.find(
        (l) => l.get("layerName") === layerName
      );
      const wmsSource = layer.get("source")["url_"];
      const currentStyle = layer.get("layerCurrentStyle");
      let r = `${wmsSource}?version=1.3.0&service=WMS&request=GetLegendGraphic&sld_version=1.1.0&layer=${layerName}&format=image/png&STYLE=${currentStyle}`;
      return r;
    },
    dragMouseDown: function (event) {
      if (this.isAnimating) {
        event.preventDefault();
        return;
      }
      if (event.target.classList.contains("resizable")) return;
      event.preventDefault();
      // get the mouse cursor position at startup:
      this.positions.clientX = event.clientX;
      this.positions.clientY = event.clientY;
      document.onmousemove = this.elementDrag;
      document.onmouseup = this.closeDragElement;
    },
    elementDrag: function (event) {
      event.preventDefault();
      this.positions.movementX = this.positions.clientX - event.clientX;
      this.positions.movementY = this.positions.clientY - event.clientY;
      this.positions.clientX = event.clientX;
      this.positions.clientY = event.clientY;
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
    },
  },
};
</script>

<style scoped>
.resizable {
  display: inline-block;
  resize: horizontal;
  overflow: auto;
  top: 20px;
  left: 20px;
}

.resizable img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.draggable-container {
  cursor: move;
  position: absolute;
}
</style>
