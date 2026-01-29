<template>
  <div id="permaLink">
    <v-dialog v-model="dialog" max-width="600px">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          size="34"
          class="rounded-circle font-weight-bold"
          @click="createPermaLink"
        >
          <v-icon size="24" class="share-icon"> mdi-share </v-icon>
          <span v-show="false" class="share-text">{{ $t('Share') }}</span>
        </v-btn>
      </template>
      <v-card>
        <v-toolbar density="comfortable">
          <v-toolbar-title class="on-surface">{{
            $t('Share')
          }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn class="on-surface" icon="mdi-close" @click="closeAll"> </v-btn>
        </v-toolbar>
        <v-card-text class="dialog-content">
          <v-spacer></v-spacer>
          <ShareSocialLinks id="sharesocial" />
          <v-text-field
            id="permalinktext"
            :bg-color="getCurrentTheme"
            class="permalinktext"
            density="compact"
            variant="solo"
            hide-details
            readonly
            rounded
            single-line
            :value="[permalink ? permalink : prefixLink()]"
            @keydown.left.right.space.enter.stop
          >
            <template v-slot:prepend>
              <v-btn
                class="ma-0"
                color="info"
                icon="mdi-clipboard-multiple-outline"
                size="34"
                variant="text"
                @click="toClipboard('permalinktext')"
              >
              </v-btn>
            </template>
          </v-text-field>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { isDarkTheme } from '@/components/Composables/isDarkTheme'
import { useRouter, useRoute } from 'vue-router'
import OLImage from 'ol/layer/Image'

export default {
  inject: ['store'],
  setup() {
    const { isDark } = isDarkTheme()
    return { isDark }
  },
  data() {
    return {
      channel: new BroadcastChannel('iframe-updates'),
      dialog: false,
      route: useRoute(),
      router: useRouter(),
      updateTimer: null,
    }
  },
  mounted() {
    this.emitter.on('updatePermalink', this.createPermaLink)
  },
  beforeUnmount() {
    this.emitter.off('updatePermalink', this.createPermaLink)
    this.channel.close()
  },
  computed: {
    activeBasemap() {
      return this.store.getBasemap
    },
    activeLegends() {
      return this.store.getActiveLegends
    },
    activeOverlays() {
      return this.store.getOverlays
    },
    currentCRS() {
      return this.store.getCurrentCRS
    },
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    extent() {
      return this.store.getExtent
    },
    getCurrentTheme() {
      return this.isDark ? 'hsla(0, 0%, 100%, .08)' : 'rgba(0, 0, 0, .06)'
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    permalink() {
      return this.store.getPermalink
    },
    playState() {
      return this.store.getPlayState
    },
    rgb() {
      return this.store.getRGB
    },
    routerParameters() {
      return this.route.query
    },
    showGraticules() {
      return this.store.getShowGraticules
    },
  },
  methods: {
    bufferUpdate() {
      clearTimeout(this.updateTimer)
      this.updateTimer = setTimeout(() => {
        this.channel.postMessage('update')
      }, 2000)
    },
    closeAll() {
      this.dialog = false
      document.activeElement.blur()
    },
    createPermaLink() {
      if (this.extent !== null) {
        let prefix = this.prefixLink()
        let permalinktemp = prefix + '?'
        if (this.$mapLayers.arr.length !== 0) {
          permalinktemp += 'layers='
          const numLayers = this.$mapLayers.arr.length
          for (let i = 0; i < numLayers; i++) {
            let layer = this.$mapLayers.arr[i]
            if (layer instanceof OLImage) {
              let layerName = layer.get('layerName')
              let layerOpacity = layer.get('opacity').toString()
              let isSnapped =
                layer.get('layerName') === this.mapTimeSettings.SnappedLayer
                  ? '1'
                  : '0'
              let isVisible = layer.get('layerVisibilityOn') ? '1' : '0'
              let layerStyle = '0'
              if (
                layer.get('layerCurrentStyle') &&
                layer.get('layerCurrentStyle') !==
                  layer.get('layerStyles')[0].Name
              ) {
                layerStyle = layer.get('layerCurrentStyle')
              }
              let styleInfo = this.activeLegends.includes(layerName) ? '1' : '0'
              const isInterpolated = layer.getSource().getParams().INTERPOLATION
              if (isInterpolated) {
                styleInfo += '1'
              }

              const [name, source] = layerName.split('/')
              const layerParams = [
                name,
                layerOpacity,
                isSnapped,
                isVisible,
                layerStyle,
                styleInfo,
              ]

              const currentMR = layer.get('layerCurrentMR')
              if (
                currentMR &&
                currentMR !==
                  layer.get('layerModelRuns')[
                    layer.get('layerModelRuns').length - 1
                  ]
              ) {
                layerParams.push(currentMR.getTime().toString())
              }

              permalinktemp += layerParams.join(';')

              if (source) {
                permalinktemp += `:${source}`
              }

              if (i < this.$mapLayers.arr.length - 1) {
                permalinktemp += ','
              }
            }
          }
          permalinktemp += '&'
        }

        const extentLength = this.extent.length
        permalinktemp += 'extent='
        for (let j = 0; j < extentLength; j++) {
          if (j === extentLength - 1) {
            if (j === 4) {
              permalinktemp += this.extent[j].toFixed(4)
            } else {
              permalinktemp += this.extent[j].toFixed()
            }
          } else {
            permalinktemp += this.extent[j].toFixed() + ','
          }
        }

        if (this.currentCRS !== 'EPSG:3857') {
          permalinktemp += `&proj=${this.currentCRS.split(':')[1]}`
        }

        if (this.showGraticules) {
          permalinktemp += '&grat=1'
        }

        if (this.activeBasemap !== 'OSM') {
          if (this.activeBasemap !== 'NoBasemap') {
            permalinktemp += `&basemap=${this.activeBasemap}`
          } else {
            permalinktemp += '&basemap=0'
          }
        }

        if (this.activeOverlays.length !== 0) {
          permalinktemp += `&overlays=${this.activeOverlays.join(',')}`
        } else {
          permalinktemp += '&overlays=0'
        }

        if (this.rgb.length !== 0) {
          permalinktemp += `&color=${this.rgb}`
        }

        if (this.playState === 'play') {
          permalinktemp += `&play=1`
        }

        if (this.mapTimeSettings.Step) {
          let first = this.datetimeRangeSlider[0]
          let current = this.mapTimeSettings.DateIndex
          let last = this.datetimeRangeSlider[1]
          let range = last - first
          const extentLength = this.mapTimeSettings.Extent.length - 1

          if (current === extentLength) {
            current = 'l'
            last = 'l'
          } else if (last === extentLength) {
            last = 'l'
          }

          permalinktemp += `&range=${range},${current},${last},${this.mapTimeSettings.Step}`
        }

        this.router.replace({
          path: this.route.path,
          query: Object.fromEntries(
            new URLSearchParams(permalinktemp.split('?')[1]),
          ),
        })

        this.store.setPermalink(permalinktemp)

        return permalinktemp
      }
    },
    prefixLink() {
      return window.location.origin + window.location.pathname
    },
    selectFieldValue(id) {
      const copyText = document.getElementById(id)
      copyText.select()
      copyText.setSelectionRange(0, 99999)
      return copyText.value
    },
    toClipboard(id) {
      navigator.clipboard.writeText(this.selectFieldValue(id))
    },
  },
  watch: {
    routerParameters() {
      this.bufferUpdate()
    },
  },
}
</script>

<style>
.permalinktext .v-input__prepend {
  margin-inline-end: 0px !important;
}
</style>

<style scoped>
.dialog-content {
  padding: 0 16px 16px !important;
}
.share-icon {
  margin-bottom: 2px;
}
#permaLink {
  pointer-events: auto;
  z-index: 4;
}
</style>
