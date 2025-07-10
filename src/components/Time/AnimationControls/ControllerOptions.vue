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
      <v-card-subtitle class="px-2 pt-2 pb-1">
        {{ $t('ControllerOptions') }}
      </v-card-subtitle>

      <div
        class="custom-vselect-label d-flex align-center px-3"
        :class="{ 'custom-vselect-label--dark': isDark }"
      >
        <span>{{ $t('PlaySpeed') }}</span>
        <v-tooltip location="top" open-delay="200">
          <template #activator="{ props }">
            <v-icon
              v-bind="props"
              size="16"
              class="ml-1"
              style="vertical-align: middle; cursor: pointer"
            >
              mdi-information-outline
            </v-icon>
          </template>
          <span class="tooltip-multiline">
            {{ $t('PlaySpeedTooltip') }}
          </span>
        </v-tooltip>
      </div>

      <v-select
        hide-details
        class="px-3 pb-3 pt-0"
        density="compact"
        variant="underlined"
        v-model="currentSpeed"
        :items="formattedSpeedOptions"
        :disabled="isAnimating"
        :label="null"
      />
      <v-switch
        v-for="action in Object.keys(controllerOptions)"
        :key="action"
        hide-details
        class="px-3 controller-options-switches"
        color="primary"
        density="compact"
        :model-value="controllerOptions[action].value"
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

<script setup>
import { computed, inject, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { isDarkTheme } from '@/components/Composables/isDarkTheme'

const props = defineProps({
  hide: Boolean,
})

const emit = defineEmits(['action-clicked'])

const store = inject('store')
const { isDark } = isDarkTheme()
const { t } = useI18n()

const isAnimating = computed(() => store.getIsAnimating)
const isLooping = computed(() => store.getIsLooping)
const isReversed = computed(() => store.getIsReversed)

const controllerOptions = { Reverse: isReversed, Loop: isLooping }
const speedOptions = [1000, 500, 250, 100]

const currentSpeed = computed({
  get() {
    return store.getPlaySpeed
  },
  set(speed) {
    store.setPlaySpeed(speed)
    localStorage.setItem('user-playspeed', speed)
  },
})

const formattedSpeedOptions = computed(() =>
  speedOptions.map((ms) => ({
    title: formatSpeedLabel(ms),
    value: ms,
  })),
)

function formatSpeedLabel(ms) {
  const perSec = Math.round(1000 / ms)
  return t('PlaySpeedLabel', {
    speed: perSec,
  })
}

onMounted(() => {
  const speed = localStorage.getItem('user-playspeed') || undefined
  if (speed && !isNaN(Number(speed))) {
    store.setPlaySpeed(Number(speed))
  }

  const userLooping = localStorage.getItem('looping')
  if (userLooping === 'false') {
    store.setIsLooping(false)
  }

  nextTick(() => {
    if (isLooping.value) {
      emit('action-clicked', 'Loop')
    }
  })
})
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
.custom-vselect-label {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.25rem;
  letter-spacing: 0.009375em;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: -8px;
  transition: color 0.2s;
  user-select: none;
}
.custom-vselect-label--dark {
  color: rgba(255, 255, 255, 0.7);
}
.custom-vselect-label .v-icon {
  z-index: 3;
}
.hide-controls {
  display: none;
}
.options-card {
  min-width: 150px;
}
.tooltip-multiline {
  max-width: 220px;
  white-space: normal;
  display: block;
  word-break: break-word;
  line-height: 1.4;
}
</style>
