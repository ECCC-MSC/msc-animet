<template>
  <v-menu location="top" offset="10">
    <template v-slot:activator="{ props }">
      <v-btn
        class="controller-options"
        :class="hide ? 'hide-controls' : ''"
        color="primary"
        size="28"
        v-bind="props"
        variant="text"
        icon
        :disabled="isAnimating"
      >
        <v-icon class="controller-options-icon"> mdi-cog </v-icon>
      </v-btn>
    </template>

    <v-card @click.stop class="options-card">
      <v-card-subtitle class="pa-2">
        {{ $t('ControllerOptions') }}
      </v-card-subtitle>
      <v-switch
        v-for="action in controllerOptions"
        :key="action"
        hide-details
        class="px-3 controller-options-switches"
        color="primary"
        density="compact"
        :model-value="action === 'Loop' ? isLooping : false"
        @change="$emit('action-clicked', action)"
      >
        <template v-slot:label>
          <span
            :class="{
              'text-white': isDark,
              'text-black': !isDark,
            }"
          >
            {{ $t(action) }}
          </span>
        </template>
      </v-switch>
    </v-card>
  </v-menu>
</template>

<script>
import { computed } from 'vue'
import { useTheme } from 'vuetify'

export default {
  inject: ['store'],
  setup() {
    const theme = useTheme()
    const isDark = computed(() => theme.global.current.value.dark)
    return { isDark }
  },
  props: {
    hide: Boolean,
  },
  mounted() {
    this.$nextTick(() => {
      if (this.isLooping) {
        this.$emit('action-clicked', 'Loop')
      }
    })
  },
  data() {
    return {
      controllerOptions: ['Reverse', 'Loop'],
    }
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    isLooping() {
      return this.store.getIsLooping
    },
  },
}
</script>

<style scoped>
.controller-options {
  position: absolute;
  top: 8px;
}
.controller-options-icon {
  font-size: 20px !important;
}
.controller-options-switches {
  margin-top: -8px;
}

.controller-options-switches:deep(.v-selection-control__input > .v-icon) {
  opacity: 1;
}
.controller-options-switches:deep(.v-label) {
  opacity: 1;
  font-size: 1rem;
}
.hide-controls {
  display: none;
}
.options-card {
  min-width: 150px;
}
</style>
