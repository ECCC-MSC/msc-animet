<template>
  <v-menu open-on-hover :close-delay="150" location="bottom" offset="8">
    <template v-slot:activator="{ props }">
      <v-btn
        class="icon-size"
        icon="mdi-opacity"
        variant="text"
        v-bind="props"
        :color="color"
        :disabled="isAnimating"
      >
      </v-btn>
    </template>

    <v-card class="pl-4 pr-4 pt-4" min-width="300">
      <v-row class="d-flex justify-space-between">
        <v-card-title>
          {{ $t('LayerBarOpacity') }}
        </v-card-title>
        <v-card-title>
          {{ Math.ceil(Math.round(item.get('opacity') * 100)) + '%' }}
        </v-card-title>
      </v-row>
      <v-card-text class="pb-0">
        <v-slider
          color="primary"
          min="0"
          max="1"
          step="0.05"
          thumb-size="16"
          track-size="2"
          v-model="opacity"
          :disabled="isAnimating"
          @change="emitter.emit('updatePermalink')"
        >
        </v-slider>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script>
export default {
  inject: ['store'],
  props: ['item', 'color'],
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    opacity: {
      get() {
        return this.item.get('opacity')
      },
      set(op) {
        this.item.setOpacity(op)
      },
    },
  },
}
</script>

<style scoped>
.icon-size {
  font-size: 22px;
}
</style>
