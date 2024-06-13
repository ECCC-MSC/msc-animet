<template>
  <div class="scroll">
    <v-col class="options pt-0">
      <v-alert
        v-if="intersectMessage"
        dense
        outlined
        type="warning"
        class="replace-legends"
        >{{ $t("ReplaceLegends") }}
      </v-alert>
      <v-text-field
        class="title-field"
        v-model="animationTitle"
        counter="250"
        maxlength="250"
        dense
        clearable
        :disabled="isAnimating"
        :hint="$t('MP4CreateTitleHint')"
        :label="$t('MP4CreateCustomTitle')"
      ></v-text-field>

      <v-col class="d-flex align-center">
        <v-switch
          class="dark-base-switch"
          :disabled="isAnimating"
          v-model="darkModeToggle"
          hide-details
          :label="$t('DarkBasemapSwitch')"
          @change="toggleDarkMode"
        >
        </v-switch>
        <v-switch
          class="reverse-switch"
          :disabled="
            isAnimating ||
            datetimeRangeSlider[0] === datetimeRangeSlider[1] ||
            getOutputFormat !== 'MP4'
          "
          v-model="animationReversed"
          hide-details
          :label="$t('ReverseAnimation')"
        >
        </v-switch>
      </v-col>
      <v-switch
        hide-details
        class="colored-border-switch"
        :disabled="isAnimating"
        :label="$t('ColorBorder')"
        v-model="colorBorder"
      ></v-switch>
      <v-row class="mt-0 mb-2 mx-0 align-center">
        <v-select
          hide-details
          class="res-select res-width"
          v-model="currentResolution"
          :label="$t('VideoFormat')"
          :items="resOptions"
          :disabled="isAnimating"
          @change="setResolution"
        >
        </v-select>
        <v-text-field
          hide-details
          :disabled="
            isAnimating ||
            datetimeRangeSlider[0] === datetimeRangeSlider[1] ||
            getOutputFormat !== 'MP4'
          "
          v-model="framesPerSecond"
          type="number"
          min="1"
          max="30"
          pattern="\d+"
          class="fps-selector"
        >
          <template v-slot:label>
            <v-tooltip top>
              <template v-slot:activator="{ on, attrs }">
                <div v-bind="attrs" v-on="on">{{ $t("FPS") }}</div>
              </template>
              <span>{{ $t("FramesPerSecond") }}</span>
            </v-tooltip>
          </template>
        </v-text-field>
        <v-spacer></v-spacer>
        <v-select
          hide-details
          class="res-select output-width"
          v-model="outputFormat"
          :label="$t('OutputFormat')"
          :items="outputOptions"
          :disabled="
            isAnimating || datetimeRangeSlider[0] === datetimeRangeSlider[1]
          "
        >
        </v-select>
      </v-row>
    </v-col>
    <v-col class="options-bottom">
      <v-select
        hide-details
        class="res-select"
        v-model="aspectRatio"
        :label="$t('AspectSelection')"
        :items="Object.keys(resDict)"
        :disabled="isAnimating"
        @change="setResolution"
      >
        <template v-slot:item="{ item }">
          {{ formatResolutionName(item) }}
        </template>
        <template v-slot:selection="{ item }">
          {{ formatResolutionName(item) }}
        </template>
      </v-select>
    </v-col>
    <create-animation />
    <export-animation v-if="MP4ExportFlag" />
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import CreateAnimation from "../Animation/CreateAnimation.vue";
import ExportAnimation from "../Animation/ExportAnimation.vue";

export default {
  mounted() {
    this.$root.$on("darkBasemapSwitch", this.handleDarkBasemapSwitch);
    this.$root.$on("setAnimationTitle", this.setAnimationTitle);
  },
  beforeDestroy() {
    this.$root.$off("darkBasemapSwitch", this.handleDarkBasemapSwitch);
    this.$root.$off("setAnimationTitle", this.setAnimationTitle);
  },
  data() {
    return {
      animationPreview: false,
      animationTitle: "",
      darkModeToggle: false,
      intersectMessage: false,
      outputOptions: ["JPEG", "MP4"],
      resDict: {
        Widescreen: {
          name: "Widescreen",
          "720p": {
            height: 720,
            width: 1280,
          },
          "1080p": {
            height: 1080,
            width: 1920,
          },
          aspect: "[16:9]",
        },
        Square: {
          name: "Square",
          "720p": {
            height: 720,
            width: 720,
          },
          "1080p": {
            height: 1080,
            width: 1080,
          },
          aspect: "[1:1]",
        },
        Portrait: {
          name: "Portrait",
          "720p": {
            height: 1280,
            width: 720,
          },
          "1080p": {
            height: 1920,
            width: 1080,
          },
          aspect: "[9:16]",
        },
        PortaitSmall: {
          name: "Portrait",
          "720p": {
            height: 900,
            width: 720,
          },
          "1080p": {
            height: 1350,
            width: 1080,
          },
          aspect: "[4:5]",
        },
        Standard: {
          name: "Standard",
          "720p": {
            height: 720,
            width: 960,
          },
          "1080p": {
            height: 1080,
            width: 1440,
          },
          aspect: "[4:3]",
        },
        UltraWideScreen: {
          name: "UltraWideScreen",
          "720p": {
            height: 720,
            width: 1680,
          },
          "1080p": {
            height: 1080,
            width: 2520,
          },
          aspect: "[21:9]",
        },
      },
      resOptions: ["720p", "1080p"],
    };
  },
  components: {
    CreateAnimation,
    ExportAnimation,
  },
  methods: {
    handleDarkBasemapSwitch(flag) {
      this.darkModeToggle = flag;
    },
    formatResolutionName(resolution) {
      return `${this.$t(this.resDict[resolution].name)}${this.$t("Colon")} ${
        this.resDict[resolution][this.getCurrentResolution].width
      }x${this.resDict[resolution][this.getCurrentResolution].height} ${
        this.resDict[resolution].aspect
      }`;
    },
    setAnimationTitle() {
      if (this.animationTitle !== "" && this.animationTitle !== null) {
        this.$store.dispatch("Layers/setAnimationTitle", this.animationTitle);
      } else {
        if (this.getMapTimeSettings.SnappedLayer !== null) {
          this.$store.dispatch(
            "Layers/setAnimationTitle",
            this.$t(this.getMapTimeSettings.SnappedLayer)
          );
        } else if (this.getMapTimeSettings.Step !== null) {
          for (let i = this.$mapLayers.arr.length - 1; i >= 0; i--) {
            const layer = this.$mapLayers.arr[i];
            if (
              layer.get("layerIsTemporal") &&
              layer.get("layerTimeStep") === this.getMapTimeSettings.Step
            ) {
              this.$store.dispatch(
                "Layers/setAnimationTitle",
                this.$t(layer.get("layerName"))
              );
              break;
            }
          }
        } else {
          const firstLayerTitle = this.$t(
            this.$mapLayers.arr[this.$mapLayers.arr.length - 1].get("layerName")
          );
          this.$store.dispatch("Layers/setAnimationTitle", firstLayerTitle);
        }
      }
    },
    setResolution() {
      let controlElement = document.getElementById("animation-rect");
      const newHeight = this.getCurrentAspect[this.getCurrentResolution].height;
      const newWidth = this.getCurrentAspect[this.getCurrentResolution].width;
      controlElement.style.height = `${
        Math.round((newHeight / newWidth) * 10000) / 100
      }vw`;
      controlElement.style.maxWidth = `${
        Math.round((newWidth / newHeight) * 10000) / 100
      }vh`;
      this.$root.$emit("calcFooterPreview");
    },
    toggleDarkMode() {
      let rgb = [];
      if (this.darkModeToggle) {
        rgb = [0, 0, 0];
      }
      this.$store.dispatch("Layers/setRGB", rgb);
      this.$root.$emit("darkModeMapEvent", this.darkModeToggle);
    },
  },
  computed: {
    ...mapGetters("Layers", [
      "getColorBorder",
      "getCurrentAspect",
      "getCurrentResolution",
      "getImgURL",
      "getIntersectMessageDisplayed",
      "getMapTimeSettings",
      "getMP4URL",
      "getOutputFormat",
    ]),
    ...mapState("Layers", [
      "datetimeRangeSlider",
      "isAnimating",
      "isAnimationReversed",
    ]),
    animationReversed: {
      get() {
        return this.isAnimationReversed;
      },
      set(isReversed) {
        this.$store.dispatch("Layers/setIsAnimationReversed", isReversed);
      },
    },
    aspectRatio: {
      get() {
        return this.getCurrentAspect.name;
      },
      set(name) {
        this.$store.commit("Layers/setCurrentAspect", this.resDict[name]);
      },
    },
    colorBorder: {
      get() {
        return this.getColorBorder;
      },
      set(state) {
        this.$store.dispatch("Layers/setColorBorder", state);
      },
    },
    currentResolution: {
      get() {
        return this.getCurrentResolution;
      },
      set(res) {
        this.$store.commit("Layers/setCurrentResolution", res);
      },
    },
    framesPerSecond: {
      get() {
        return this.$store.state["Layers"].framesPerSecond;
      },
      set(fps) {
        if (fps === "") {
          if (this.framesPerSecond === 3) {
            this.$store.commit("Layers/setFramesPerSecond", 4);
          } else {
            this.$store.commit("Layers/setFramesPerSecond", 3);
          }
        } else if (parseInt(fps) > 30) {
          if (this.framesPerSecond === 30) {
            this.$store.commit("Layers/setFramesPerSecond", 29);
          } else {
            this.$store.commit("Layers/setFramesPerSecond", 30);
          }
        } else if (parseInt(fps) < 1) {
          if (this.framesPerSecond === 1) {
            this.$store.commit("Layers/setFramesPerSecond", 2);
          } else {
            this.$store.commit("Layers/setFramesPerSecond", 1);
          }
        } else {
          this.$store.commit("Layers/setFramesPerSecond", parseInt(fps));
        }
      },
    },
    layersLength() {
      return this.$mapLayers.arr.length;
    },
    MP4ExportFlag() {
      return this.getMP4URL !== null || this.getImgURL !== null;
    },
    outputFormat: {
      get() {
        return this.getOutputFormat;
      },
      set(format) {
        this.$store.commit("Layers/setOutputFormat", format);
      },
    },
  },
  watch: {
    animationTitle(newTitle, oldTitle) {
      if (
        (newTitle !== "" &&
          newTitle !== null &&
          (oldTitle === "" || oldTitle === null)) ||
        ((newTitle === "" || newTitle === null) &&
          oldTitle !== "" &&
          oldTitle !== null)
      ) {
        this.$root.$emit("calcFooterPreview");
      }
    },
    getIntersectMessageDisplayed: {
      deep: true,
      handler(newObj) {
        if (Object.values(newObj).some((value) => value === true)) {
          this.intersectMessage = true;
        } else {
          this.intersectMessage = false;
        }
      },
    },
    layersLength(_, oldValue) {
      if (oldValue !== undefined) {
        this.$root.$emit("calcFooterPreview");
      }
    },
  },
};
</script>

<style scoped>
.colored-border-switch {
  margin: 0 0 10px -4px;
}
.dark-base-switch {
  min-width: 120px;
  margin: -12px 10px -8px -16px;
  padding: 0;
}
.fps-selector {
  margin-top: -2px;
  width: 38px;
  flex: 0 1 auto;
}
.options {
  margin: auto;
}
.options-bottom {
  margin: auto;
  margin-top: -22px;
}
.output-width {
  max-width: 110px;
}
.replace-legends {
  font-size: 10pt;
  line-height: 1.1;
  display: block;
  padding: 4px;
  margin-bottom: 6px;
  margin-top: 4px;
}
.res-select {
  margin-top: -2px;
}
.res-width {
  max-width: 110px;
  padding-right: 12px;
}
.reverse-switch {
  min-width: 180px;
  margin: -12px -12px -8px -20px;
  padding: 0;
}
.scroll {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px);
}
.title-field::v-deep .v-label--active {
  display: none;
}
@media (max-width: 1120px) {
  .scroll {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px + 24px);
  }
}
@media (max-width: 959px) {
  .scroll {
    max-height: calc(
      100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px - 42px + 24px
    );
  }
}
@media (max-width: 750px) {
  #animation-configuration {
    width: 100% !important;
  }
}
@media (max-width: 565px) {
  .scroll {
    max-height: calc(
      100vh - (34px + 0.5em * 2) - 0.5em - 158px - 48px - 42px - 10px
    );
  }
}
</style>
