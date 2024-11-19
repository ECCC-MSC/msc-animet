<template>
  <v-card flat v-if="mapTimeSettings.Step !== null">
    <v-card-title class="text-subtitle-2 pb-0">
      {{ $t('MP4ExportTitle') }}
    </v-card-title>
    <v-card-subtitle class="export-subtitle">
      {{ mp4URL ? $t('MP4ExportSubtitle') : $t('JPEGExportSubtitle') }}
    </v-card-subtitle>
    <v-card-text class="py-1">
      <v-row class="ma-0" justify="center">
        <video
          v-if="mp4URL"
          :src="mp4URL"
          class="output-preview"
          controls
          autoplay
          loop
        ></video>
        <img
          v-if="imgURL && !isFullSize"
          :src="imgURL"
          @click="toggleFullSize"
          class="output-preview pointer"
        />
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn
        block
        variant="elevated"
        color="primary"
        @click="downloadOutput()"
        class="text-none"
      >
        {{ mp4URL ? $t('MP4ExportDownload') : $t('JPEGExportDownload') }} [{{
          this.formatBytes(this.outputSize, 0)
        }}]
        <v-icon class="ml-4"> mdi-download </v-icon>
      </v-btn>
    </v-card-actions>
    <a id="output-download" :download="exportName"></a>
  </v-card>
</template>

<script>
export default {
  inject: ['store'],
  computed: {
    animationTitle() {
      return this.store.getAnimationTitle
    },
    imgURL() {
      return this.store.getImgURL
    },
    isFullSize() {
      return this.store.getIsFullSize
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    mp4URL() {
      return this.store.getMP4URL
    },
    outputDate() {
      return this.store.getOutputDate
    },
    outputSize() {
      return this.store.getOutputSize
    },
    exportName() {
      let title = this.animationTitle
      if (title !== '') {
        title = title.replaceAll('^', '')
        title = title.replaceAll(',', '.')
        title = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        title = title.replace(/[^a-zA-Z0-9.-]/g, ' ')
        title = title.replace(/\s+/g, '_')
        title = title.replace(/[^a-zA-Z0-9]$/, '')
        title = '_' + title
      }
      const outputFormat = this.mp4URL ? '.mp4' : '.jpeg'
      return `MSC-AniMet_${this.outputDate}${title}${outputFormat}`
    },
  },
  methods: {
    downloadOutput: function () {
      let outputLink = document.getElementById('output-download')
      outputLink.href = this.mp4URL ? this.mp4URL : this.imgURL
      outputLink.click()
    },
    formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return '0 Bytes'

      const k = 1024
      let dm = decimals < 0 ? 0 : decimals
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

      const i = Math.floor(Math.log(bytes) / Math.log(k))
      if (i > 1) {
        dm = 1
      }
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
    },
    toggleFullSize() {
      this.store.setIsFullSize(true)
    },
  },
}
</script>

<style scoped>
.export-subtitle {
  white-space: unset;
}
.output-preview {
  min-width: 300px;
  max-width: 480px;
}
.pointer {
  cursor: pointer;
}
</style>
