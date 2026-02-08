<template>
  <div v-if="node.children && node.Img" class="preset-card-container">
    <div 
      class="preset-card" 
      :class="{ selected: presetSelected(node) }"
      @click="handleMultiAdd(node)"
    >
      <div class="image-wrapper">
        <img :src="img" class="preset-image" />
        <div class="image-overlay">
          <v-icon color="white" size="32" class="overlay-icon">
            {{ presetSelected(node) ? 'mdi-minus-circle' : 'mdi-plus-circle' }}
          </v-icon>
        </div>
      </div>
      <div class="card-content">
        <span
          class="preset-title"
          v-html="DOMPurify.sanitize(node[`Title_${$i18n.locale}`])"
        ></span>
      </div>
    </div>
  </div>
  <div v-else class="tree-node">
    <div @click="handleClick(node)" class="node-content" :class="{ 'is-leaf': !node.children }">
      <div class="content-wrapper">
        <v-btn
          v-if="node.children"
          icon
          variant="text"
          density="compact"
          class="toggle-btn"
        >
          <v-icon size="20" class="toggle-icon">
            {{ node.isOpen ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
          </v-icon>
        </v-btn>
        <div v-else class="leaf-icon-wrapper">
          <slot name="node-icon" :node="node">
            <v-icon size="16" color="primary">mdi-circle-medium</v-icon>
          </slot>
        </div>
        <slot name="title-slot" :node="node">
          <span class="title">
            {{ node[props.titleProp] }}
          </span>
        </slot>
      </div>
    </div>
    <div
      v-if="node.children && node.isOpen"
      :class="node.children[0].Img ? 'image-grid' : 'children-container'"
    >
      <tree-node
        v-for="child in node.children"
        :key="child[props.keyProp]"
        :node="child"
        :key-prop="keyProp"
        :title-prop="titleProp"
        @node-toggled="bubbleNodeToggled"
        @request="bubbleNodeRequest"
      >
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps"></slot>
        </template>
      </tree-node>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue'
import { getCurrentInstance } from 'vue'
import OLImage from 'ol/layer/Image'

import DOMPurify from 'dompurify'

const { proxy } = getCurrentInstance()
const store = inject('store')
const $mapLayers = inject('mapLayers')

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  titleProp: {
    type: String,
    default: 'name',
  },
  keyProp: {
    type: String,
    default: 'name',
  },
})

const isOpen = ref(props.node.isOpen || false)

watch(
  () => props.node.isOpen,
  (newValue) => {
    isOpen.value = newValue
  },
)

const isAnimating = computed(() => {
  return store.getIsAnimating
})
const playState = computed(() => {
  return store.getPlayState
})
const wmsSources = computed(() => {
  return store.getWmsSources
})

const img = computed(() => {
  return new URL(
    `../../assets/presets/images/${props.node.Img}.png`,
    import.meta.url,
  ).href
})

const emit = defineEmits(['nodeToggled', 'request'])

const handleClick = (node) => {
  if (node.children) toggle()
  else request(node)
}

const presetSelected = (node) => {
  return node.children.every((childNode) =>
    $mapLayers.arr.some((layer) => {
      if (layer instanceof OLImage) {
        let styleCheck = true
        if (childNode.currentStyle) {
          styleCheck = layer.get('layerCurrentStyle') === childNode.currentStyle
        } else if (
          layer.get('layerStyles').length !== 0 &&
          layer.get('layerCurrentStyle') !== layer.get('layerStyles')[0].Name
        ) {
          styleCheck = false
        }
        if (
          !childNode.Name.includes('/') &&
          Object.values(wmsSources.value)[0].source_validation
        ) {
          return (
            layer.get('layerName').split('/')[0] === childNode.Name &&
            styleCheck
          )
        }
        return layer.get('layerName') === childNode.Name && styleCheck
      }
    }),
  )
}

const multiAddLock = computed(() => store.getMultiAddLock)
const setMultiAddLock = (value) => store.setMultiAddLock(value)

const handleMultiAdd = (node) => {
  if (!multiAddLock.value) {
    setMultiAddLock(true)
    const selected = presetSelected(node)
    const nodeChildren = node.children.map((child) => child.Name)

    let toRemove = []
    if (selected) {
      for (const child of nodeChildren) {
        if (
          !child.includes('/') &&
          Object.values(wmsSources.value)[0].source_validation
        ) {
          const sourceKey = Object.keys(wmsSources.value).find(
            (key) =>
              key !== 'Presets' &&
              wmsSources.value[key]['urls'].includes(
                Object.values(wmsSources.value)[0].urls[0],
              ),
          )
          toRemove.push(
            $mapLayers.arr.find(
              (l) => l.get('layerName') === `${child}/${sourceKey}`,
            ),
          )
        } else {
          toRemove.push(
            $mapLayers.arr.find((l) => l.get('layerName') === child),
          )
        }
      }
    } else {
      toRemove = [...$mapLayers.arr]
    }

    for (const layer of toRemove) {
      const tempNode = {
        Name: layer.get('layerName'),
        isLeaf: true,
        wmsSource: layer.getSource().getUrl(),
      }
      emit('request', tempNode)
    }
    if (!selected) {
      let index = $mapLayers.arr.length
      for (const childNode of node.children) {
        childNode.zIndex = index
        emit('request', childNode)
        index++
      }
    }
    setTimeout(() => {
      setMultiAddLock(false)
    }, 500)
  }
}

const toggle = () => {
  if (props.node.children) {
    isOpen.value = !isOpen.value
    props.node.isOpen = isOpen.value
    if (props.node.isPreset) {
      const closedNodes = JSON.parse(
        localStorage.getItem('user-closed-nodes') || '[]',
      )

      if (!isOpen.value) {
        if (!closedNodes.includes(props.node.Name)) {
          closedNodes.push(props.node.Name)
        }
      } else {
        const index = closedNodes.indexOf(props.node.Name)
        if (index > -1) {
          closedNodes.splice(index, 1)
        }
      }

      localStorage.setItem('user-closed-nodes', JSON.stringify(closedNodes))
    }
    emit('nodeToggled', props.node.name, isOpen.value)
  }
}
const request = (node) => {
  if (isAnimating.value && playState.value !== 'play') return
  emit('request', node)
}

const bubbleNodeToggled = (nodeName, isOpen) => {
  emit('nodeToggled', nodeName, isOpen)
}
const bubbleNodeRequest = (node) => {
  if (isAnimating.value && playState.value !== 'play') return
  emit('request', node)
}
</script>

<style scoped>
.preset-card-container {
  padding: 8px;
  width: 100%;
}

.preset-card {
  background: rgba(var(--v-theme-surface), 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(var(--v-border-color), 0.1);
  border-radius: 16px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
  flex-direction: column;
}

.preset-card:hover {
  transform: translateY(-4px) scale(1.02);
  background: rgba(var(--v-theme-surface), 0.6);
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.preset-card.selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.preset-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.preset-card:hover .preset-image {
  transform: scale(1.1);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--v-theme-primary), 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}

.preset-card:hover .image-overlay {
  opacity: 1;
}

.overlay-icon {
  transform: scale(0.5);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.preset-card:hover .overlay-icon {
  transform: scale(1);
}

.card-content {
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.5);
}

.preset-title {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 8px;
}

.tree-node {
  width: 100%;
}

.node-content {
  cursor: pointer;
  border-radius: 10px;
  margin: 2px 4px;
  transition: all 0.2s ease;
}

.node-content:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.node-content.is-leaf {
  padding-left: 12px;
}

.content-wrapper {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  min-height: 48px;
}

.toggle-btn {
  margin-right: 4px;
}

.toggle-icon {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.leaf-icon-wrapper {
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.title {
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.children-container {
  padding-left: 24px;
  border-left: 1px dashed rgba(var(--v-border-color), 0.2);
  margin-left: 20px;
}

@media (max-width: 500px) {
  .image-grid {
    grid-template-columns: 1fr;
  }
}
</style>
