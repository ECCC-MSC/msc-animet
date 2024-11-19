<template>
  <v-tooltip class="visibility-tooltip" location="bottom">
    <template v-slot:activator="{ props }">
      <v-btn
        class="icon-size"
        variant="text"
        :color="colorScheme(item)"
        :icon="selectIcon(item)"
        v-bind="props"
        @click="setVisibleHandler(item)"
        :disabled="isAnimating"
      >
      </v-btn>
    </template>
    <span>
      {{ $t('LayerBarVisibilityTooltip') }}
    </span>
    <v-container
      v-if="item.get('layerDateIndex') < 0 && item.get('layerVisibilityOn')"
      class="red darken-2 rounded pl-4 pr-4"
    >
      <v-row>
        {{ $t('LayerBarInvisibleTooltip') }}
      </v-row>
      <v-row>
        {{ $t('LayerBarMapTime') }}
        {{
          localeDateFormat(
            mapTimeSettings.Extent[mapTimeSettings.DateIndex],
            mapTimeSettings.Step,
          )
        }}
      </v-row>
      <v-row v-if="item.get('layerDateIndex') === -3">
        {{ $t('LayerBarMissingTimestep') }}
      </v-row>
      <v-row v-else>
        {{ $t('LayerBarClosestTime') }}
        {{
          localeDateFormat(
            item.get('layerDateIndex') === -1
              ? item.get('layerStartTime')
              : item.get('layerEndTime'),
            item.get('layerTimeStep'),
          )
        }}
      </v-row>
    </v-container>
  </v-tooltip>
</template>

<script>
import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  props: ['item', 'color'],
  methods: {
    colorScheme(layer) {
      if (layer.get('layerDateIndex') < 0 && layer.get('layerVisibilityOn')) {
        return 'error'
      } else {
        return this.color
      }
    },
    OOBHandler(imageLayer) {
      let layerDateIndex = this.findLayerIndex(
        this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
        imageLayer.get('layerDateArray'),
        imageLayer.get('layerTimeStep'),
      )
      imageLayer.setProperties({
        layerDateIndex: layerDateIndex,
      })
      if (!(layerDateIndex < 0)) {
        imageLayer.setVisible(true)
        this.emitter.emit('fixLayerTimes')
      }
    },
    selectIcon(layer) {
      if (!layer.get('layerVisibilityOn')) {
        return 'mdi-eye-off'
      } else if (!(layer.get('layerDateIndex') < 0)) {
        return 'mdi-eye'
      } else {
        return 'mdi-eye-remove'
      }
    },
    setVisibleHandler(layer) {
      layer.setProperties({
        layerVisibilityOn: !layer.get('layerVisibilityOn'),
      })
      this.emitter.emit('updatePermalink')
      this.emitter.emit('calcFooterPreview')
      if (!layer.get('layerIsTemporal')) {
        layer.setVisible(!layer.get('visible'))
      } else {
        if (layer.get('visible')) {
          layer.setVisible(false)
        } else {
          this.OOBHandler(layer)
        }
      }
    },
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
  },
}
</script>

<style scoped>
.icon-size {
  font-size: 22px;
}
</style>
