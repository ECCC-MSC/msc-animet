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
    <template v-slot:item="{ props, item: selectItem }">
      <v-list-item
        v-bind="props"
        :title="
          localeDateFormat(
            selectItem.raw,
            item.get('layerTimeStep'),
            'DATETIME_MED',
          )
        "
      >
      </v-list-item>
    </template>
    <template v-slot:selection="{ item: selectItem }">
      {{
        localeDateFormat(
          selectItem.raw,
          item.get('layerTimeStep'),
          'DATETIME_MED',
        )
      }}
    </template>
  </v-select>
</template>

<script>
import { DateTime } from 'luxon'

import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  props: ['item'],
  methods: {
    changeModelRun(newModelRun) {
      const newModelRunDT = DateTime.fromJSDate(newModelRun, { zone: 'utc' })
      const oldModelRunDT = DateTime.fromJSDate(
        this.item.get('layerCurrentMR'),
        { zone: 'utc' },
      )

      const diff = newModelRunDT.diff(oldModelRunDT, [
        'years',
        'months',
        'days',
        'hours',
        'minutes',
        'seconds',
      ])

      const newDateArray = this.item
        .get('layerDateArray')
        .map((date) =>
          DateTime.fromJSDate(date, { zone: 'utc' }).plus(diff).toJSDate(),
        )

      if (
        newModelRun.getTime() ===
        this.item
          .get('layerModelRuns')
          [this.item.get('layerModelRuns').length - 1].getTime()
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

      let layerDefaultTime = this.item.get('layerDefaultTime')
      if (layerDefaultTime > newDateArray[newDateArray.length - 1]) {
        layerDefaultTime = newDateArray[newDateArray.length - 1]
      } else if (layerDefaultTime < newDateArray[0]) {
        layerDefaultTime = newDateArray[0]
      }
      this.item.setProperties({
        layerDateArray: newDateArray,
        layerDefaultTime: layerDefaultTime,
        layerCurrentMR: newModelRun,
        layerStartTime: newDateArray[0],
        layerEndTime: newDateArray[newDateArray.length - 1],
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
      this.emitter.emit('clearLayerCache', {
        layerName: this.item.get('layerName'),
      })
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
