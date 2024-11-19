<template>
  <v-card class="radius scroll">
    <v-col class="options pt-0">
      <v-alert
        v-if="intersectMessage"
        class="replace-legends"
        density="compact"
        type="warning"
        variant="outlined"
        >{{ $t('ReplaceLegends') }}
      </v-alert>
      <v-text-field
        class="pt-1 title-field"
        v-model="animationTitle"
        density="compact"
        variant="underlined"
        clearable
        hide-details
        @keydown.left.right.space.stop
        :disabled="isAnimating"
        :label="$t('MP4CreateCustomTitle')"
      ></v-text-field>
      <v-col class="d-flex align-center">
        <v-switch
          class="reverse-switch"
          color="primary"
          density="compact"
          :disabled="
            isAnimating ||
            datetimeRangeSlider[0] === datetimeRangeSlider[1] ||
            outputFormat !== 'MP4'
          "
          v-model="animationReversed"
          hide-details
          :label="$t('ReverseAnimation')"
        >
        </v-switch>
      </v-col>
      <v-switch
        hide-details
        class="colored-border-switch"
        color="primary"
        density="compact"
        :disabled="isAnimating"
        :label="$t('ColorBorder')"
        v-model="colorBorder"
      ></v-switch>
      <v-row class="mt-0 mb-2 mx-0 align-center">
        <v-select
          hide-details
          class="res-select res-width"
          density="compact"
          variant="underlined"
          v-model="currentResolution"
          :label="$t('VideoFormat')"
          :items="resOptions"
          :disabled="isAnimating"
          @update:modelValue="setResolution"
        >
        </v-select>
        <v-text-field
          hide-details
          :disabled="
            isAnimating ||
            datetimeRangeSlider[0] === datetimeRangeSlider[1] ||
            outputFormat !== 'MP4'
          "
          v-model="framesPerSecond"
          @update:focused="checkFPS"
          type="number"
          min="1"
          max="30"
          pattern="\d+"
          class="fps-selector"
          density="compact"
          variant="underlined"
          @keydown.left.right.space.stop
          @keydown.enter.stop
        >
          <template v-slot:label>
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <div v-bind="props">{{ $t('FPS') }}</div>
              </template>
              <span>{{ $t('FramesPerSecond') }}</span>
            </v-tooltip>
          </template>
        </v-text-field>
        <v-spacer></v-spacer>
        <v-select
          hide-details
          class="res-select output-width"
          density="compact"
          variant="underlined"
          v-model="outputFormat"
          :label="$t('OutputFormat')"
          :items="outputOptions"
          :disabled="
            isAnimating || datetimeRangeSlider[0] === datetimeRangeSlider[1]
          "
        >
        </v-select>
      </v-row>
    </v-col>
    <v-col class="options-bottom">
      <v-select
        hide-details
        class="res-select"
        density="compact"
        variant="underlined"
        v-model="aspectRatio"
        :label="$t('AspectSelection')"
        :items="Object.keys(resDict)"
        :disabled="isAnimating"
        @update:modelValue="setResolution"
      >
        <template v-slot:item="{ props, item }">
          <v-list-item v-bind="props">
            <template v-slot:title>
              <span>{{ formatResolutionName(item.value) }}</span>
            </template>
          </v-list-item>
        </template>
        <template v-slot:selection="{ item }">
          <span>{{ formatResolutionName(item.value) }}</span>
        </template>
      </v-select>
    </v-col>
    <create-animation />
    <export-animation v-if="MP4ExportFlag" />
  </v-card>
</template>

<script>
import { useI18n } from 'vue-i18n'

export default {
  inject: ['store'],
  mounted() {
    this.emitter.on('setAnimationTitle', this.setAnimationTitle)
  },
  beforeUnmount() {
    this.emitter.off('setAnimationTitle', this.setAnimationTitle)
  },
  data() {
    return {
      animationPreview: false,
      animationTitle: '',
      intersectMessage: false,
      outputOptions: ['JPEG', 'MP4'],
      resDict: {
        Widescreen: {
          name: 'Widescreen',
          '720p': {
            height: 720,
            width: 1280,
          },
          '1080p': {
            height: 1080,
            width: 1920,
          },
          aspect: '[16:9]',
        },
        Square: {
          name: 'Square',
          '720p': {
            height: 720,
            width: 720,
          },
          '1080p': {
            height: 1080,
            width: 1080,
          },
          aspect: '[1:1]',
        },
        Portrait: {
          name: 'Portrait',
          '720p': {
            height: 1280,
            width: 720,
          },
          '1080p': {
            height: 1920,
            width: 1080,
          },
          aspect: '[9:16]',
        },
        PortaitSmall: {
          name: 'Portrait',
          '720p': {
            height: 900,
            width: 720,
          },
          '1080p': {
            height: 1350,
            width: 1080,
          },
          aspect: '[4:5]',
        },
        Standard: {
          name: 'Standard',
          '720p': {
            height: 720,
            width: 960,
          },
          '1080p': {
            height: 1080,
            width: 1440,
          },
          aspect: '[4:3]',
        },
        UltraWideScreen: {
          name: 'UltraWideScreen',
          '720p': {
            height: 720,
            width: 1680,
          },
          '1080p': {
            height: 1080,
            width: 2520,
          },
          aspect: '[21:9]',
        },
      },
      resOptions: ['720p', '1080p'],
      t: useI18n().t,
    }
  },
  methods: {
    checkFPS(focused) {
      if (!focused) {
        if (this.framesPerSecond === '') {
          this.store.setFramesPerSecond(3)
        } else if (parseInt(this.framesPerSecond) > 30) {
          this.store.setFramesPerSecond(30)
        } else if (parseInt(this.framesPerSecond) < 1) {
          this.store.setFramesPerSecond(1)
        }
      }
    },
    formatResolutionName(resolution) {
      return `${this.t(this.resDict[resolution].name)}${this.t('Colon')} ${
        this.resDict[resolution][this.currentResolution].width
      }x${this.resDict[resolution][this.currentResolution].height} ${
        this.resDict[resolution].aspect
      }`
    },
    setAnimationTitle() {
      if (this.animationTitle !== '' && this.animationTitle !== null) {
        this.store.setAnimationTitle(this.animationTitle)
      } else {
        if (this.mapTimeSettings.SnappedLayer !== null) {
          this.store.setAnimationTitle(
            this.t(this.mapTimeSettings.SnappedLayer),
          )
        } else if (this.mapTimeSettings.Step !== null) {
          for (let i = this.$mapLayers.arr.length - 1; i >= 0; i--) {
            const layer = this.$mapLayers.arr[i]
            if (
              layer.get('layerIsTemporal') &&
              layer.get('layerTimeStep') === this.mapTimeSettings.Step
            ) {
              this.store.setAnimationTitle(this.t(layer.get('layerName')))
              break
            }
          }
        } else {
          const firstLayerTitle = this.t(
            this.$mapLayers.arr[this.$mapLayers.arr.length - 1].get(
              'layerName',
            ),
          )
          this.store.setAnimationTitle(firstLayerTitle)
        }
      }
    },
    setResolution() {
      let controlElement = document.getElementById('animation-rect')
      const newHeight = this.currentAspect[this.currentResolution].height
      const newWidth = this.currentAspect[this.currentResolution].width
      controlElement.style.height = `${
        Math.round((newHeight / newWidth) * 10000) / 100
      }vw`
      controlElement.style.maxWidth = `${
        Math.round((newWidth / newHeight) * 10000) / 100
      }vh`
      this.emitter.emit('calcFooterPreview')
    },
  },
  computed: {
    currentAspect() {
      return this.store.getCurrentAspect
    },
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    imgURL() {
      return this.store.getImgURL
    },
    intersectMessageDisplayed() {
      return this.store.getIntersectMessageDisplayed
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    layersLength() {
      return this.$mapLayers.arr.length
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    MP4ExportFlag() {
      return this.mp4URL !== null || this.imgURL !== null
    },
    mp4URL() {
      return this.store.getMP4URL
    },
    animationReversed: {
      get() {
        return this.store.getIsAnimationReversed
      },
      set(isReversed) {
        this.store.setIsAnimationReversed(isReversed)
      },
    },
    aspectRatio: {
      get() {
        return this.currentAspect.name
      },
      set(name) {
        this.store.setCurrentAspect(this.resDict[name])
      },
    },
    colorBorder: {
      get() {
        return this.store.getColorBorder
      },
      set(state) {
        this.store.setColorBorder(state)
      },
    },
    currentResolution: {
      get() {
        return this.store.getCurrentResolution
      },
      set(res) {
        this.store.setCurrentResolution(res)
      },
    },
    framesPerSecond: {
      get() {
        return this.store.getFramesPerSecond
      },
      set(fps) {
        if (fps !== '') {
          this.store.setFramesPerSecond(parseInt(fps))
        }
      },
    },
    outputFormat: {
      get() {
        return this.store.getOutputFormat
      },
      set(format) {
        this.store.setOutputFormat(format)
      },
    },
  },
  watch: {
    animationTitle(newTitle, oldTitle) {
      if (
        (newTitle !== '' &&
          newTitle !== null &&
          (oldTitle === '' || oldTitle === null)) ||
        ((newTitle === '' || newTitle === null) &&
          oldTitle !== '' &&
          oldTitle !== null)
      ) {
        this.emitter.emit('calcFooterPreview')
      }
    },
    intersectMessageDisplayed: {
      deep: true,
      handler(newObj) {
        if (Object.values(newObj).some((value) => value === true)) {
          this.intersectMessage = true
        } else {
          this.intersectMessage = false
        }
      },
    },
    layersLength(_, oldValue) {
      if (oldValue !== undefined) {
        this.emitter.emit('calcFooterPreview')
      }
    },
  },
}
</script>

<style>
.title-field .v-field--active .v-label.v-field-label {
  display: none;
}
.title-field .v-label.v-field-label {
  transition: none !important;
  transform: none !important;
}
</style>

<style scoped>
.colored-border-switch {
  margin: 0 0 8px 4px;
}
.fps-selector {
  margin-top: -2px;
  width: 38px;
  flex: 0 1 auto;
}
.options {
  margin: auto;
}
.options-bottom {
  margin: auto;
  margin-top: -16px;
}
.output-width {
  max-width: 110px;
}
.radius {
  border-radius: 0px;
}
.replace-legends {
  font-size: 10pt;
  line-height: 1.1;
  padding: 4px;
  margin-bottom: 6px;
  margin-top: 4px;
}
.res-select {
  margin-top: -2px;
}
.res-width {
  max-width: 110px;
  padding-right: 12px;
}
.reverse-switch {
  min-width: 180px;
  margin: -12px -12px -22px -8px;
  padding: 0;
}
.scroll {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px);
}
.title-field {
  margin-top: -4px;
}
@media (max-width: 1120px) {
  .scroll {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px + 24px);
  }
}
@media (max-width: 959px) {
  .scroll {
    max-height: calc(
      100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px - 42px + 24px
    );
  }
}
@media (max-width: 750px) {
  #animation-configuration {
    width: 100% !important;
  }
}
@media (max-width: 565px) {
  .scroll {
    max-height: calc(
      100vh - (34px + 0.5em * 2) - 0.5em - 158px - 48px - 42px - 10px
    );
  }
}
</style>
