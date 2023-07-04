import { DateTime } from "luxon";
import { mapGetters } from "vuex";
import parseDuration from "../assets/parseHelper";

export default {
  methods: {
    capitalize(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    },
    changeMapTime(timestep, snappedLayer = null, dateIndex = null) {
      const timeLayers = this.$mapLayers.arr.filter((l) => {
        return l.get("layerTimeStep") === timestep && l.get("layerIsTemporal");
      });
      let arrayCombine = timeLayers[0].get("layerDateArray");
      if (timeLayers.length > 1) {
        let layerDateArrays = [];
        for (let i = 0; i < timeLayers.length; i++) {
          layerDateArrays.push(timeLayers[i].get("layerDateArray"));
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
      if (dateIndex === null) {
        if (snappedLayer !== null) {
          dateIndex = this.findLayerIndex(
            snappedLayer.get("layerDefaultTime"),
            arrayCombine,
            snappedLayer.get("layerTimeStep")
          );
        } else {
          dateIndex = this.findLayerIndex(
            timeLayers[0].get("layerDefaultTime"),
            arrayCombine,
            timeLayers[0].get("layerTimeStep")
          );
        }
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
      }
      if (snappedLayer === null) {
        let currentSnappedLayer = timeLayers.find(
          (l) => l.get("layerName") === this.getMapTimeSettings.SnappedLayer
        );
        if (currentSnappedLayer !== undefined) {
          snappedLayer = currentSnappedLayer;
        }
      }
      const mapTimeSettings = {
        SnappedLayer:
          snappedLayer !== null ? snappedLayer.get("layerName") : null,
        Step: timestep,
        DateIndex: dateIndex,
        Extent: arrayCombine,
      };
      this.$store.dispatch("Layers/setMapTimeSettings", mapTimeSettings);
      if (snappedLayer !== null) {
        const first = this.findLayerIndex(
          snappedLayer.get("layerStartTime"),
          arrayCombine,
          snappedLayer.get("layerTimeStep")
        );
        const last = this.findLayerIndex(
          snappedLayer.get("layerEndTime"),
          arrayCombine,
          snappedLayer.get("layerTimeStep")
        );
        this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
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
    getDateArray(dateRange) {
      let dateArray = new Array();
      if (dateRange.includes("/")) {
        var [startDateStr, endDateStr, interval] = dateRange.split("/");
        var format;
        if (/^\d{4}-([0]\d|1[0-2])$/.test(startDateStr)) {
          format = "month";
        } else if (/^\d{4}$/.test(startDateStr)) {
          format = "year";
        } else {
          format = "ISO";
        }
        let startDate = new Date(startDateStr);
        let endDate = new Date(endDateStr);
        let nextDate = parseDuration(interval).add;

        let date = new Date(startDate);

        while (date < endDate) {
          dateArray.push(date);
          date = nextDate(date);
        }
        dateArray.push(date);
      } else {
        dateRange
          .split(",")
          .forEach((dateString) => dateArray.push(new Date(dateString)));
      }
      return [dateArray, format];
    },
    getProperDateString(date, dateFormat) {
      if (dateFormat === "year") {
        return date.toISOString().split("-")[0];
      } else if (dateFormat === "month") {
        let dateSplit = date.toISOString().split("-");
        let year = dateSplit[0];
        let month = dateSplit[1];
        return year + "-" + month;
      }
      return date.toISOString().split(".")[0] + "Z";
    },
    localeDateFormat(dateIn, interval = null) {
      if (interval === "P1Y") {
        return dateIn.toISOString().split("-")[0];
      } else if (interval === "P1M") {
        const locale = this.$i18n.locale === "fr" ? "fr-CA" : this.$i18n.locale;
        return DateTime.fromJSDate(dateIn)
          .toUTC()
          .setLocale(locale)
          .toLocaleString({ year: "numeric", month: "long" });
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
  },
  computed: {
    ...mapGetters("Layers", ["getTimeFormat"]),
  },
};
