<template>
  <div>
    <div class="tabs-header" ref="tabsHeader">
      <v-btn
        @click="scrollLeft"
        class="scroll-button left"
        icon="mdi-chevron-left"
        variant="flat"
        v-show="arrowLeft"
      >
      </v-btn>
      <div class="tabs-scroll-container" ref="scrollContainer">
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
        <v-menu :close-on-content-click="false">
          <template v-slot:activator="{ props }">
            <v-btn icon="mdi-plus" variant="flat" v-bind="props"> </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="(sourceParameters, item, index) in wmsSources"
              :key="index"
              :value="index"
              @click="toggleWmsSource(item)"
            >
              <template v-slot:prepend>
                <v-checkbox
                  :model-value="isSourceActive(item)"
                  hide-details
                  readonly
                  density="compact"
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
        variant="flat"
        v-show="arrowRight"
      >
      </v-btn>
    </div>
    <div class="tabs-content">
      <TransitionGroup name="slide" tag="div">
        <div
          v-for="index in Object.keys(tabs).length"
          :key="index - 1"
          v-show="activeTab === index - 1"
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

const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth
}

const checkScroll = (scrollLeft) => {
  const container = scrollContainer.value
  arrowLeft.value = scrollLeft > 0
  arrowRight.value = scrollLeft < container.scrollWidth - container.clientWidth
}

const setActiveTab = (index) => {
  const oldIndex = activeTab.value
  activeTab.value = index
  scrollToTab(index)
  emit('tabChange', index, oldIndex)
}

const scrollLeft = () => {
  scrollContainer.value.scrollLeft -= arrowMouvementAmount
  checkScroll(scrollContainer.value.scrollLeft - arrowMouvementAmount)
}

const scrollRight = () => {
  scrollContainer.value.scrollLeft += arrowMouvementAmount
  checkScroll(scrollContainer.value.scrollLeft + arrowMouvementAmount)
}

const scrollToTab = (index) => {
  const tab = tabRefs[index]
  const container = scrollContainer.value
  if (container.scrollWidth === container.offsetWidth) {
    checkScroll(0)
    return
  }
  const scrollLeft =
    tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
  container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
  checkScroll(scrollLeft)
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
  const container = scrollContainer.value
  if (!container) return

  scrollToTab(activeTab.value)
})

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
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenWidth)
})
</script>

<style scoped>
.tabs-content {
  position: relative;
  overflow: hidden;
}
.slide-leave-active {
  position: absolute;
}
.slide-enter-active {
  transition: all 0.25s ease-in-out;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}
.tabs-header {
  display: flex;
  align-items: center;
  position: relative;
}
.tabs-scroll-container {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
  position: relative;
}
.tabs-scroll-container::-webkit-scrollbar {
  display: none;
}
.tabs-scroll-container button {
  max-width: 200px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
}
.tabs-header button {
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  transition:
    background-color 0.3s ease,
    opacity 0.3s ease,
    color 0.3s ease;
  flex-shrink: 0;
  transform: scale(1);
}
.tabs-header button::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background-color: rgb(var(--v-theme-primary));
  transition: width 0.3s ease;
}
.tabs-header button:not(.active) {
  opacity: 0.85;
}
.tabs-header button.active::after {
  width: 100%;
}
.tabs-header button.active {
  opacity: 1;
  color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 100vmax rgba(var(--v-theme-primary), 0.05);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease;
  animation: highlightBackground 0.5s ease forwards;
}
@keyframes highlightBackground {
  0% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(var(--v-theme-primary), 0.1);
  }
  100% {
    background-color: rgba(var(--v-theme-primary), 0.05);
  }
}
.scroll-button {
  border-radius: 0px;
  position: absolute;
  z-index: 1;
  height: 46px;
  width: 20px;
}
.scroll-button.left,
.scroll-button.right {
  padding-left: 5px;
  padding-right: 5px;
}
.scroll-button.left {
  left: 0;
}
.scroll-button.right {
  right: 0;
}
</style>
