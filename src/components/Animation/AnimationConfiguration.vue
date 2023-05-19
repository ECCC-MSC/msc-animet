<template>
  <v-expansion-panels :value="0">
    <v-expansion-panel>
      <v-expansion-panel-header>
        {{ $t("MP4CreateTitle") }}
      </v-expansion-panel-header>
      <v-expansion-panel-content>
        <v-row>
          <v-col class="flex-grow-1 flex-shrink-0">
            <v-text-field
              v-model="animationTitle"
              counter="250"
              maxlength="250"
              dense
              clearable
              :disabled="isAnimating"
              :hint="$t('MP4CreateTitleHint')"
              :label="$t('MP4CreateCustomTitle')"
            ></v-text-field>
          </v-col>
          <v-col class="flex-shrink-1 flex-grow-0">
            <v-text-field
              :disabled="isAnimating"
              v-model="framesPerSecond"
              type="number"
              min="1"
              max="30"
              pattern="\d+"
              class="fps-selector pa-0"
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
          </v-col>
          <v-col class="flex-shrink-1 flex-grow-0">
            <v-switch
              class="dark-base-switch ma-0 pa-0"
              :disabled="isAnimating"
              v-model="darkModeToggle"
              hide-details
              :label="$t('DarkBasemapSwitch')"
              @change="toggleDarkMode"
            >
            </v-switch>
          </v-col>
        </v-row>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  mounted() {
    this.$root.$on("darkBasemapSwich", (flag) => {
      this.darkModeToggle = flag;
    });
    this.$root.$on("setAnimationTitle", this.setAnimationTitle);
  },
  data() {
    return {
      animationTitle: "",
      darkModeToggle: false,
    };
  },
  methods: {
    toggleDarkMode() {
      let rgb = [];
      if (this.darkModeToggle) {
        rgb = [0, 0, 0];
      }
      this.$store.dispatch("Layers/setRGB", rgb);
      this.$root.$emit("darkModeMapEvent", this.darkModeToggle);
    },
    setAnimationTitle() {
      if (this.animationTitle !== "") {
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
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating"]),
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
  },
};
</script>

<style scoped>
.fps-selector {
  margin-top: -2px;
  min-width: 34px;
}
.dark-base-switch {
  min-width: 152px;
}
</style>
