<template>
  <v-tooltip location="bottom">
    <template v-slot:activator="{ props }">
      <v-btn
        class="icon-size"
        :class="{
          'icon-highlight-dark': isDark,
          'icon-highlight-light': !isDark,
        }"
        variant="text"
        :color="color"
        :icon="
          item.getSource().getParams().INTERPOLATION
            ? 'mdi-creation'
            : 'mdi-creation-outline'
        "
        v-bind="props"
        @click="interpolate(item)"
        :disabled="isAnimating || item.get('layerInterpolationFailure')"
      >
      </v-btn>
    </template>
    <span>{{ $t('LayerBarInterpolateTooltip') }}</span>
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
    interpolate(layer) {
      const isInterpolated = layer.getSource().getParams().INTERPOLATION

      layer.getSource().updateParams({
        INTERPOLATION: !isInterpolated,
      })

      this.emitter.emit('clearLayerCache', {
        layerName: layer.get('layerName'),
      })
      this.emitter.emit('updatePermalink')
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
