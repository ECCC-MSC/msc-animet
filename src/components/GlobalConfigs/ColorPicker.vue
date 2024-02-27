<template>
  <v-expansion-panels flat>
    <v-expansion-panel>
      <v-expansion-panel-header class="pa-0 panel-header">
        {{ $t("ColorPicker") }}
      </v-expansion-panel-header>
      <v-expansion-panel-content class="panel-content">
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
                @click="whiteBasemapHandler()"
                color="primary"
                fab
                v-bind="attrs"
                v-on="on"
              >
                <v-icon>mdi-map-outline</v-icon>
              </v-btn>
            </template>
            <span>{{ $t("InvisibleBasemap") }}</span>
          </v-tooltip>
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
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  mounted() {
    this.$root.$on("darkModeMapEvent", (flag) => {
      if (flag) {
        this.setColor();
      }
      this.coloredBasemapHandler(flag);
    });
    this.$root.$on("invisibleBasemap", () => {
      this.isMapColored = null;
    });
    this.$root.$on("permalinkColor", () => {
      this.isMapColored = true;
    });
  },
  watch: {
    "$mapCanvas.mapObj": {
      handler(newVal, oldVal) {
        if (
          Object.keys(oldVal).length === 0 &&
          Object.keys(newVal).length !== 0 &&
          this.isMapColored
        ) {
          this.setColor();
          this.applyColor(true);
        } else if (this.isMapColored === null) {
          this.isMapColored = false;
          this.whiteBasemapHandler();
        }
      },
    },
  },
  methods: {
    applyColor(flag) {
      if (!flag) {
        this.$root.$emit("darkBasemapSwitch", false);
      } else {
        if (!Object.values(this.rgb).every((value) => value === 0)) {
          this.$root.$emit("darkBasemapSwitch", false);
        } else {
          this.$root.$emit("darkBasemapSwitch", true);
        }
      }
      this.coloredBasemapHandler(flag);
    },
    coloredBasemapHandler(flag) {
      if (
        !flag &&
        !this.$mapCanvas.mapObj.getLayers().getArray()[0].get("visible")
      ) {
        this.whiteBasemapHandler();
      }
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
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.$mapCanvas.mapObj.updateSize();
      }
      if (flag === true) {
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.$mapCanvas.mapObj.updateSize();
      }
      if (flag === false) {
        this.$mapCanvas.mapObj
          .getLayers()
          .getArray()[0]
          .un("postrender", this.darkOSMCallback);
        this.$mapCanvas.mapObj.updateSize();
      }
      this.$mapCanvas.mapObj.renderSync();
      let rgb = [];
      if (this.isMapColored) {
        rgb = [this.rgb.r, this.rgb.g, this.rgb.b];
      }
      this.$store.dispatch("Layers/setRGB", rgb);
      this.$root.$emit("updatePermalink");
    },
    setColor() {
      this.rgb = { r: this.getRGB[0], g: this.getRGB[1], b: this.getRGB[2] };
    },
    whiteBasemapHandler() {
      const visible = !this.$mapCanvas.mapObj
        .getLayers()
        .getArray()[0]
        .get("visible");
      this.$mapCanvas.mapObj.getLayers().getArray()[0].setVisible(visible);
      this.$store.commit("Layers/setIsBasemapVisible", visible);
      this.$root.$emit("updatePermalink");
      this.$root.$emit("calcFooterPreview");
    },
  },
  computed: {
    ...mapGetters("Layers", ["getRGB", "isBasemapVisible"]),
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
.panel-content::v-deep .v-expansion-panel-content__wrap {
  padding: 0;
}
.panel-header {
  height: 32px;
  min-height: 32px;
}
</style>
