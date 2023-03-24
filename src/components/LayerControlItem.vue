<template>
  <transition-group name="list" tag="div">
    <v-list-item
      v-for="(item, index) in value"
      :key="item.Name"
      outlined
      class="pa-0"
    >
      <v-list-item-content>
        <v-row>
          <!-- Title -->
          <v-col cols="12" sm="8" md="8" class="py-2">
            <v-list-item-title :title="$t(item.Name)">{{
              $t(item.Name)
            }}</v-list-item-title>
            <v-list-item-subtitle>{{ item.Name }}</v-list-item-subtitle>
          </v-col>

          <!-- Layer control buttons -->
          <v-col
            class="d-flex justify-start justify-md-space-between align-center pl-6 pa-0"
          >
            <v-tooltip class="temporal-tooltip" bottom v-if="item.isTemporal">
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  x-large
                  v-bind="attrs"
                  v-on="on"
                  icon
                  :color="isSnapped(item.Name)"
                  :disabled="isAnimating"
                  @click="snapLayerToAnimation(item.Name)"
                >
                  <v-icon>
                    {{ isSnapped(item.Name) ? "mdi-clock-check" : "mdi-clock" }}
                  </v-icon>
                </v-btn>
              </template>
              <v-container
                class="primary darken-2 rounded pl-4 pr-4"
                v-if="isSnapped(item.Name)"
              >
                <v-row>
                  {{ $t("SnappedLayer") }}
                </v-row>
              </v-container>
              <v-container v-else>
                <v-row>
                  {{ $t("SnapLayerToExtent") }}
                </v-row>
              </v-container>
              <v-container>
                <v-row v-if="!item.layerIndexOOB && item.Visible">
                  {{ $t("LayerBarCurrentTooltip") }} :
                  {{ localeDateFormat(item.currentTime) }}
                </v-row>
                <v-row>
                  {{ $t("LayerBarStartsTooltip") }} :
                  {{ localeDateFormat(item.dateTriplet[0]) }}
                </v-row>
                <v-row>
                  {{ $t("LayerBarEndsTooltip") }} :
                  {{ localeDateFormat(item.dateTriplet[1]) }}
                </v-row>
                <v-row>
                  {{ $t("LayerBarStepTooltip") }} :
                  {{ item.dateTriplet[2] }}
                </v-row>
              </v-container>
            </v-tooltip>
            <v-btn x-large icon disabled v-else>
              <v-icon>
                {{ "mdi-clock-remove" }}
              </v-icon>
            </v-btn>

            <v-menu class="opacity-menu" open-on-hover bottom offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  x-large
                  :color="isSnapped(item.Name)"
                  v-bind="attrs"
                  v-on="on"
                  icon
                  :disabled="isAnimating"
                >
                  <v-icon> mdi-opacity </v-icon>
                </v-btn>
              </template>

              <v-card class="pa-4" min-width="300">
                <v-card-title> {{ $t("LayerBarOpacity") }} </v-card-title>
                <v-card-text>
                  <v-slider
                    v-model="item.Opacity"
                    min="0"
                    max="1"
                    step="0.05"
                    @input="setOpacityHandler(item.Name, item.Opacity)"
                    :disabled="isAnimating"
                  >
                    <template #append>
                      {{ Math.ceil(Math.round(item.Opacity * 100)) }}%
                    </template>
                  </v-slider>
                </v-card-text>
              </v-card>
            </v-menu>

            <v-tooltip class="visibility-tooltip" bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  :color="colorScheme(item)"
                  icon
                  x-large
                  v-bind="attrs"
                  v-on="on"
                  @click="setVisibleHandler(item.Name)"
                  :disabled="isAnimating"
                >
                  <v-icon>
                    {{ selectIcon(item) }}
                  </v-icon>
                </v-btn>
              </template>
              <span>
                {{ $t("LayerBarVisibilityTooltip") }}
              </span>
              <v-container
                v-if="item.layerIndexOOB && item.Visible"
                class="red darken-2 rounded pl-4 pr-4"
              >
                <v-row>
                  {{ $t("LayerBarInvisibleTooltip") }}
                </v-row>
                <v-row>
                  {{ $t("LayerBarMapTime") }}
                  {{ localeDateFormat(item.VisibilityMapTime) }}
                </v-row>
                <v-row>
                  {{ $t("LayerBarClosestTime") }}
                  {{ localeDateFormat(item.VisibilityLayerTime) }}
                </v-row>
              </v-container>
            </v-tooltip>
            <v-menu bottom offset-y>
              <template v-slot:activator="{ on: menu, attrs }">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on: tooltip }">
                    <v-btn
                      x-large
                      :color="isSnapped(item.Name)"
                      v-bind="attrs"
                      v-on="{ ...tooltip, ...menu }"
                      icon
                      :disabled="isAnimating"
                      hide-details
                      class="style-selector"
                    >
                      <v-icon> mdi-palette </v-icon>
                    </v-btn>
                  </template>
                  <span>{{ $t("layerStyle") }}</span>
                </v-tooltip>
              </template>

              <v-list class="style-list">
                <v-list-item
                  v-for="(style, index) in item.Style"
                  :key="index"
                  @click="changeStyleHandler(item, style)"
                >
                  <v-list-item-title>
                    {{ style.Name }}
                    <img :src="style.LegendURL" class="d-block" />
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
            <v-tooltip class="remove-layer-tooltip" bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  x-large
                  :color="isSnapped(item.Name)"
                  icon
                  v-bind="attrs"
                  v-on="on"
                  @click="removeLayerHandler(item, index)"
                  :disabled="isAnimating"
                >
                  <v-icon> mdi-close </v-icon>
                </v-btn>
              </template>
              <span>{{ $t("LayerBarRemoveTooltip") }}</span>
            </v-tooltip>
          </v-col>
        </v-row>
        <v-divider v-if="numLayers - 1 !== index"></v-divider>
      </v-list-item-content>
      <v-divider vertical class="ml-3"></v-divider>
      <v-list-item-action class="mx-2">
        <v-btn :disabled="index === 0 || isAnimating" @click="up(index)" icon>
          <v-icon v-if="index !== 0"> mdi-arrow-up </v-icon>
        </v-btn>
        <v-btn
          :disabled="index + 1 >= value.length || isAnimating"
          @click="down(index)"
          icon
        >
          <v-icon v-if="index + 1 < value.length"> mdi-arrow-down </v-icon>
        </v-btn>
      </v-list-item-action>
    </v-list-item>
  </transition-group>
</template>

<script>
import { DateTime } from "luxon";
import { mapGetters, mapState } from "vuex";
import parseDuration from "../assets/parseHelper";

export default {
  mounted() {
    this.$root.$on("removeLayerControls", this.removeLayerHandler);
    this.$root.$on("setIndexOOB", this.setIndexOOBHandler);
    this.$root.$on("setCurrentTime", this.setCurrentTime);
    this.$root.$on("refreshExpired", this.updateExpired);
  },
  props: {
    value: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    up(index) {
      const newValue = [...this.value];
      const oldZIndexAtIndex = this.value[index].ZIndex;
      newValue[index] = this.value[index - 1];
      newValue[index - 1] = this.value[index];
      newValue[index].ZIndex = oldZIndexAtIndex;
      newValue[index - 1].ZIndex = oldZIndexAtIndex + 1;
      this.setZIndexHandler(newValue[index].Name);
      this.setZIndexHandler(newValue[index - 1].Name);
      this.$emit("input", newValue);
    },
    down(index) {
      const newValue = [...this.value];
      const oldZIndexAtIndex = this.value[index].ZIndex;
      newValue[index] = this.value[index + 1];
      newValue[index + 1] = this.value[index];
      newValue[index].ZIndex = oldZIndexAtIndex;
      newValue[index + 1].ZIndex = oldZIndexAtIndex - 1;
      this.setZIndexHandler(newValue[index].Name);
      this.setZIndexHandler(newValue[index + 1].Name);
      this.$emit("input", newValue);
    },
    setOpacityHandler(layerName, newOpacity) {
      this.$root.$emit("setOpacity", layerName, newOpacity);
    },
    setZIndexHandler(layerName) {
      this.$root.$emit(
        "setZIndex",
        layerName,
        this.value.find((l) => {
          return l.Name === layerName;
        }).ZIndex
      );
    },
    setVisibleHandler(layerName) {
      this.value.find((l) => {
        return l.Name === layerName;
      }).Visible = !this.value.find((l) => {
        return l.Name === layerName;
      }).Visible;
      this.$root.$emit(
        "setVisibility",
        layerName,
        this.value.find((l) => {
          return l.Name === layerName;
        }).Visible
      );
    },
    updateExpired(layerName, newTriplet, newExtent) {
      let layer = this.value.find((l) => l.Name === layerName);
      layer.dateTriplet = newTriplet;
      layer.Extent = newExtent;
    },
    removeLayerHandler(removedLayer, index) {
      this.$store.dispatch("Layers/removeLayer", removedLayer.Name);
      this.$store.dispatch(
        "Layers/setOrderedLayers",
        this.getOrderedLayers.filter(
          (layerName) => layerName !== removedLayer.Name
        )
      );
      if (removedLayer.isTemporal) {
        let timestep = removedLayer.dateTriplet[2];
        this.$store.dispatch("Layers/removeTimestep", timestep);
        if (this.getMapTimeSettings.Step === timestep) {
          if (this.getFullTimestepsList.indexOf(timestep) === -1) {
            const timeLayers = this.getLayerList.filter((l) => l.isTemporal);
            if (timeLayers.length > 0) {
              var topmostTLayer;
              for (let i = 0; i < this.getOrderedLayers.length; i++) {
                const layer = this.getLayerList.find(
                  (l) => l.Name === this.getOrderedLayers[i]
                );
                if (layer.isTemporal) {
                  topmostTLayer = layer;
                  break;
                }
              }
              this.$root.$emit(
                "rangeSliderAdjust",
                topmostTLayer.dateTriplet[2]
              );
            } else if (this.getLayerList.length === 0) {
              const mapTimeSettings = {
                SnappedLayer: null,
                Step: null,
                DateIndex: null,
                Extent: null,
                MapLegendLayer: null,
              };
              this.$store.dispatch(
                "Layers/setMapTimeSettings",
                mapTimeSettings
              );
            } else {
              const mapTimeSettings = {
                SnappedLayer: null,
                Step: null,
                DateIndex: null,
                Extent: null,
                MapLegendLayer: this.getLayerList[0],
              };
              this.$store.dispatch(
                "Layers/setMapTimeSettings",
                mapTimeSettings
              );
            }
          } else {
            this.$root.$emit("rangeSliderAdjust", timestep);
          }
        }
      }
      this.$root.$emit("removeLayer", removedLayer.Name);
      const newValue = [
        ...this.value.slice(0, index),
        ...this.value.slice(index + 1),
      ];
      this.$emit("input", newValue);
    },
    changeStyleHandler(item, style) {
      if (
        this.getMapTimeSettings.MapLegendLayer !== null &&
        (this.getMapTimeSettings.MapLegendLayer.Name === item.Name ||
          this.getMapTimeSettings.Step === null)
      ) {
        this.$store.dispatch("Layers/setMapLegendLayer", {
          ...this.getLayerList.find((l) => l.Name === item.Name),
          currentStyle: style.Name,
        });
      }
      this.$root.$emit("changeStyle", style.Name, item.Name);
    },
    colorScheme(layer) {
      if (layer.layerIndexOOB && layer.Visible) {
        return "error";
      } else {
        return this.isSnapped(layer.Name);
      }
    },
    isSnapped(layerName) {
      if (this.getMapTimeSettings.SnappedLayer !== null) {
        return layerName === this.getMapTimeSettings.SnappedLayer.Name
          ? "primary"
          : "";
      } else {
        return "";
      }
    },
    setIndexOOBHandler(layerName, currentDate = null, closestDate = null) {
      let layer = this.value.find((l) => l.Name === layerName);
      if (currentDate === null) {
        layer.layerIndexOOB = false;
      } else {
        layer.layerIndexOOB = true;
        layer.VisibilityMapTime = currentDate;
        layer.VisibilityLayerTime = closestDate;
      }
    },
    setCurrentTime(layerName, currentDate) {
      let layer = this.value.find((l) => l.Name === layerName);
      layer.currentTime = currentDate;
    },
    capitalize(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    },
    localeDateFormat(dateIn) {
      if (this.getTimeFormat === false) {
        return dateIn.toISOString().replace(":00.000", "");
      }
      if (this.getTimeFormat === true) {
        const locale = this.$i18n.locale === "fr" ? "fr-ca" : this.$i18n.locale;
        const dateFormatted = this.capitalize(
          DateTime.fromJSDate(dateIn)
            .setLocale(locale)
            .toLocaleString(DateTime.DATETIME_FULL)
        );
        return dateFormatted;
      }
    },
    selectIcon(layer) {
      if (!layer.Visible) {
        return "mdi-eye-off";
      } else if (!layer.layerIndexOOB) {
        return "mdi-eye";
      } else {
        return "mdi-eye-remove";
      }
    },
    snapLayerToAnimation(layerName) {
      if (
        this.getMapTimeSettings.SnappedLayer === null ||
        layerName !== this.getMapTimeSettings.SnappedLayer.Name
      ) {
        const layer = this.getLayerList.find((l) => l.Name === layerName);
        var extent;
        var dateIndex;
        if (this.getMapTimeSettings.Step === layer.dateTriplet[2]) {
          extent = this.getMapTimeSettings.Extent;
          dateIndex = this.findLayerIndex(
            extent[this.getMapTimeSettings.DateIndex],
            layer.extentDateArray,
            layer.dateTriplet[2]
          );
          if (dateIndex < 0) {
            dateIndex = this.findLayerIndex(
              layer.default_time,
              extent,
              layer.dateTriplet[2]
            );
          } else {
            dateIndex = this.getMapTimeSettings.DateIndex;
          }
          const mapTimeSettings = {
            SnappedLayer: layer,
            Step: layer.dateTriplet[2],
            DateIndex: dateIndex,
            Extent: extent,
            MapLegendLayer: this.getMapTimeSettings.MapLegendLayer,
          };
          this.$store.dispatch("Layers/setMapTimeSettings", mapTimeSettings);
          const first = this.findLayerIndex(
            layer.extentDateArray[0],
            extent,
            layer.dateTriplet[2]
          );
          const last = this.findLayerIndex(
            layer.extentDateArray[layer.extentDateArray.length - 1],
            extent,
            layer.dateTriplet[2]
          );
          this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
        } else {
          this.$root.$emit("rangeSliderAdjust", layer.dateTriplet[2], layer);
        }
      }
    },
    findLayerIndex(date, layerDateArr, step) {
      let start = 0;
      let end = layerDateArr.length - 1;
      if (date <= layerDateArr[start]) {
        if (date < layerDateArr[start]) {
          return -1;
        } else {
          return 0;
        }
      } else if (date >= layerDateArr[end]) {
        if (date >= parseDuration(step).add(layerDateArr[end])) {
          return -2;
        } else {
          return end;
        }
      }
      while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        // If date is found
        if (layerDateArr[mid].getTime() === date.getTime()) return mid;
        else if (layerDateArr[mid] < date) start = mid + 1;
        else end = mid - 1;
      }
      return end;
    },
  },
  computed: {
    ...mapGetters("Layers", [
      "getLayerList",
      "getMapTimeSettings",
      "getOrderedLayers",
      "getTimeFormat",
      "getFullTimestepsList",
    ]),
    ...mapState("Layers", ["isAnimating"]),
    numLayers() {
      return this.value.length;
    },
  },
};
</script>

<style scoped>
.style-list {
  max-height: 300px;
  overflow-y: auto;
}
.list-enter,
.list-leave-to {
  opacity: 0;
}
.list-enter-active,
.list-leave-active {
  transition: opacity 0.25s ease;
}
.list-move {
  transition: transform 0.25s ease-out;
}
.style-selector {
  max-width: 600px;
}
</style>
