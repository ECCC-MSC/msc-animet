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
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'

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

const arrowMouvementAmount = 150
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

watch(screenWidth, () => {
  const container = scrollContainer.value
  if (!container) return

  scrollToTab(activeTab.value)
})

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
