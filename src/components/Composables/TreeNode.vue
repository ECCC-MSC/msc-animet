<template>
  <div v-if="node.children && node.Img">
    <img
      :src="img"
      class="image"
      :class="{ selected: presetSelected(node) }"
      @click="handleMultiAdd(node)"
    />
    <span
      class="image-title"
      v-html="DOMPurify.sanitize(node[`Title_${$i18n.locale}`])"
    ></span>
  </div>
  <div v-else class="tree-node">
    <div @click="handleClick(node)" class="node-content">
      <div class="content-wrapper">
        <v-icon v-if="node.children" class="toggle-icon">
          {{ node.isOpen ? 'mdi-menu-down' : 'mdi-menu-right' }}
        </v-icon>
        <slot v-else name="node-icon" :node="node">
          <!-- Leaf prepend icon slot content -->
        </slot>
        <slot name="title-slot" :node="node">
          <!-- Default node content slot -->
          <span class="title">
            {{ node[props.titleProp] }}
          </span>
        </slot>
      </div>
    </div>
    <div
      v-if="node.children && node.isOpen"
      :class="node.children[0].Img ? 'image-grid' : 'children'"
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
    proxy.$mapLayers.arr.some((layer) => {
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
        toRemove.push(
          proxy.$mapLayers.arr.find((l) => l.get('layerName') === child),
        )
      }
    } else {
      toRemove = [...proxy.$mapLayers.arr]
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
      let index = proxy.$mapLayers.arr.length
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
        // Node is now closed - add to closed list if not already there
        if (!closedNodes.includes(props.node.Name)) {
          closedNodes.push(props.node.Name)
        }
      } else {
        // Node is now open - remove from closed list
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

// Bubble up the event for the nested tree-nodes
const bubbleNodeToggled = (nodeName, isOpen) => {
  emit('nodeToggled', nodeName, isOpen)
}
const bubbleNodeRequest = (node) => {
  if (isAnimating.value && playState.value !== 'play') return
  emit('request', node)
}
</script>

<style scoped>
.image {
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  height: auto;
  object-fit: contain;
  vertical-align: top;
}
.selected {
  border: 3px solid #007bff;
  transform: scale(1.08);
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 10px;
  row-gap: 0;
  padding-left: 20px;
  padding-right: 20px;
}
.image-title {
  display: block;
  text-align: center;
  font-size: 0.8em;
  padding-bottom: 5px;
  padding-top: 5px;
  line-height: 1.2;
  white-space: normal;
  word-break: break-word;
  width: 100%;
}
.children {
  padding-left: 20px;
}
.content-wrapper {
  align-items: center;
  display: flex;
  max-height: 38px;
}
.node-content {
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  white-space: nowrap;
}
.node-content:hover {
  background-color: rgba(211, 211, 211, 0.2);
  transition: background-color 0.3s ease;
}
.title {
  overflow: hidden;
  text-overflow: ellipsis;
}
.toggle-icon {
  width: 20px;
}
.tree-node {
  line-height: 1.8;
  position: relative;
}
@media (max-width: 500px) {
  .image-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
