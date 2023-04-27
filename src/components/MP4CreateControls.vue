<template>
  <v-expansion-panels :value="0">
    <v-expansion-panel>
      <v-expansion-panel-header>
        {{ $t("MP4CreateTitle") }}
      </v-expansion-panel-header>
      <v-expansion-panel-content>
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="animationTitle"
              counter="250"
              maxlength="250"
              dense
              :disabled="isAnimating"
              :hint="$t('MP4CreateTitleHint')"
              :label="$t('MP4CreateCustomTitle')"
            >
              <template v-slot:append-outer>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      @click="resetTitle"
                      v-bind="attrs"
                      v-on="on"
                      :disabled="isAnimating"
                    >
                      <v-icon>mdi-undo</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ $t("revertTitle") }}</span>
                </v-tooltip>
              </template>
            </v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6">
            <v-select
              :label="$t('legendSelector')"
              v-model="selection"
              :items="getItemsList"
              :disabled="getLayerList === [] || isAnimating"
              @input="$store.dispatch('Layers/setMapLegendLayer', selection)"
              class="legend-selector"
            >
              <template v-slot:item="{ item }">
                {{ item !== "" ? $t(item.Name) : $t("noLegend") }}
              </template>
              <template v-slot:selection="{ item }">
                {{ item !== "" ? $t(item.Name) : $t("noLegend") }}
              </template>
            </v-select>
          </v-col>
          <v-col cols="1">
            <v-text-field
              :disabled="isAnimating"
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
                    <div v-bind="attrs" v-on="on">{{ $t("fps") }}</div>
                  </template>
                  <span>{{ $t("framesPerSecond") }}</span>
                </v-tooltip>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="2">
            <v-switch
              :disabled="isAnimating"
              v-model="timeFormat"
              hide-details
              :label="$t('MP4CreateTimeFormat')"
            >
            </v-switch>
          </v-col>
          <v-col cols="2">
            <v-switch
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
import { mapGetters, mapState, mapMutations } from "vuex";

export default {
  mounted() {
    this.$root.$on("adjustDefaultTitle", this.changeAnimationTitle);
    this.$root.$on("darkBasemapSwichOff", () => {
      this.darkModeToggle = false;
    });
    this.$root.$on("localeChange", this.changeAnimationTitle);
    this.$root.$on("removeLayer", this.checkForChange);
  },
  data() {
    return {
      addAllLayersTitles: true,
      darkModeToggle: false,
      MP4Quality: 30,
      selection: null,
    };
  },
  methods: {
    checkForChange(layerName) {
      if (this.getMapTimeSettings.SnappedLayer !== null) {
        if (this.getMapTimeSettings.SnappedLayer.Name !== layerName) {
          this.changeAnimationTitle();
        }
      } else {
        this.changeAnimationTitle();
      }
    },
    changeAnimationTitle(oldDriver = null) {
      let temporalLayers = this.getLayerList.filter((l) => l.isTemporal);
      if (temporalLayers.length !== 0) {
        if (!oldDriver) {
          if (this.getMapTimeSettings.SnappedLayer !== null) {
            this.setAnimationTitle(
              this.$t(this.getMapTimeSettings.SnappedLayer.Name)
            );
          } else {
            let currentIntervalLayers = temporalLayers.filter(
              (l) => l.dateTriplet[2] === this.getMapTimeSettings.Step
            );
            if (currentIntervalLayers.length === 1) {
              this.setAnimationTitle(this.$t(currentIntervalLayers[0].Name));
            } else if (this.animationTitle !== "") {
              const titleLayer = temporalLayers.filter(
                (l) =>
                  l.Title === this.animationTitle &&
                  l.dateTriplet[2] === this.getMapTimeSettings.Step
              );
              if (titleLayer.length === 1) {
                this.setAnimationTitle(this.$t(titleLayer[0].Name));
              } else {
                this.setAnimationTitle("");
              }
            }
          }
        } else {
          if (this.animationTitle === oldDriver.Title) {
            const titleLayer = temporalLayers.filter(
              (l) => l.Title === this.animationTitle
            );
            if (titleLayer.length === 0) {
              let currentIntervalLayers = temporalLayers.filter(
                (l) => l.dateTriplet[2] === this.getMapTimeSettings.Step
              );
              if (currentIntervalLayers.length === 1) {
                this.setAnimationTitle(this.$t(currentIntervalLayers[0].Name));
              } else {
                this.setAnimationTitle("");
              }
            } else {
              this.setAnimationTitle(this.$t(oldDriver.Name));
            }
          }
        }
      }
    },
    resetTitle() {
      this.isTitleCustom(false);
      this.changeAnimationTitle();
    },
    toggleDarkMode() {
      let rgb = [];
      if (this.darkModeToggle) {
        rgb = [0, 0, 0];
      }
      this.$store.dispatch("Layers/setRGB", rgb);
      this.$root.$emit("darkModeMapEvent", this.darkModeToggle);
    },
    ...mapMutations("Layers", [
      "isTitleCustom",
      "setAnimationTitle",
      "setCustomTitle",
    ]),
  },
  watch: {
    SnappedLayerChange(newSnappedLayer, oldSnappedLayer) {
      if (newSnappedLayer !== null) {
        this.setAnimationTitle(this.$t(newSnappedLayer.Name));
      } else {
        this.changeAnimationTitle(oldSnappedLayer);
      }
    },
    MapLegendChange(newLegendLayer, _) {
      if (newLegendLayer === null) {
        this.selection = "";
      } else {
        this.selection = newLegendLayer;
      }
    },
  },
  computed: {
    ...mapGetters("Layers", [
      "getLayerList",
      "getMapTimeSettings",
      "getTimeFormat",
    ]),
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
    animationTitle: {
      get() {
        return this.$store.state["Layers"].animationTitle;
      },
      set(title) {
        this.isTitleCustom(true);
        this.setCustomTitle(title);
      },
    },
    timeFormat: {
      get() {
        return this.getTimeFormat;
      },
      set(flag) {
        this.$store.dispatch("Layers/setTimeFormat", flag);
      },
    },
    SnappedLayerChange() {
      return this.getMapTimeSettings.SnappedLayer;
    },
    MapLegendChange() {
      return this.getMapTimeSettings.MapLegendLayer;
    },
    getItemsList() {
      return [""].concat(this.getLayerList);
    },
  },
};
</script>

<style scoped>
.fps-selector {
  max-width: 40px;
  min-width: 33px;
}
</style>

<style>
.legend-selector .v-select__selections {
  flex-flow: nowrap;
  flex-wrap: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
</style>
