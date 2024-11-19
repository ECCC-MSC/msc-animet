<template>
  <v-select
    v-if="
      item.get('layerIsTemporal') &&
      item.get('layerModelRuns') !== null &&
      item.get('layerModelRuns').length > 0
    "
    class="model-run"
    flat
    hide-details
    variant="underlined"
    v-model="currentMR"
    :label="$t('SelectMR')"
    :items="item.get('layerModelRuns')"
    :disabled="isAnimating"
  >
    <template v-slot:item="{ props, item }">
      <v-list-item
        v-bind="props"
        :title="localeDateFormat(item.raw, null, 'DATETIME_MED')"
      >
      </v-list-item>
    </template>
    <template v-slot:selection="{ item }">
      {{ localeDateFormat(item.raw, null, 'DATETIME_MED') }}
    </template>
  </v-select>
</template>

<script>
import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  props: ['item'],
  methods: {
    changeModelRun(newModelRun) {
      let newDateArray = []
      let timeDiff =
        newModelRun.getTime() - this.item.get('layerCurrentMR').getTime()
      this.item
        .get('layerDateArray')
        .forEach((date) =>
          newDateArray.push(new Date(date.getTime() + timeDiff)),
        )

      if (
        newModelRun ===
        this.item.get('layerModelRuns')[
          this.item.get('layerModelRuns').length - 1
        ]
      ) {
        this.item.getSource().updateParams({
          DIM_REFERENCE_TIME: undefined,
        })
      } else {
        this.item.getSource().updateParams({
          DIM_REFERENCE_TIME: this.getProperDateString(
            newModelRun,
            this.item.get('layerDateFormat'),
          ),
        })
      }
      const layerActiveConfig = this.item.get('layerActiveConfig')
      const configs = this.item.get('layerConfigs')
      configs[layerActiveConfig].layerDateArray = newDateArray
      configs[layerActiveConfig].layerStartTime = newDateArray[0]
      configs[layerActiveConfig].layerEndTime =
        newDateArray[newDateArray.length - 1]

      this.item.setProperties({
        layerConfigs: configs,
        layerDateArray: newDateArray,
        layerDefaultTime: new Date(
          this.item.get('layerDefaultTime').getTime() + timeDiff,
        ),
        layerCurrentMR: newModelRun,
        layerStartTime: configs[layerActiveConfig].layerStartTime,
        layerEndTime: configs[layerActiveConfig].layerEndTime,
      })
      this.emitter.emit('modelRunChanged')
      this.emitter.emit('calcFooterPreview')
      if (this.item.get('layerTimeStep') === this.mapTimeSettings.Step) {
        this.changeMapTime(this.item.get('layerTimeStep'))
      } else {
        const newLayerIndex = this.findLayerIndex(
          this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
          newDateArray,
          this.item.get('layerTimeStep'),
        )
        this.item.setProperties({
          layerDateIndex: newLayerIndex,
        })
        this.emitter.emit('fixLayerTimes')
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
    currentMR: {
      get() {
        return this.item.get('layerCurrentMR')
      },
      set(mr) {
        this.changeModelRun(mr)
      },
    },
  },
}
</script>

<style>
.model-run .v-field__input {
  padding-left: 0;
}
.model-run .v-field-label {
  margin-left: 0;
}
</style>

<style scoped>
.model-run {
  max-width: 350px;
}
</style>
