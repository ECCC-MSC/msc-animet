<template>
  <v-tooltip
    location="bottom"
    v-if="item.get('layerIsTemporal')"
    v-model="showTooltip"
  >
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        :icon="color !== '' ? 'mdi-clock-check' : 'mdi-clock'"
        :color="color"
        :disabled="isAnimating"
        class="icon-size"
        variant="text"
        @click="snapLayerToAnimation(item)"
        @touchstart="showTooltip = true"
        @touchend="showTooltip = false"
      >
      </v-btn>
    </template>
    <v-container class="primary darken-2 rounded pl-4 pr-4" v-if="color !== ''">
      <v-row>
        {{ $t('SnappedLayer') }}
      </v-row>
    </v-container>
    <v-container v-else>
      <v-row>
        {{ $t('SnapLayerToExtent') }}
      </v-row>
    </v-container>
    <v-container>
      <v-row
        v-if="
          !(item.get('layerDateIndex') < 0) && item.get('layerVisibilityOn')
        "
      >
        {{ $t('LayerBarCurrentTooltip') }} :
        {{
          localeDateFormat(
            item.get('layerDateArray')[item.get('layerDateIndex')],
            item.get('layerTimeStep'),
          )
        }}
      </v-row>
      <v-row>
        {{ $t('LayerBarStartsTooltip') }} :
        {{
          localeDateFormat(
            item.get('layerStartTime'),
            item.get('layerTimeStep'),
          )
        }}
      </v-row>
      <v-row>
        {{ $t('LayerBarEndsTooltip') }} :
        {{
          localeDateFormat(item.get('layerEndTime'), item.get('layerTimeStep'))
        }}
      </v-row>
      <v-row>
        {{ $t('LayerBarStepTooltip') }} :
        {{ item.get('layerTrueTimeStep') }}
      </v-row>
    </v-container>
  </v-tooltip>
  <v-tooltip location="bottom" v-else>
    <template v-slot:activator="{ props }">
      <span v-bind="props" class="d-inline-block">
        <v-btn
          icon="mdi-clock-remove"
          variant="text"
          class="icon-size"
          disabled
        >
        </v-btn>
      </span>
    </template>
    {{ $t('NoTimeTooltip') }}
  </v-tooltip>
</template>

<script>
import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  props: ['item', 'color'],
  data() {
    return {
      showTooltip: false,
    }
  },
  methods: {
    snapLayerToAnimation(layer) {
      if (layer.get('layerName') !== this.mapTimeSettings.SnappedLayer) {
        if (this.mapTimeSettings.Step === layer.get('layerTimeStep')) {
          this.store.setMapSnappedLayer(layer.get('layerName'))
        } else {
          this.changeMapTime(layer.get('layerTimeStep'), layer)
        }
      }
      this.emitter.emit('updatePermalink')
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
.d-inline-block {
  display: inline-block;
}
.icon-size {
  font-size: 22px;
}
</style>
