<template>
  <v-tooltip class="remove-layer-tooltip" location="bottom">
    <template v-slot:activator="{ props }">
      <v-btn
        class="icon-size"
        :class="{
          'icon-highlight-dark': isDark,
          'icon-highlight-light': !isDark,
        }"
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
import { isDarkTheme } from '@/components/Composables/isDarkTheme'

export default {
  inject: ['store'],
  props: ['item', 'color'],
  mixins: [datetimeManipulations],
  setup() {
    const { isDark } = isDarkTheme()
    return { isDark }
  },
  methods: {
    removeLayerHandler(removedLayer) {
      this.emitter.emit('removeLayer', removedLayer)
      this.emitter.emit('clearLayerCache', {
        layerName: removedLayer.get('layerName'),
      })
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
