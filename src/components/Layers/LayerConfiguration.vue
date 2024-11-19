<template>
  <v-card class="radius">
    <div class="ml-4 pa-0 scroll">
      <transition-group name="list" tag="div">
        <v-list-item
          v-for="(item, index) in layerListReversed"
          :key="item.get('layerName')"
          outlined
          class="pl-0"
          :class="{
            'item-padding':
              !isAnimating || configPanelHover || playState !== 'play',
            'pr-3': numLayers === 1,
            'pr-0': numLayers !== 0,
          }"
        >
          <template
            v-if="isAnimating && !configPanelHover && playState === 'play'"
            class="pa-0"
          >
            <v-list-item-title :title="$t(item.get('layerName'))">
              {{ $t(item.get('layerName')) }}
            </v-list-item-title>
            <v-list-item-subtitle class="layer-subtitle">
              {{ item.get('layerName') }}
            </v-list-item-subtitle>
            <div
              v-if="
                item.get('layerIsTemporal') &&
                item.get('layerModelRuns') !== null &&
                item.get('layerModelRuns').length > 0
              "
              class="text--disabled font-weight-light text-caption mr-subtitle"
              v-text="$t('ModelRun')"
            ></div>
            <model-run-handler class="mr-text" :item="item" />
          </template>
          <template v-else class="pa-0">
            <v-col class="pa-0">
              <v-list-item-title :title="$t(item.get('layerName'))">
                {{ $t(item.get('layerName')) }}
              </v-list-item-title>
              <v-list-item-subtitle class="layer-subtitle">
                {{ item.get('layerName') }}
              </v-list-item-subtitle>

              <model-run-handler :item="item" />

              <!-- Layer control buttons -->
              <v-row class="justify-space-between ma-0">
                <snapped-layer-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <opacity-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <visibility-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <style-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <remove-layer-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
              </v-row>
            </v-col>
          </template>
          <template v-slot:append>
            <v-list-item-action
              v-if="!isAnimating || configPanelHover || playState !== 'play'"
              class="arrow-position d-flex flex-column align-center"
            >
              <v-btn
                v-if="index !== 0"
                :disabled="isAnimating"
                @click="changeLayerOrder(index - 1)"
                icon="mdi-arrow-up"
                variant="text"
              >
              </v-btn>
              <v-btn
                v-if="index + 1 < numLayers"
                :disabled="isAnimating"
                @click="changeLayerOrder(index)"
                icon="mdi-arrow-down"
                variant="text"
              >
              </v-btn>
            </v-list-item-action>
          </template>
        </v-list-item>
      </transition-group>
    </div>
  </v-card>
</template>

<script>
import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  methods: {
    changeLayerOrder(index) {
      let reverseIndex = this.numLayers - index - 1
      this.$mapLayers.arr[reverseIndex].setZIndex(reverseIndex - 1)
      this.$mapLayers.arr[reverseIndex - 1].setZIndex(reverseIndex)
      this.$mapLayers.arr[reverseIndex] = this.$mapLayers.arr.splice(
        reverseIndex - 1,
        1,
        this.$mapLayers.arr[reverseIndex],
      )[0]
      this.emitter.emit('updatePermalink')
      this.emitter.emit('calcFooterPreview')
    },
    isSnapped(layerName) {
      if (this.mapTimeSettings.SnappedLayer !== null) {
        return layerName === this.mapTimeSettings.SnappedLayer ? 'primary' : ''
      } else {
        return ''
      }
    },
  },
  computed: {
    configPanelHover() {
      return this.store.getConfigPanelHover
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    playState() {
      return this.store.getPlayState
    },
    layerListReversed() {
      return this.$mapLayers.arr.slice().reverse()
    },
    numLayers() {
      return this.$mapLayers.arr.length
    },
  },
}
</script>

<style scoped>
.arrow-position {
  margin-left: -16px;
}
.content {
  min-height: 96px;
  max-width: 100%;
}
.item-padding {
  padding-bottom: 2px;
  padding-top: 2px;
}
.layer-subtitle {
  margin-top: -4px;
  margin-bottom: 4px;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
}
.list-enter-active,
.list-leave-active {
  transition: opacity 0.25s ease;
}
.list-move {
  transition: transform 0.25s ease-out;
}
.mr-subtitle {
  margin-bottom: -8px;
  margin-top: -4px;
  color: #747474;
}
.mr-text:deep(.v-field__append-inner),
.mr-text:deep(.v-field__outline) {
  display: none;
}
.mr-text:deep(.v-field__input) {
  padding: 0;
  margin-top: -8px;
  margin-bottom: -14px;
}
.radius {
  border-radius: 0px;
}
.scroll {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px);
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
@media (max-width: 565px) {
  .scroll {
    max-height: calc(
      100vh - (34px + 0.5em * 2) - 0.5em - 158px - 48px - 42px - 10px
    );
  }
}
</style>
