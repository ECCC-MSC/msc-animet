<template>
  <v-card flat v-if="getMapTimeSettings.Step !== null">
    <v-card-title class="text-subtitle-2">
      {{ $t("MP4ExportTitle") }}
    </v-card-title>
    <v-card-subtitle>
      {{ $t("MP4ExportSubtitle") }}
    </v-card-subtitle>

    <v-row class="mx-4 mb-2" justify="center">
      <video
        :src="getMP4URL"
        class="video-preview"
        controls
        autoplay
        loop
      ></video>
    </v-row>

    <v-card-actions class="mt-4">
      <v-btn block color="primary" @click="downloadMP4()" class="text-none">
        {{ $t("MP4ExportDownload") }} [{{
          this.formatBytes(this.getOutputSize, 0)
        }}]
        <v-icon dark class="ml-4"> mdi-download </v-icon>
      </v-btn>
    </v-card-actions>
    <a id="MP4-download" :download="exportName"></a>
  </v-card>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  computed: {
    ...mapGetters("Layers", [
      "getAnimationTitle",
      "getMapTimeSettings",
      "getMP4URL",
      "getOutputDate",
      "getOutputSize",
    ]),
    exportName() {
      let animationTitle = this.getAnimationTitle;
      if (animationTitle !== "") {
        animationTitle = animationTitle.replaceAll("^", "");
        animationTitle = animationTitle.replaceAll(",", ".");
        animationTitle = animationTitle
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        animationTitle = animationTitle.replace(/[^a-zA-Z0-9.]/g, " ");
        animationTitle = animationTitle.replace(/\s+/g, "_");
        animationTitle = animationTitle.replace(/[^a-zA-Z0-9]$/, "");
        animationTitle = "_" + animationTitle;
      }
      return "MSC-AniMet_" + this.getOutputDate + animationTitle + ".mp4";
    },
  },
  methods: {
    downloadMP4: function () {
      let MP4link = document.getElementById("MP4-download");
      MP4link.href = this.getMP4URL;
      MP4link.click();
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
  },
};
</script>

<style scoped>
.video-preview {
  min-width: 300px;
  max-width: 480px;
}
</style>
