<template>
  <div>
    <v-tooltip top color="warning" :disabled="getMapTimeSettings.Step !== null">
      <template v-slot:activator="{ on }">
        <span v-on="on"
          ><!-- span wrap to enable tooltip on disabled btn -->
          <v-btn
            v-if="!isAnimating || playState === 'play'"
            :disabled="getMapTimeSettings.Step === null || playState === 'play'"
            block
            color="primary"
            @click="createMP4"
            class="text-none"
          >
            {{ $t("MP4CreateButtonLabel") }}
          </v-btn>
        </span>
      </template>
      <span>{{ $t("ErrorNoTimeLayer") }}</span>
    </v-tooltip>
    <div v-if="isAnimating && playState !== 'play'">
      <v-row>
        <v-col class="d-inline-flex">
          <v-progress-linear
            :value="MP4ProgressPercent"
            height="36"
            rounded
            class="mr-3"
          >
            <strong>{{ MP4ProgressPercent }} %</strong>
          </v-progress-linear>
          <v-btn
            outlined
            elevation="0"
            color="primary"
            @click="cancelAnimationCreation"
            class="text-none"
          >
            {{ $t("MP4CreateCancelAnimationCreation") }}
          </v-btn>
        </v-col>
      </v-row>
    </div>
    <v-snackbar v-model="notifyCancelAnimateResize" timeout="5000">
      {{ $t("MP4CreateNotifyCancelAnimation") }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="warning"
          text
          v-bind="attrs"
          @click="notifyCancelAnimateResize = false"
        >
          {{ $t("Close") }}
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import canvasTxt from "canvas-txt";
import OLImage from "ol/layer/Image";
import { mapGetters, mapState } from "vuex";

import * as HME from "h264-mp4-encoder";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mounted() {
    this.$root.$on("cancelAnimationCreation", this.cancelAnimationCreation);
    this.$root.$on("cancelExpired", this.handleCancelExpired);
    this.$root.$on("getExtent", this.getExtentHandler);
    this.$root.$on("localeChange", this.getModelRuns);
    this.$root.$on("modelRunChanged", this.getModelRuns);
    this.$root.$on("redoAnimation", this.createMP4Handler);
    this.$root.$on("restoreState", this.restoreState);
    this.$root.$on("timeLayerAdded", this.getModelRuns);
    this.$root.$on("timeLayerRemoved", this.getModelRuns);

    // cancel animation creations on window resize avoid Safari bug
    window.addEventListener("resize", this.cancelAnimationFromResize);
  },
  unmounted() {
    window.removeEventListener("resize", this.cancelAnimationFromResize);
  },
  beforeDestroy() {
    this.$root.$off("cancelAnimationCreation", this.cancelAnimationCreation);
    this.$root.$off("cancelExpired", this.handleCancelExpired);
    this.$root.$off("getExtent", this.getExtentHandler);
    this.$root.$off("localeChange", this.getModelRuns);
    this.$root.$off("modelRunChanged", this.getModelRuns);
    this.$root.$off("redoAnimation", this.createMP4Handler);
    this.$root.$off("restoreState", this.restoreState);
    this.$root.$off("timeLayerAdded", this.getModelRuns);
    this.$root.$off("timeLayerRemoved", this.getModelRuns);
  },
  mixins: [datetimeManipulations],
  props: ["map"],
  methods: {
    cancelAnimationCreation() {
      this.generating = false;
    },
    cancelAnimationFromResize() {
      if (this.isAnimating) {
        this.notifyCancelAnimateResize = true;
        this.cancelAnimationCreation();
      }
    },
    getExtentHandler() {
      this.getExtent();
      this.$store.dispatch("Layers/setOutputWH", [
        this.mapWidth,
        this.mapHeight,
      ]);
    },
    getExtent() {
      const extent = this.map.getView().calculateExtent();
      this.$store.dispatch("Layers/setExtent", extent);
    },
    getTimeTitleWidths(mapDivWidth) {
      if (mapDivWidth < 600) {
        return [280, 300];
      } else {
        return [mapDivWidth - 320, 300];
      }
    },
    getModelRuns() {
      let modelRuns = {};
      const timeLayers = this.$mapLayers.arr.filter((l) =>
        l.get("layerIsTemporal")
      );
      for (let i = 0; i < timeLayers.length; i++) {
        if (timeLayers[i].get("layerCurrentMR") !== null) {
          const refTime = timeLayers[i].get("layerCurrentMR");
          if (refTime in modelRuns) {
            modelRuns[refTime].push(timeLayers[i].get("layerName"));
          } else {
            modelRuns[refTime] = [timeLayers[i].get("layerName")];
          }
        }
      }
      if (Object.keys(modelRuns).length === 0) {
        this.modelRunMessage = null;
      } else if (Object.keys(modelRuns).length === 1) {
        this.modelRunMessage = [
          `${this.$t("ModelRun")}${this.$t("Colon")} ${this.localeDateFormat(
            new Date(Date.parse(Object.keys(modelRuns)[0]))
          )}`,
        ];
      } else {
        let message = [];
        for (const [key, values] of Object.entries(modelRuns)) {
          message.push(
            `${this.$t("ModelRun")}${this.$t("Colon")} ${this.localeDateFormat(
              new Date(Date.parse(key))
            )}`
          );
          for (let i = 0; i < values.length; i++) {
            message.push("  - " + values[i]);
          }
        }
        this.modelRunMessage = message;
      }
    },
    getAnimationDateTitle(interval) {
      const firstDate =
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[0]];
      if (interval === "P1Y") {
        return `${firstDate.toISOString().split("-")[0]}`;
      } else if (interval === "P1M") {
        let firstDateSplit = firstDate.toISOString().split("-");
        return `${firstDateSplit[0]}${firstDateSplit[1]}`;
      } else {
        return firstDate.toISOString().split(".")[0].replace(/[:-]/g, "") + "Z";
      }
    },
    async createMP4() {
      this.$root.$emit("setAnimationTitle");
      this.createMP4Handler();
      this.$store.dispatch(
        "Layers/setOutputDate",
        this.getAnimationDateTitle(this.getMapTimeSettings.Step)
      );
    },
    async createMP4Handler() {
      this.cancelExpired = false;
      this.$store.dispatch("Layers/setMP4URL", "null");
      this.$store.dispatch("Layers/setIsAnimating", true);
      this.generating = true;
      this.getExtent();
      this.evenSize();
      this.map.updateSize();
      let mapDiv = document.getElementById("map");
      this.$store.dispatch("Layers/setOutputWH", [
        this.mapWidth,
        this.mapHeight,
      ]);
      this.$store.dispatch(
        "Layers/setExportStyle",
        `max-width: ${this.mapWidth}px max-height: ${this.mapHeight}px width: 100% height: 100%`
      );
      mapDiv.style.resize = "none";
      this.map.getInteractions().forEach((x) => x.setActive(false));
      const mapWidthConst = this.mapWidth;
      const widths = this.getTimeTitleWidths(mapWidthConst);

      let visibleLayers = this.$mapLayers.arr.filter((l) => {
        return l.get("layerVisibilityOn") && l instanceof OLImage;
      });

      this.infoCanvas = this.getInfoCanvas(
        this.mapWidth,
        visibleLayers,
        widths,
        this.animationTitle
      );
      this.encoder = await HME.createH264MP4Encoder();
      this.encoder.width = mapDiv.offsetWidth;
      this.encoder.height =
        this.mapHeight + this.infoCanvas.height + this.outputHeader.height;
      this.encoder.frameRate = this.framesPerSecond;
      this.encoder.quantizationParameter = 30;
      this.encoder.initialize();

      const MP4Length =
        this.datetimeRangeSlider[1] - this.datetimeRangeSlider[0] + 1;
      let progressCounter = 1;
      const initialState = this.getMapTimeSettings.DateIndex;
      for (
        let i = this.datetimeRangeSlider[0];
        i <= this.datetimeRangeSlider[1];
        i++, progressCounter++
      ) {
        if (this.generating === false) {
          break;
        }
        if (this.generating === true) {
          this.$store.dispatch("Layers/setMapTimeIndex", i);
          await new Promise((resolve) =>
            this.map.once("rendercomplete", resolve)
          );
          if (this.cancelExpired) {
            this.cancelExpired = false;
            this.generating = false;
            return;
          }
          await this.composeCanvas(
            this.getMapTimeSettings.Extent[i],
            widths,
            this.encoder
          );
          this.$store.dispatch(
            "Layers/setMP4Percent",
            Math.round((progressCounter / MP4Length) * 100)
          );
        }
      }
      this.restoreState(initialState);
    },
    handleCancelExpired() {
      this.cancelExpired = true;
    },
    restoreState(initialState = null) {
      this.$store.dispatch(
        "Layers/setMapTimeIndex",
        initialState === null ? 0 : initialState
      );

      this.$store.dispatch("Layers/setMP4Percent", 0);
      this.$store.dispatch("Layers/setMP4CreateFlag", false);
      this.encoder.finalize();
      const uint8Array = this.encoder.FS.readFile(this.encoder.outputFilename);
      const animationBlob = new Blob([uint8Array], { type: "video/mp4" });
      this.$store.dispatch("Layers/setOutputSize", animationBlob.size);
      const mp4URL = URL.createObjectURL(animationBlob);
      this.encoder.delete();
      this.$store.dispatch("Layers/setMP4CreateFlag", true);
      this.$store.dispatch("Layers/setIsAnimating", false);
      if (this.generating) {
        this.$store.dispatch("Layers/setMP4URL", mp4URL);
      }
      this.map.getInteractions().forEach((x) => x.setActive(true)); // Enables all map interactions such as drag or zoom
      document.getElementById("map").style.resize = "both"; // Enables map div resizing
    },
    async composeCanvas(date, widths, encoder) {
      this.map.updateSize();
      const mapCnv = this.getMapCanvas();
      this.getActiveLegends.forEach((layerName) =>
        this.addLegend(
          mapCnv,
          document.getElementById(layerName),
          this.$mapLayers.arr
            .find((l) => l.get("layerName") === layerName)
            .get("legendColor")
        )
      );
      await this.updateInfoCanvas(date, widths);
      const composedCnv = await this.stitchCanvases(mapCnv);
      try {
        encoder.addFrameRgba(
          composedCnv
            .getContext("2d")
            .getImageData(0, 0, composedCnv.width, composedCnv.height).data
        );
      } catch (error) {
        console.error(
          "Crashed from addFrameRgba because the size of the Map was changed during animation creation."
        );
        this.cancelAnimationCreation();
      }
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    },
    addLegend(mapCanvas, mapLegend, rgbObject) {
      const context = mapCanvas.getContext("2d");
      context.drawImage(
        mapLegend,
        mapLegend.offsetParent.offsetLeft,
        mapLegend.offsetParent.offsetTop,
        mapLegend.clientWidth,
        mapLegend.clientHeight
      ); // drawImage(image, dx, dy, dWidth, dHeight)
      if (this.getColorBorder) {
        const borderWidth = 2;
        const borderColor = `rgb(${rgbObject.r}, ${rgbObject.g}, ${rgbObject.b})`;
        context.strokeStyle = borderColor;
        context.lineWidth = borderWidth;

        context.strokeRect(
          mapLegend.offsetParent.offsetLeft - borderWidth / 2,
          mapLegend.offsetParent.offsetTop - borderWidth / 2,
          mapLegend.clientWidth + borderWidth,
          mapLegend.clientHeight + borderWidth
        );
      }
    },
    async stitchCanvases(mapCanvas) {
      return new Promise((resolve) => {
        let composedCnv = document.createElement("canvas");
        let ctx = composedCnv.getContext("2d");
        let ctx_w = mapCanvas.width;
        let ctx_h =
          this.outputHeader.height + mapCanvas.height + this.infoCanvas.height;

        composedCnv.width = ctx_w;
        composedCnv.height = ctx_h;

        [
          {
            cnv: this.outputHeader,
            y: 0,
          },
          {
            cnv: mapCanvas,
            y: this.outputHeader.height,
          },
          {
            cnv: this.infoCanvas,
            y: this.outputHeader.height + mapCanvas.height,
          },
        ].forEach((n) => {
          ctx.beginPath();
          ctx.drawImage(n.cnv, 0, n.y, ctx_w, n.cnv.height);
        });

        resolve(composedCnv);
      });
    },
    getMapCanvas() {
      let mapCanvas = document.createElement("canvas");
      let mapCanvasUI = document.getElementById("map");
      mapCanvas.width = mapCanvasUI.offsetWidth; //size[0]
      mapCanvas.height = mapCanvasUI.offsetHeight; //size[1]
      let mapContext = mapCanvas.getContext("2d");
      mapContext.fillStyle = "white";
      mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
      Array.prototype.forEach.call(
        document.querySelectorAll(".ol-layer canvas"),
        function (canvas) {
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity;
            mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
            const transform = canvas.style.transform;
            const matrix = transform
              .match(/^matrix\(([^\(]*)\)$/)[1] //eslint-disable-line
              .split(",")
              .map(Number);
            CanvasRenderingContext2D.prototype.setTransform.apply(
              mapContext,
              matrix
            );
            mapContext.drawImage(canvas, 0, 0);
          }
        }
      );
      return mapCanvas;
    },
    getOutputHeader(mapCanvasWidth, widths, customTitle) {
      let outputHeaderCanvas = document.createElement("canvas");
      let ctx = outputHeaderCanvas.getContext("2d");
      let ctx_w = mapCanvasWidth;
      outputHeaderCanvas.width = ctx_w;
      outputHeaderCanvas.height = 60;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, outputHeaderCanvas.width, outputHeaderCanvas.height);
      ctx.strokeStyle = "black";
      ctx.fillStyle = "black";
      const logo_canvas = document.getElementById("eccc_logo");
      let ratio = logo_canvas.naturalWidth / logo_canvas.naturalHeight;
      let width = null;
      let fontSize = 26;
      ctx.font = fontSize + "px sans-serif";
      let metrics = ctx.measureText(customTitle);
      if (mapCanvasWidth > 1000) {
        width = 2 * widths[1];
        while (metrics.width > mapCanvasWidth - width && fontSize > 10) {
          fontSize -= 1;
          ctx.font = fontSize + "px sans-serif";
          metrics = ctx.measureText(customTitle);
        }
        canvasTxt.fontSize = fontSize;
        canvasTxt.align = "left";
        canvasTxt.drawText(ctx, customTitle, 0, 0, mapCanvasWidth - width, 60);
      } else {
        width = widths[1];
        while (metrics.width > mapCanvasWidth - width && fontSize > 10) {
          fontSize -= 1;
          ctx.font = fontSize + "px sans-serif";
          metrics = ctx.measureText(customTitle);
        }
        canvasTxt.fontSize = fontSize;
        canvasTxt.align = "left";
        canvasTxt.drawText(ctx, customTitle, 0, 0, mapCanvasWidth - width, 60);
      }
      let height = width / ratio;
      if (mapCanvasWidth > 1000) {
        ctx.drawImage(
          logo_canvas,
          ctx_w - 2 * widths[1],
          (outputHeaderCanvas.height - height) / 2,
          width,
          height
        );
      } else {
        ctx.drawImage(
          logo_canvas,
          ctx_w - widths[1],
          (outputHeaderCanvas.height - height) / 2,
          width,
          height
        );
      }
      this.outputHeader = outputHeaderCanvas;
    },
    getInfoCanvas(mapCanvasWidth, visibleLayers, widths, customTitle) {
      this.getOutputHeader(mapCanvasWidth, widths, customTitle);
      let infoCanvas = document.createElement("canvas");
      let ctx = infoCanvas.getContext("2d");
      let ctx_w = mapCanvasWidth;
      this.isLayerListShown = !(
        visibleLayers.length === 1 &&
        customTitle === this.$t(visibleLayers[0].get("layerName"))
      );
      // Must be divisible by 2 otherwise encoder.initialize() will fail
      let ctx_h = 50;

      let fontArray = [];
      let metrics;
      if (this.isLayerListShown) {
        const baseFont = 18;
        ctx_h = 0;
        for (let i = visibleLayers.length - 1; i >= 0; i--) {
          let layerTitle = `• ${this.$t(visibleLayers[i].get("layerName"))}`;
          let fontSize = baseFont;
          ctx.font = fontSize + "px sans-serif";
          metrics = ctx.measureText(layerTitle);
          while (metrics.width > widths[0] && fontSize > 7) {
            fontSize -= 1;
            ctx.font = fontSize + "px sans-serif";
            metrics = ctx.measureText(layerTitle);
          }
          ctx_h += fontSize + 8;
          fontArray.push({
            name: visibleLayers[i].get("layerName"),
            title: layerTitle,
            fontSize: fontSize,
            color: visibleLayers[i].get("legendColor"),
          });
        }
        ctx_h += 10;
        // Must be divisible by 2 otherwise encoder.initialize() will fail
        ctx_h = 2 * Math.ceil(ctx_h / 2);
        let minHeight = 98;
        if (this.modelRunMessage !== null) {
          minHeight += (this.modelRunMessage.length - 1) * 10;
        }
        ctx_h = ctx_h >= minHeight ? ctx_h : minHeight;
      }

      infoCanvas.width = ctx_w;
      infoCanvas.height = ctx_h;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, infoCanvas.width, infoCanvas.height);
      ctx.strokeStyle = "black";

      let hPos = 0;
      fontArray.forEach((timeLayer) => {
        let offsetX = 0;
        if (
          this.getColorBorder &&
          this.getActiveLegends.includes(timeLayer.name)
        ) {
          let color = `rgb(${timeLayer.color.r}, ${timeLayer.color.g}, ${timeLayer.color.b})`;
          canvasTxt.fontSize = 40;
          ctx.fillStyle = color;
          canvasTxt.drawText(
            ctx,
            timeLayer.title.slice(0, 2),
            0.01 * infoCanvas.width,
            hPos - 4,
            widths[0],
            30
          );
          offsetX = ctx.measureText(timeLayer.title.slice(0, 2)).width;
        }
        canvasTxt.fontSize = timeLayer.fontSize;
        ctx.fillStyle = "black";
        canvasTxt.drawText(
          ctx,
          timeLayer.title.slice(2),
          0.01 * infoCanvas.width + offsetX,
          hPos,
          widths[0],
          30
        );
        hPos += timeLayer.fontSize + 8;
      });

      ctx.strokeStyle = "black";
      ctx.fillStyle = "black";

      if (this.displayReferenceTime) {
        canvasTxt.fontSize = 10;
        canvasTxt.align = "left";
        ctx.font = canvasTxt.fontSize + "px sans-serif";
        metrics = ctx.measureText(this.modelRunMessage[0]);
        for (let i = 1; i < this.modelRunMessage.length; i++) {
          let textLength = ctx.measureText(this.modelRunMessage[i]);
          if (textLength.width > metrics.width) {
            metrics = textLength;
          }
        }

        let MRPlacement = ctx_w - metrics.width - 0.01 * infoCanvas.width;
        let side = 1;
        if (!this.isLayerListShown) {
          MRPlacement = 0.01 * infoCanvas.width;
          side = 0;
        }
        for (let i = 0; i < this.modelRunMessage.length; i++) {
          canvasTxt.drawText(
            ctx,
            this.modelRunMessage[i],
            MRPlacement,
            16 + 12 * i,
            widths[side],
            20
          );
        }
      }

      let animetPlacement = ctx_h - 40;
      let osmPlacement = ctx_h - 20;
      if (!this.isLayerListShown) {
        animetPlacement = 0.01 * infoCanvas.height;
        osmPlacement = 20;
      }

      let animetAttr = this.$t("MadeWithAniMet");
      canvasTxt.fontSize = 15;
      canvasTxt.align = "left";
      ctx.font = canvasTxt.fontSize + "px sans-serif";
      metrics = ctx.measureText(animetAttr);
      canvasTxt.drawText(
        ctx,
        animetAttr,
        ctx_w - metrics.width - 0.01 * infoCanvas.width,
        animetPlacement,
        widths[1],
        20
      );

      // © OpenStreetMap contributors
      let OSMAttr = this.$t("AttributionOSM");
      canvasTxt.fontSize = 10;
      canvasTxt.align = "left";
      ctx.font = canvasTxt.fontSize + "px sans-serif";
      metrics = ctx.measureText(OSMAttr);
      canvasTxt.drawText(
        ctx,
        OSMAttr,
        ctx_w - metrics.width - 0.01 * infoCanvas.width,
        osmPlacement,
        widths[1],
        20
      );

      return infoCanvas;
    },
    async updateInfoCanvas(newDate, widths) {
      return new Promise((resolve) => {
        let ctx = this.infoCanvas.getContext("2d");

        canvasTxt.fontSize = 14;
        canvasTxt.align = "left";
        const dateLabel = this.localeDateFormat(
          newDate,
          this.getMapTimeSettings.Step
        );
        ctx.font = canvasTxt.fontSize + "px sans-serif";
        let metrics = ctx.measureText(dateLabel);

        let datePlacement =
          this.infoCanvas.width - metrics.width - 0.01 * this.infoCanvas.width;
        let side = 1;
        if (!this.isLayerListShown) {
          datePlacement = 0.01 * this.infoCanvas.width;
          side = 0;
        }

        ctx.fillStyle = "white";
        if (side === 1) {
          ctx.fillRect(
            this.infoCanvas.width - widths[side],
            0,
            widths[side],
            20
          );
        } else {
          ctx.fillRect(datePlacement, 0, widths[side], 20);
        }
        ctx.fillStyle = "black";

        canvasTxt.drawText(
          ctx,
          dateLabel,
          datePlacement,
          0.01 * this.infoCanvas.height,
          widths[side],
          20
        );
        resolve();
      });
    },
    evenSize() {
      let mapDiv = document.getElementById("map");
      if (mapDiv.offsetHeight % 2 == 1) {
        const newHeight = mapDiv.offsetHeight - 1;
        mapDiv.style.height = newHeight + "px";
      }
      if (mapDiv.offsetWidth % 2 == 1) {
        const newWidth = mapDiv.offsetWidth - 1;
        mapDiv.style.width = newWidth + "px";
      }
    },
  },
  computed: {
    ...mapState("Layers", [
      "animationTitle",
      "datetimeRangeSlider",
      "framesPerSecond",
      "isAnimating",
      "MP4ProgressPercent",
      "playState",
    ]),
    ...mapGetters("Layers", [
      "getActiveLegends",
      "getColorBorder",
      "getMapTimeSettings",
      "getTimeFormat",
    ]),
    displayReferenceTime() {
      return (
        this.getMapTimeSettings.Step !== null && this.modelRunMessage !== null
      );
    },
    mapHeight() {
      return this.map.getSize()[1];
    },
    mapWidth() {
      return this.map.getSize()[0];
    },
  },
  watch: {
    getTimeFormat() {
      this.getModelRuns();
    },
  },
  data() {
    return {
      encoder: null,
      generating: false,
      infoCanvas: null,
      isLayerListShown: true,
      modelRunMessage: null,
      notifyCancelAnimateResize: false,
      outputHeader: null,
      cancelExpired: false,
    };
  },
};
</script>
