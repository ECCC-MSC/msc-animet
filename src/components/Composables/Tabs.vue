<template>
  <div>
    <div class="tabs-header" ref="tabsHeader">
      <v-btn
        @click="scrollLeft"
        class="scroll-button left"
        icon="mdi-chevron-left"
        variant="text"
        v-show="arrowLeft"
        density="compact"
      >
      </v-btn>
      <div class="tabs-scroll-container" ref="scrollContainer">
        <div class="tabs-wrapper">
          <button
            v-for="(sourceParameters, tab, index) in tabs"
            :key="index"
            @click="setActiveTab(index)"
            :class="{ active: activeTab === index }"
            :ref="
              (el) => {
                if (el) tabRefs[index] = el
              }
            "
          >
            {{ sourceParameters.no_translations ? tab : $t(tab) }}
          </button>
          <div class="active-pill" :style="pillStyle"></div>
        </div>
        <v-menu :close-on-content-click="false" location="bottom end">
          <template v-slot:activator="{ props }">
            <v-btn icon="mdi-plus" variant="text" v-bind="props" density="compact" class="add-source-btn"> </v-btn>
          </template>
          <v-list class="glass-list">
            <v-list-item
              v-for="(sourceParameters, item, index) in wmsSources"
              :key="index"
              :value="index"
              @click="toggleWmsSource(item)"
              class="glass-list-item"
            >
              <template v-slot:prepend>
                <v-checkbox
                  :model-value="isSourceActive(item)"
                  hide-details
                  readonly
                  density="compact"
                  color="primary"
                ></v-checkbox>
              </template>
              <v-list-item-title>{{
                sourceParameters.no_translations ? item : $t(item)
              }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <v-btn
        @click="scrollRight"
        class="scroll-button right"
        icon="mdi-chevron-right"
        variant="text"
        v-show="arrowRight"
        density="compact"
      >
      </v-btn>
    </div>
    <div class="tabs-content">
      <TransitionGroup name="fade-slide" tag="div">
        <div
          v-for="index in Object.keys(tabs).length"
          :key="index - 1"
          v-show="activeTab === index - 1"
          class="tab-pane"
        >
          <slot v-if="activeTab === index - 1" name="tab-content"></slot>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
  nextTick,
} from 'vue'

const store = inject('store')

const props = defineProps({
  tabs: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['tabChange'])

const activeTab = ref(0)
const tabsHeader = ref(null)
const scrollContainer = ref(null)
const tabRefs = reactive({})

const arrowMouvementAmount = 220
const arrowLeft = ref(false)
const arrowRight = ref(false)

const screenWidth = ref(window.innerWidth)

const pillStyle = ref({
  left: '0px',
  width: '0px',
})

const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth
}

const checkScroll = (scrollLeft) => {
  const container = scrollContainer.value
  if (!container) return
  arrowLeft.value = scrollLeft > 0
  arrowRight.value = scrollLeft < container.scrollWidth - container.clientWidth
}

const setActiveTab = (index) => {
  const oldIndex = activeTab.value
  activeTab.value = index
  scrollToTab(index)
  updatePill()
  emit('tabChange', index, oldIndex)
}

const updatePill = () => {
  nextTick(() => {
    const activeEl = tabRefs[activeTab.value]
    if (activeEl) {
      pillStyle.value = {
        left: `${activeEl.offsetLeft}px`,
        width: `${activeEl.offsetWidth}px`,
      }
    }
  })
}

const scrollLeft = () => {
  scrollContainer.value.scrollLeft -= arrowMouvementAmount
  setTimeout(() => checkScroll(scrollContainer.value.scrollLeft), 300)
}

const scrollRight = () => {
  scrollContainer.value.scrollLeft += arrowMouvementAmount
  setTimeout(() => checkScroll(scrollContainer.value.scrollLeft), 300)
}

const scrollToTab = (index) => {
  const tab = tabRefs[index]
  const container = scrollContainer.value
  if (!tab || !container) return
  
  if (container.scrollWidth === container.offsetWidth) {
    checkScroll(0)
    return
  }
  const targetScroll =
    tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
  container.scrollTo({ left: targetScroll, behavior: 'smooth' })
  setTimeout(() => checkScroll(container.scrollLeft), 300)
}

const toggleWmsSource = (item) => {
  const currentSources = [...activeWmsSources.value]
  const index = currentSources.indexOf(item)

  if (index === -1) {
    currentSources.push(item)
  } else {
    if (currentSources.length === 1) return
    currentSources.splice(index, 1)
  }

  activeWmsSources.value = currentSources
  localStorage.setItem('user-sources', currentSources)
}

const wmsSources = computed(() => {
  return store.getWmsSources
})

const activeWmsSources = computed({
  get() {
    return Object.keys(store.getActiveSources)
  },
  set(sources) {
    store.setActiveSources(sources)
  },
})

const isSourceActive = (item) => {
  return activeWmsSources.value.includes(item)
}

watch(screenWidth, () => {
  scrollToTab(activeTab.value)
  updatePill()
})

watch(
  () => props.tabs,
  () => {
    nextTick(() => {
      updatePill()
      scrollToTab(activeTab.value)
    })
  },
  { deep: true }
)

watch(
  () => activeWmsSources.value,
  (newSources, oldSources) => {
    const lengthDiff = newSources.length - oldSources.length
    const minLength = Math.min(newSources.length, oldSources.length)
    let changeIndex = minLength
    for (let i = 0; i < minLength; i++) {
      if (newSources[i] !== oldSources[i]) {
        changeIndex = i
        break
      }
    }
    if (changeIndex <= activeTab.value) {
      if (lengthDiff > 0) {
        const newTab = activeTab.value + 1
        nextTick(() => {
          setActiveTab(newTab)
        })
      } else if (activeTab.value === 0) {
        nextTick(() => {
          setActiveTab(0)
        })
      } else {
        const newTab = activeTab.value - 1
        nextTick(() => {
          setActiveTab(newTab)
        })
      }
    }
  },
)

onMounted(() => {
  window.addEventListener('resize', updateScreenWidth)
  nextTick(() => {
    scrollToTab(activeTab.value)
    updatePill()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenWidth)
})
</script>

<style scoped>
.tabs-header {
  display: flex;
  align-items: center;
  position: relative;
  background: rgba(var(--v-theme-surface), 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
  padding: 4px;
}

.tabs-scroll-container {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
  position: relative;
  flex-grow: 1;
  padding: 0 4px;
}

.tabs-scroll-container::-webkit-scrollbar {
  display: none;
}

.tabs-wrapper {
  display: flex;
  position: relative;
  background: rgba(var(--v-border-color), 0.05);
  border-radius: 12px;
  padding: 2px;
}

.tabs-wrapper button {
  padding: 8px 16px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
  z-index: 2;
  white-space: nowrap;
  min-width: 100px;
}

.tabs-wrapper button:hover {
  color: rgba(var(--v-theme-on-surface), 1);
  background: rgba(var(--v-theme-primary), 0.05);
}

.tabs-wrapper button.active {
  color: rgb(var(--v-theme-primary));
}

.active-pill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: rgba(var(--v-theme-surface), 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 
              0 0 0 1px rgba(var(--v-theme-primary), 0.1);
  border-radius: 10px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
  pointer-events: none;
}

.add-source-btn {
  margin-left: 8px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: all 0.3s ease;
}

.add-source-btn:hover {
  color: rgb(var(--v-theme-primary));
  transform: rotate(90deg);
}

.scroll-button {
  background: transparent;
  width: 24px;
  height: 24px;
  z-index: 3;
}

.tabs-content {
  position: relative;
  overflow: hidden;
  padding: 12px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.tab-pane {
  width: 100%;
}

.glass-list {
  background: rgba(var(--v-theme-surface), 0.8) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(var(--v-border-color), 0.1);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15) !important;
  border-radius: 16px !important;
  padding: 8px !important;
}

.glass-list-item {
  border-radius: 10px !important;
  margin-bottom: 2px;
  transition: all 0.2s ease;
}

.glass-list-item:hover {
  background: rgba(var(--v-theme-primary), 0.08) !important;
}
</style>
