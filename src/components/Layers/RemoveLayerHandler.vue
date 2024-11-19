<template>
  <v-tooltip class="remove-layer-tooltip" location="bottom">
    <template v-slot:activator="{ props }">
      <v-btn
        class="icon-size"
        variant="text"
        :color="color"
        icon="mdi-close"
        v-bind="props"
        @click="removeLayerHandler(item)"
        :disabled="isAnimating"
      >
      </v-btn>
    </template>
    <span>{{ $t('LayerBarRemoveTooltip') }}</span>
  </v-tooltip>
</template>

<script>
import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  props: ['item', 'color'],
  methods: {
    removeLayerHandler(removedLayer) {
      this.emitter.emit('removeLayer', removedLayer)
    },
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
  },
}
</script>

<style scoped>
.icon-size {
  font-size: 22px;
}
</style>
