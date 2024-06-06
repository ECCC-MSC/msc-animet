<template>
  <v-card flat v-if="getMapTimeSettings.Step !== null">
    <v-card-title class="text-subtitle-2">
      {{ $t("MP4ExportTitle") }}
    </v-card-title>
    <v-card-subtitle>
      {{ getMP4URL ? $t("MP4ExportSubtitle") : $t("PNGExportSubtitle") }}
    </v-card-subtitle>

    <v-row class="mx-4 mb-2" justify="center">
      <video
        v-if="getMP4URL"
        :src="getMP4URL"
        class="output-preview"
        controls
        autoplay
        loop
      ></video>
      <img
        v-if="getImgURL && !isFullSize"
        :src="getImgURL"
        @click="toggleFullSize"
        class="output-preview pointer"
      />
    </v-row>

    <v-card-actions class="mt-4">
      <v-btn block color="primary" @click="downloadOutput()" class="text-none">
        {{ getMP4URL ? $t("MP4ExportDownload") : $t("PNGExportDownload") }} [{{
          this.formatBytes(this.getOutputSize, 0)
        }}]
        <v-icon dark class="ml-4"> mdi-download </v-icon>
      </v-btn>
    </v-card-actions>
    <a id="output-download" :download="exportName"></a>
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  computed: {
    ...mapGetters("Layers", [
      "getAnimationTitle",
      "getImgURL",
      "getMapTimeSettings",
      "getMP4URL",
      "getOutputDate",
      "getOutputSize",
    ]),
    ...mapState("Layers", ["isFullSize"]),
    exportName() {
      let animationTitle = this.getAnimationTitle;
      if (animationTitle !== "") {
        animationTitle = animationTitle.replaceAll("^", "");
        animationTitle = animationTitle.replaceAll(",", ".");
        animationTitle = animationTitle
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        animationTitle = animationTitle.replace(/[^a-zA-Z0-9.-]/g, " ");
        animationTitle = animationTitle.replace(/\s+/g, "_");
        animationTitle = animationTitle.replace(/[^a-zA-Z0-9]$/, "");
        animationTitle = "_" + animationTitle;
      }
      const outputFormat = this.getMP4URL ? ".mp4" : ".png";
      return `MSC-AniMet_${this.getOutputDate}${animationTitle}${outputFormat}`;
    },
  },
  methods: {
    downloadOutput: function () {
      let outputLink = document.getElementById("output-download");
      outputLink.href = this.getMP4URL ? this.getMP4URL : this.getImgURL;
      outputLink.click();
    },
    formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return "0 Bytes";

      const k = 1024;
      let dm = decimals < 0 ? 0 : decimals;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

      const i = Math.floor(Math.log(bytes) / Math.log(k));
      if (i > 1) {
        dm = 1;
      }
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    },
    toggleFullSize() {
      this.$store.dispatch("Layers/setIsFullSize", true);
    },
  },
};
</script>

<style scoped>
.output-preview {
  min-width: 300px;
  max-width: 480px;
}
.pointer {
  cursor: pointer;
}
</style>
