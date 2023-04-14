<template>
  <v-row class="mr-12">
    <v-col cols="2" v-if="this.getMapTimeSettings.Step !== null">
      <v-select
        :label="$t('timestepsDropdown')"
        v-model="selection"
        :items="getUniqueTimestepsList"
        :disabled="getUniqueTimestepsList === [] || isAnimating"
        @input="changeMapInterval(selection)"
      >
        <template v-slot:item="{ item }">
          {{ formatDuration(item) }}
        </template>
        <template v-slot:selection="{ item }">
          {{ formatDuration(item) }}
        </template>
      </v-select>
    </v-col>
    <v-col cols="10">
      <v-row
        justify="space-between"
        v-if="this.getMapTimeSettings.Step !== null"
      >
        <v-col class="text-left">{{
          formatDate(datetimeRangeSlider[0])
        }}</v-col>
        <v-col class="text-right">{{
          formatDate(datetimeRangeSlider[1])
        }}</v-col>
      </v-row>
      <v-row v-if="this.getMapTimeSettings.Step !== null">
        <v-range-slider
          :disabled="isAnimating"
          :min="0"
          :max="getMapTimeSettings.Extent.length - 1"
          v-model="datetimeRangeSlider"
          :rules="[rangeValuesNotSame]"
          hide-details
          ticks
          @end="changeDisplayedTime"
        ></v-range-slider>
      </v-row>
    </v-col>
  </v-row>
</template>

<script>
import { DateTime, Duration } from "luxon";
import { mapGetters, mapState } from "vuex";
import parseDuration from "../assets/parseHelper";

export default {
  mounted() {
    this.$root.$on("rangeSliderAdjust", this.changeMapTime);
  },
  data() {
    return {
      selection: null,
    };
  },
  methods: {
    changeMapInterval(timestep) {
      this.changeMapTime(timestep);
      this.$root.$emit("adjustDefaultTitle");
    },
    changeMapTime(timestep, snappedLayer = null) {
      const timeLayers = this.getLayerList.filter(
        (l) => l.isTemporal && l.dateTriplet[2] === timestep
      );
      let arrayCombine = timeLayers[0].extentDateArray;
      if (timeLayers.length > 1) {
        let layerDateArrays = [];
        for (let i = 0; i < timeLayers.length; i++) {
          layerDateArrays.push(timeLayers[i].extentDateArray);
        }

        for (let i = 1; i < layerDateArrays.length; i++) {
          // Cases covered:
          //  Both extents the same, both same start but not same end
          if (arrayCombine[0].getTime() === layerDateArrays[i][0].getTime()) {
            if (arrayCombine.length < layerDateArrays[i].length) {
              arrayCombine = layerDateArrays[i].slice(0);
            }
            // Cases covered:
            //  Both same end but not same start
          } else if (
            arrayCombine[arrayCombine.length - 1].getTime() ===
            layerDateArrays[i][layerDateArrays[i].length - 1].getTime()
          ) {
            if (arrayCombine.length < layerDateArrays[i].length) {
              arrayCombine = layerDateArrays[i].slice(0);
            }
          } else {
            let j = 0;
            let k = 0;
            let tempArray = [];
            while (j < arrayCombine.length && k < layerDateArrays[i].length) {
              if (
                arrayCombine[j].getTime() === layerDateArrays[i][k].getTime()
              ) {
                tempArray.push(arrayCombine[j]);
                j++;
                k++;
              } else if (arrayCombine[j] < layerDateArrays[i][k]) {
                tempArray.push(arrayCombine[j]);
                j++;
              } else {
                tempArray.push(layerDateArrays[i][k]);
                k++;
              }
            }
            if (j === arrayCombine.length) {
              tempArray = tempArray.concat(layerDateArrays[i].slice(k));
            } else {
              tempArray = tempArray.concat(arrayCombine.slice(j));
            }
            arrayCombine = tempArray.slice(0);
          }
        }
      }

      let dateIndex = this.findLayerIndex(
        timeLayers[0].default_time,
        timeLayers[0].extentDateArray,
        timeLayers[0].dateTriplet[2]
      );
      if (timestep === this.getMapTimeSettings.Step) {
        const currentDateIndex = this.findLayerIndex(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          arrayCombine,
          timestep
        );
        if (currentDateIndex >= 0) {
          dateIndex = currentDateIndex;
        }
      }
      if (snappedLayer === null) {
        if (this.getMapTimeSettings.SnappedLayer !== null) {
          if (
            timeLayers.filter(
              (l) => l.Name === this.getMapTimeSettings.SnappedLayer.Name
            ).length !== 0
          ) {
            snappedLayer = this.getMapTimeSettings.SnappedLayer;
          }
        }
      }
      const mapTimeSettings = {
        SnappedLayer: snappedLayer,
        Step: timestep,
        DateIndex: dateIndex,
        Extent: arrayCombine,
        MapLegendLayer:
          this.getLayerList.filter(
            (l) => l.Name === this.getMapTimeSettings.MapLegendLayer.Name
          ).length !== 0
            ? this.getMapTimeSettings.MapLegendLayer
            : timeLayers[0],
      };
      this.$store.dispatch("Layers/setMapTimeSettings", mapTimeSettings);
      if (snappedLayer !== null) {
        const first = this.findLayerIndex(
          snappedLayer.extentDateArray[0],
          arrayCombine,
          snappedLayer.dateTriplet[2]
        );
        const last = this.findLayerIndex(
          snappedLayer.extentDateArray[snappedLayer.extentDateArray.length - 1],
          arrayCombine,
          snappedLayer.dateTriplet[2]
        );
        this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
      }
    },
    capitalize(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    },
    formatDuration(timestep) {
      const locale = this.$i18n.locale === "fr" ? "fr-ca" : this.$i18n.locale;
      let l = Duration.fromISO(timestep);
      l.loc.locale = locale;
      l.loc.intl = locale;
      return l.toHuman();
    },
    formatDate(index) {
      if (index > this.getMapTimeSettings.Extent.length - 1) {
        index = this.getMapTimeSettings.Extent.length - 1;
      } else if (index < 0) {
        index = 0;
      }
      return this.localeDateFormat(
        this.getMapTimeSettings.Extent[index],
        this.getMapTimeSettings.Step
      );
    },
    localeDateFormat(dateIn, interval = null) {
      if (interval === "P1Y") {
        return this.getProperDateString(dateIn, interval);
      } else if (interval === "P1M") {
        if (this.getTimeFormat === false) {
          return this.getProperDateString(dateIn, interval);
        } else if (this.getTimeFormat === true) {
          const locale =
            this.$i18n.locale === "fr" ? "fr-CA" : this.$i18n.locale;
          return DateTime.fromJSDate(dateIn)
            .setLocale(locale)
            .toLocaleString({ year: "numeric", month: "long" });
        }
      } else {
        if (this.getTimeFormat === false) {
          return dateIn.toISOString().replace(":00.000", "");
        } else if (this.getTimeFormat === true) {
          const locale =
            this.$i18n.locale === "fr" ? "fr-CA" : this.$i18n.locale;
          return this.capitalize(
            DateTime.fromJSDate(dateIn)
              .setLocale(locale)
              .toLocaleString(DateTime.DATETIME_FULL)
          );
        }
      }
    },
    getProperDateString(date, timestep) {
      if (timestep === "P1Y") {
        return `${date.getFullYear()}`;
      } else if (timestep === "P1M") {
        let month = date.getMonth() + 1;
        if (month < 10) {
          month = "0" + month;
        }
        let year = date.getFullYear();
        return year + "-" + month;
      }
      return date.toISOString().split(".")[0] + "Z";
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
    rangeValuesNotSame(rangeInput) {
      return !(rangeInput[0] === rangeInput[1]);
    },
    changeDisplayedTime() {
      if (
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex] <
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[0]]
      ) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.datetimeRangeSlider[0]
        );
        this.$root.$emit("adjustMapTime");
      } else if (
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex] >
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[1]]
      ) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.datetimeRangeSlider[1]
        );
        this.$root.$emit("adjustMapTime");
      }
      if (this.getMapTimeSettings.SnappedLayer !== null) {
        this.$store.commit("Layers/setMapSnappedLayer", null);
      }
    },
  },
  watch: {
    getMapTimeSettings(newSettings, _) {
      if (newSettings.Step !== null) {
        this.selection = newSettings.Step;
      }
    },
  },
  computed: {
    ...mapGetters("Layers", [
      "getDatetimeRangeSlider",
      "getLayerList",
      "getMapTimeSettings",
      "getTimeFormat",
      "getUniqueTimestepsList",
    ]),
    ...mapState("Layers", ["isAnimating"]),
    datetimeRangeSlider: {
      get() {
        return this.getDatetimeRangeSlider;
      },
      set(dateRange) {
        this.$store.commit("Layers/setDatetimeRangeSlider", dateRange);
      },
    },
  },
};
</script>
