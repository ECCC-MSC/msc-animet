<template>
  <div>
    <v-btn
      @click="changeDateIndex(getAction().name)"
      medium
      color="primary"
      size="36"
      variant="text"
      :disabled="
        mapTimeSettings.DateIndex ===
          datetimeRangeSlider[getAction().prevent] || isAnimating
      "
      :icon="getAction().icon"
    >
    </v-btn>
  </div>
</template>

<script>
export default {
  inject: ['store'],
  props: {
    action: {
      type: String,
      required: true,
      validator: function (value) {
        return ['first', 'previous', 'next', 'last'].includes(value)
      },
    },
  },
  data() {
    return {
      items: [
        {
          name: 'first',
          icon: 'mdi-skip-backward',
          prevent: 0,
        },
        {
          name: 'previous',
          icon: 'mdi-skip-previous',
          prevent: 0,
        },
        {
          name: 'next',
          icon: 'mdi-skip-next',
          prevent: 1,
        },
        {
          name: 'last',
          icon: 'mdi-skip-forward',
          prevent: 1,
        },
      ],
    }
  },
  computed: {
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
  },
  methods: {
    changeDateIndex(actionName) {
      this.emitter.emit('changeTab')
      switch (actionName) {
        case 'first':
          if (this.mapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
            this.store.setMapTimeIndex(this.datetimeRangeSlider[0])
          }
          break
        case 'previous':
          if (this.mapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
            this.store.setMapTimeIndex(this.mapTimeSettings.DateIndex - 1)
          }
          break
        case 'next':
          if (this.mapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
            this.store.setMapTimeIndex(this.mapTimeSettings.DateIndex + 1)
          }
          break
        case 'last':
          if (this.mapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
            this.store.setMapTimeIndex(this.datetimeRangeSlider[1])
          }
          break
      }
    },
    getAction() {
      return this.items.filter((action) => action.name === this.action)[0]
    },
  },
}
</script>
