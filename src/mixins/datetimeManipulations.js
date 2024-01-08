import { DateTime } from "luxon";
import { mapGetters } from "vuex";
import parseDuration from "../assets/parseHelper";

export default {
  methods: {
    capitalize(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    },
    changeMapTime(timestep, snappedLayer = null) {
      const timeLayers = this.$mapLayers.arr.filter((l) => {
        return l.get("layerIsTemporal") && l.get("layerTimeStep") === timestep;
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
      let dateIndex;
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
        } else if (currentDateIndex === -1) {
          dateIndex = 0;
        } else if (currentDateIndex === -2) {
          dateIndex = arrayCombine.length - 1;
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
        DateIndex:
          dateIndex >= 0
            ? dateIndex
            : dateIndex === -1
            ? 0
            : arrayCombine.length - 1,
        Extent: arrayCombine,
      };
      this.$store.dispatch("Layers/setMapTimeSettings", mapTimeSettings);
      this.$root.$emit("updatePermalink");
    },
    createTimeLayerConfigs(Dimension_time) {
      let [dateArrayFormat, Step] = this.findFormat(Dimension_time);
      if (dateArrayFormat === null) {
        return null;
      }
      let configs = [];
      if (dateArrayFormat.every((element) => Array.isArray(element))) {
        for (let i = 0; i < dateArrayFormat.length; i++) {
          configs.push({
            layerDateArray: dateArrayFormat[i][0],
            layerDateFormat: dateArrayFormat[i][1],
            layerStartTime: dateArrayFormat[i][0][0],
            layerEndTime:
              dateArrayFormat[i][0][dateArrayFormat[i][0].length - 1],
            layerTimeStep: Step[i] === "PT0H" ? "PT1H" : Step[i],
            layerTrueTimeStep: Step[i],
          });
        }
      } else {
        let trueInterval = null;
        if (Step === null) {
          if (dateArrayFormat[1] === "year") {
            Step = "P1Y";
          } else if (dateArrayFormat[1] === "month") {
            Step = "P1M";
          } else {
            Step = "PT1H";
          }
        } else if (Step === "PT0H") {
          trueInterval = "PT0H";
          Step = "PT1H";
        } else {
          trueInterval = Step;
        }
        configs.push({
          layerDateArray: dateArrayFormat[0],
          layerDateFormat: dateArrayFormat[1],
          layerStartTime: dateArrayFormat[0][0],
          layerEndTime: dateArrayFormat[0][dateArrayFormat[0].length - 1],
          layerTimeStep: Step,
          layerTrueTimeStep: trueInterval,
        });
      }
      return configs;
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
        let dateCeiling = parseDuration(step === "PT0H" ? "PT1H" : step).add(
          layerDateArr[mid]
        );
        // If date is found
        if (date >= layerDateArr[mid] && date < dateCeiling) return mid;
        else if (date >= dateCeiling) start = mid + 1;
        else end = mid - 1;
      }
      return -3;
    },
    findFormat(dateRange) {
      // WMS standard says whitespaces are allowed, remove them
      dateRange = dateRange.replace(/\s/g, "");
      // only 1 case will return true, so switch with "true" will give the correct format
      switch (true) {
        case /^[^,/]*$/.test(dateRange):
        case /^[^/]*,[^/]*$/.test(dateRange): {
          return [this.getNullIntervalDateArray(dateRange.split(",")), null];
        }
        case /^[^,]*\/[^,]*\/[^,]*$/.test(dateRange): {
          let [startDateStr, endDateStr, interval] = dateRange.split("/");
          return [
            this.getDateArray(startDateStr, endDateStr, interval),
            interval,
          ];
        }
        case /^[^,]*\/[^,]*\/[^,]*(?:,[^,]*\/[^,]*\/[^,]*)*$/.test(dateRange): {
          let dateArrays = [];
          let intervals = [];
          let dateRanges = dateRange.split(",");
          for (let i = 0; i < dateRanges.length; i++) {
            let [startDateStr, endDateStr, interval] = dateRanges[i].split("/");
            dateArrays.push(
              this.getDateArray(startDateStr, endDateStr, interval)
            );
            intervals.push(interval);
          }
          return [dateArrays, intervals];
        }
        default:
          return [null, null];
      }
    },
    getDateArray(startDateStr, endDateStr, interval) {
      let dateArray = new Array();
      let format = "ISO";
      if (/^\d{4}-([0]\d|1[0-2])$/.test(startDateStr)) {
        format = "month";
      } else if (/^\d{4}$/.test(startDateStr)) {
        format = "year";
      }
      let startDate = new Date(startDateStr);
      let endDate = new Date(endDateStr);
      let nextDate = parseDuration(interval === "PT0H" ? "PT1H" : interval).add;

      let date = new Date(startDate);

      while (date < endDate) {
        dateArray.push(date);
        date = nextDate(date);
      }
      dateArray.push(date);
      return [dateArray, format];
    },
    getNullIntervalDateArray(dateRange) {
      let dateArray = new Array();
      dateRange.forEach((dateString) => dateArray.push(new Date(dateString)));
      let format = "ISO";
      if (/^\d{4}-([0]\d|1[0-2])$/.test(dateRange[0])) {
        format = "month";
      } else if (/^\d{4}$/.test(dateRange[0])) {
        format = "year";
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
    getCustomDateFormat(format) {
      let customFormat = {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      };
      if (this.getTimeFormat === false) {
        customFormat.hourCycle = "h23";
        delete customFormat.timeZoneName;
      } else if (format === "DATETIME_SHORT") {
        delete customFormat.timeZoneName;
      }
      if (format === "DATETIME_MED") {
        customFormat.month = "short";
      } else if (format === "DATETIME_SHORT") {
        delete customFormat.weekday;
        customFormat.month = "numeric";
      }
      return customFormat;
    },
    localeDateFormat(dateIn, interval = null, format = "DATETIME_FULL") {
      const locale =
        this.$countryCode === null
          ? this.$i18n.locale
          : `${this.$i18n.locale}-${this.$countryCode}`;
      if (interval === "P1Y") {
        return dateIn.toISOString().split("-")[0];
      } else if (interval === "P1M") {
        return DateTime.fromJSDate(dateIn)
          .toUTC()
          .setLocale(locale)
          .toLocaleString({ year: "numeric", month: "long" });
      } else {
        const customFormat = this.getCustomDateFormat(format);
        if (this.getTimeFormat === false) {
          if (format === "DATETIME_SHORT") {
            return dateIn.toISOString().replace(":00.000", "");
          } else {
            return this.capitalize(
              DateTime.fromJSDate(dateIn)
                .toUTC()
                .setLocale(locale)
                .toLocaleString(customFormat) + "Z"
            ).replace(" h ", ":");
          }
        } else if (this.getTimeFormat === true) {
          return this.capitalize(
            DateTime.fromJSDate(dateIn)
              .setLocale(locale)
              .toLocaleString(customFormat)
          ).replace(" h ", ":");
        }
      }
    },
    localeDateFormatAnimation(dateIn) {
      const locale =
        this.$countryCode === null
          ? this.$i18n.locale
          : `${this.$i18n.locale}-${this.$countryCode}`;
      const customFormat = this.getCustomDateFormat("DATETIME_FULL");
      let dateFormat = {
        year: customFormat.year,
        month: customFormat.month,
        day: customFormat.day,
      };
      let timeFormat = {
        hour: customFormat.hour,
        minute: customFormat.minute,
        timeZoneName: customFormat.timeZoneName,
      };
      if (customFormat.hasOwnProperty("hourCycle")) {
        timeFormat.hourCycle = customFormat.hourCycle;
      } else {
        timeFormat.timeZoneName = customFormat.timeZoneName;
      }
      if (this.getTimeFormat === false) {
        timeFormat.weekday = customFormat.weekday;
        const date = this.capitalize(
          DateTime.fromJSDate(dateIn)
            .toUTC()
            .setLocale(locale)
            .toLocaleString(dateFormat)
        );
        const time = this.capitalize(
          DateTime.fromJSDate(dateIn)
            .toUTC()
            .setLocale(locale)
            .toLocaleString(timeFormat) + "Z"
        ).replace(" h ", ":");
        return [date, time];
      } else if (this.getTimeFormat === true) {
        dateFormat.weekday = customFormat.weekday;
        const date = this.capitalize(
          DateTime.fromJSDate(dateIn)
            .setLocale(locale)
            .toLocaleString(dateFormat)
        );
        const time = this.capitalize(
          DateTime.fromJSDate(dateIn)
            .setLocale(locale)
            .toLocaleString(timeFormat)
        ).replace(" h ", ":");
        return [date, time];
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getTimeFormat"]),
  },
};
