<template>
  <div>
    <v-btn
      id="customZoomPlus"
      color="primary"
      elevation="4"
      fab
      x-small
      class="ma-2"
      absolute
      @click="zoomIn"
      :disabled="isAnimating"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>

    <v-btn
      id="customZoomMinus"
      color="primary"
      elevation="4"
      fab
      x-small
      class="ma-2"
      absolute
      @click="zoomOut"
      :disabled="isAnimating"
    >
      <v-icon>mdi-minus</v-icon>
    </v-btn>
    <div id="expandableCustomControl" fluid class="ml-2">
      <v-menu
        bottom
        offset-y
        nudge-bottom="10"
        nudge-right="5"
        content-class="white black--text"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            color="primary"
            v-bind="attrs"
            v-on="on"
            x-small
            class="ma-2"
            fab
            elevation="4"
            :disabled="isAnimating"
          >
            <v-icon>
              {{
                attrs["aria-expanded"] === "true"
                  ? "mdi-menu-up"
                  : "mdi-menu-down"
              }}
            </v-icon>
          </v-btn>
        </template>
        <v-container @click.stop>
          <v-color-picker
            dot-size="20"
            mode="rgba"
            swatches-max-height="100"
            v-model="color"
          ></v-color-picker>
          <v-row cols="auto" class="d-flex justify-end">
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  @click="applyColor(true)"
                  color="primary"
                  fab
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon>mdi-spray</v-icon>
                </v-btn>
              </template>
              <span>{{ $t("ApplyColor") }}</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  @click="applyColor(false)"
                  color="primary"
                  fab
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon>mdi-undo</v-icon>
                </v-btn>
              </template>
              <span>{{ $t("RevertColor") }}</span>
            </v-tooltip>
          </v-row>
        </v-container>
      </v-menu>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  mounted() {
    this.$root.$on("darkModeMapEvent", (flag) => {
      if (flag) {
        this.setColor();
      }
      this.darkBasemapHandler(flag);
    });
    this.$root.$on("permalinkColor", () => {
      this.isMapColored = true;
    });
  },
  props: ["map"],
  watch: {
    map(newVal, oldVal) {
      if (oldVal === null && newVal !== null && this.isMapColored) {
        this.setColor();
        this.applyColor(true);
      }
    },
  },
  methods: {
    applyColor(flag) {
      if (!flag) {
        this.$root.$emit("darkBasemapSwich", false);
      } else {
        if (!Object.values(this.rgb).every((value) => value === 0)) {
          this.$root.$emit("darkBasemapSwich", false);
        } else {
          this.$root.$emit("darkBasemapSwich", true);
        }
      }
      this.darkBasemapHandler(flag);
    },
    darkBasemapHandler(flag) {
      this.isMapColored = flag;
      if (this.darkOSMCallback === null) {
        this.darkOSMCallback = (evt) => {
          evt.context.globalCompositeOperation = "color";
          evt.context.fillStyle = "rgb(0,0,0)";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "overlay";
          evt.context.fillStyle = "rgb(0,0,0)";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "difference";
          evt.context.fillStyle =
            "rgba(" +
            [
              255 - this.rgb.r,
              255 - this.rgb.g,
              255 - this.rgb.b,
              1.0,
            ].toString() +
            ")";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "source-over";
        };
        this.map
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }
      if (flag === true) {
        this.map
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }
      if (flag === false) {
        this.map
          .getLayers()
          .getArray()[0]
          .un("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }
      let rgb = [];
      if (this.isMapColored) {
        rgb = [this.rgb.r, this.rgb.g, this.rgb.b];
      }
      this.$store.dispatch("Layers/setRGB", rgb);
    },
    setColor() {
      this.rgb = { r: this.getRGB[0], g: this.getRGB[1], b: this.getRGB[2] };
    },
    zoomIn() {
      let currentZoom = this.map.getView().getZoom();
      if (currentZoom < 20) {
        this.map.getView().setZoom(currentZoom + 1);
      }
    },
    zoomOut() {
      let currentZoom = this.map.getView().getZoom();
      if (currentZoom > 1) {
        this.map.getView().setZoom(currentZoom - 1);
      }
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
    ...mapGetters("Layers", ["getRGB"]),
    color: {
      get() {
        return this.rgb;
      },
      set(v) {
        this.rgb = v;
      },
    },
  },
  data() {
    return {
      darkOSMCallback: null,
      isMapColored: false,
      rgb: {
        r: 200,
        g: 200,
        b: 200,
      },
    };
  },
};
</script>

<style scoped>
#customZoomPlus {
  position: absolute;
  top: 0;
  right: 0px;
}

#customZoomMinus {
  position: absolute;
  top: 38px;
  right: 0px;
}

#expandableCustomControl {
  position: absolute;
  top: 76px;
  right: 0;
  max-width: 60px;
  max-height: 400px;
  z-index: 4;
}
</style>
