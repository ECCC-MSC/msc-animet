<template>
  <div id="animation-rect"></div>
</template>

<script>
import canvasTxt from "canvas-txt";
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mounted() {
    this.$root.$on("calcFooterPreview", this.getInfoCanvas);
  },
  beforeDestroy() {
    this.$root.$off("calcFooterPreview", this.getInfoCanvas);
  },
  mixins: [datetimeManipulations],
  methods: {
    getDateCanvas() {
      let outputDateCanvas = document.createElement("canvas");
      let ctx = outputDateCanvas.getContext("2d");

      let dateFont = 16;
      if (this.getCurrentResolution === "1080p") {
        canvasTxt.fontSize = 26;
      } else {
        canvasTxt.fontSize = 22;
        dateFont = 12;
      }
      ctx.font = canvasTxt.fontSize + "px sans-serif";

      if (
        this.getMapTimeSettings.Step === "P1Y" ||
        this.getMapTimeSettings.Step === "P1M"
      ) {
        let dateLabelForMeasurement;
        if (this.getMapTimeSettings.Step === "P1Y") {
          dateLabelForMeasurement = "2222";
        } else {
          dateLabelForMeasurement = "September 2222";
        }
        let metrics = ctx.measureText(dateLabelForMeasurement);

        let height = this.getCurrentResolution === "1080p" ? 34 : 30;
        let width = metrics.width + 12;
        return [width, height];
      } else {
        const [dateLabel, timeLabel] = this.localeDateFormatAnimation(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          this.getMapTimeSettings.Step
        );
        let timeMetrics = ctx.measureText(timeLabel);

        canvasTxt.fontSize = dateFont;
        ctx.font = canvasTxt.fontSize + "px sans-serif";
        let dateMetrics = ctx.measureText(dateLabel);

        let height = this.getCurrentResolution === "1080p" ? 54 : 50;
        let width =
          timeMetrics.width >= dateMetrics.width
            ? timeMetrics.width + 16
            : dateMetrics.width + 16;
        return [width, height];
      }
    },
    getInfoCanvas() {
      if (
        this.$mapLayers.arr.length !== 0 &&
        this.getMapTimeSettings.Extent !== null
      ) {
        this.$root.$emit("setAnimationTitle");
        let infoCanvas = document.createElement("canvas");
        let ctx = infoCanvas.getContext("2d");
        let mapWidth = this.getCurrentAspect[this.getCurrentResolution].width;
        let ctx_w = mapWidth;

        let visibleLayers = this.$mapLayers.arr.filter((l) => {
          return l.get("layerVisibilityOn");
        });
        let isLayerListShown = !(
          visibleLayers.length === 1 &&
          this.animationTitle === this.$t(visibleLayers[0].get("layerName"))
        );
        // Must be divisible by 2 otherwise encoder.initialize() will fail
        let ctx_h = 40;

        let metrics;
        let baseFont = 18;
        let minFont = 12;
        if (mapWidth < 1080) {
          baseFont = 13;
          minFont = 10;
        }
        const modelRuns = this.getModelRuns();
        const numModelRuns = modelRuns.filter((mr) => {
          return mr !== "";
        }).length;
        if (isLayerListShown) {
          ctx_h = 0;
          for (let i = visibleLayers.length - 1; i >= 0; i--) {
            let layerTitle = `• ${this.$t(visibleLayers[i].get("layerName"))}`;
            let fontSize = baseFont;
            ctx.font = fontSize + "px sans-serif";
            metrics = ctx.measureText(layerTitle);
            while (metrics.width > mapWidth - 320 && fontSize > minFont) {
              fontSize -= 1;
              ctx.font = fontSize + "px sans-serif";
              metrics = ctx.measureText(layerTitle);
            }
            ctx_h += baseFont + 8;
          }
          // Must be divisible by 2 otherwise encoder.initialize() will fail
          ctx_h = 2 * Math.ceil(ctx_h / 2);
          if (ctx_h < 40) ctx_h = 40;
        }
        let animetOffset = 0;
        if (!isLayerListShown) {
        } else if (
          !this.$mapCanvas.mapObj.getLayers().getArray()[0].get("visible")
        ) {
          if (mapWidth < 1080) {
            animetOffset = 21;
          } else {
            animetOffset = 23;
          }
        } else {
          if (mapWidth < 1080) {
            animetOffset = 30;
          } else {
            animetOffset = 34;
          }
        }

        let animetAttr = this.$t("MadeWithAniMet");
        if (mapWidth < 1080) {
          canvasTxt.fontSize = 13;
        } else {
          canvasTxt.fontSize = 15;
        }
        canvasTxt.align = "left";
        ctx.font = canvasTxt.fontSize + "px sans-serif";
        metrics = ctx.measureText(animetAttr);

        if (numModelRuns !== 0 && isLayerListShown) {
          let minHeight;
          if (numModelRuns === 1) {
            minHeight = baseFont + animetOffset;
          } else {
            const lastMRIndex = modelRuns.findLastIndex((mr) => mr !== "");
            minHeight = (lastMRIndex + 1) * (baseFont + 8) + animetOffset - 6;
          }
          ctx_h = ctx_h >= minHeight ? ctx_h : minHeight;
        } else if (!isLayerListShown && numModelRuns === 0) {
          if (
            !this.$mapCanvas.mapObj.getLayers().getArray()[0].get("visible")
          ) {
            ctx_h = 24;
          }
          ctx_w = metrics.width + 12;
        } else if (
          (numModelRuns === 0 && isLayerListShown) ||
          (numModelRuns !== 0 && !isLayerListShown)
        ) {
          if (
            !this.$mapCanvas.mapObj.getLayers().getArray()[0].get("visible")
          ) {
            ctx_h = 24;
          }
        }
        let outputHeaderCanvas = 50;
        if (mapWidth < 1080) {
          outputHeaderCanvas = 30;
        }
        this.setHeaderFooterPreviewHeight(
          outputHeaderCanvas,
          ctx_w,
          ctx_h,
          mapWidth
        );
        if (
          document.getElementById("animation-rect").style.display === "block"
        ) {
          this.$root.$emit("checkIntersect");
        }
      }
    },
    getModelRuns() {
      let modelRuns = [];
      let visibleLayers = this.$mapLayers.arr
        .filter((l) => {
          return l.get("layerVisibilityOn");
        })
        .reverse();
      const numVisibleLayers = visibleLayers.length;
      for (let i = 0; i < numVisibleLayers; i++) {
        if (
          visibleLayers[i].get("layerCurrentMR") !== null &&
          visibleLayers[i].get("layerCurrentMR") !== undefined
        ) {
          modelRuns.push("date");
        } else {
          modelRuns.push("");
        }
      }
      return modelRuns;
    },
    setHeaderFooterPreviewHeight(headerH, footerW, footerH, mapW) {
      const percentageFooter =
        (footerH / this.getCurrentAspect[this.getCurrentResolution].height) *
        100;
      const invPercentageFooter = 100.0 - percentageFooter;
      const percentageHeader =
        (headerH / this.getCurrentAspect[this.getCurrentResolution].height) *
        100;

      let styleSheet = document.styleSheets[0];
      const percentageTopDate =
        ((headerH + 10) /
          this.getCurrentAspect[this.getCurrentResolution].height) *
        100;
      const percentageRightDate =
        (10 / this.getCurrentAspect[this.getCurrentResolution].width) * 100;
      let [dateWidth, dateHeight] = this.getDateCanvas();
      const percentageWidthDate =
        (dateWidth / this.getCurrentAspect[this.getCurrentResolution].width) *
        100;
      const percentageHeightDate =
        (dateHeight / this.getCurrentAspect[this.getCurrentResolution].height) *
        100;
      const footerRule = `#animation-rect::after { top: ${percentageTopDate}% !important; right: ${percentageRightDate}% !important; width: ${percentageWidthDate}% !important;  height: ${percentageHeightDate}% !important; }`;

      styleSheet.insertRule(footerRule, styleSheet.cssRules.length);

      if (footerW !== mapW) {
        document.getElementById(
          "animation-rect"
        ).style.background = `linear-gradient(to bottom, rgba(255, 255, 255, 0.75) ${percentageHeader}%, transparent ${percentageHeader}%, transparent 0%)`;
        const percFooterWidth = (footerW / mapW) * 100;
        const headerRule = `#animation-rect::before { width: ${percFooterWidth}% !important; height: ${percentageFooter}% !important; }`;
        styleSheet.insertRule(headerRule, styleSheet.cssRules.length);
      } else {
        document.getElementById(
          "animation-rect"
        ).style.background = `linear-gradient(to bottom, rgba(255, 255, 255, 0.75) ${percentageHeader}%, transparent ${percentageHeader}%, transparent ${invPercentageFooter}%, rgba(255, 255, 255, 0.75) ${invPercentageFooter}%)`;
        const headerRule = `#animation-rect::before { width: 0 !important; height: 0 !important; }`;
        styleSheet.insertRule(headerRule, styleSheet.cssRules.length);
      }
    },
  },
  computed: {
    ...mapGetters("Layers", [
      "getCurrentAspect",
      "getCurrentResolution",
      "getMapTimeSettings",
      "getModelRunMessages",
    ]),
    ...mapState("Layers", ["animationTitle"]),
  },
};
</script>

<style scoped>
#animation-rect {
  display: none;
  width: 100vw;
  height: 56.25vw; /* height:width ratio = 9/16 = .5625  */
  border: 4px solid red;
  max-height: 100vh;
  max-width: 177.78vh; /* 16/9 = 1.778 */
  margin: auto;
  position: absolute;
  top: 0;
  bottom: 0; /* vertical center */
  left: 0;
  right: 0; /* horizontal center */
  z-index: 1;
  pointer-events: none !important;
}
#animation-rect::before {
  content: "";
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  background-color: rgba(255, 255, 255, 0.75);
}
#animation-rect::after {
  content: "";
  position: absolute;
  top: 60px;
  right: 10px;
  width: 20px;
  height: 10px;
  background-color: rgba(255, 255, 255, 0.75);
}
</style>
