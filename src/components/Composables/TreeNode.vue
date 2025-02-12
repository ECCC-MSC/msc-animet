<template>
  <div v-if="node.children && node.Img">
    <img
      :src="img"
      class="image"
      @click="handleMultiAdd(node)"
    ></img>
    <span class="image-title">{{ node.Title }}</span>
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
  return new URL(`../../assets/presets/images/${props.node.Img}.png`, import.meta.url)
    .href
})

const emit = defineEmits(['nodeToggled', 'request'])

const handleClick = (node) => {
  if (node.children) toggle()
  else request(node)
}

const handleMultiAdd = (node) => {
  const missingNames = node.children.filter(
    (childNode) =>
      !proxy.$mapLayers.arr.some(
        (layer) => layer.get('layerName') === childNode.Name,
      ),
  )
  if (missingNames.length > 0 && missingNames.length < node.children.length) {
    for (const childNode of missingNames) {
      emit('request', childNode)
    }
  } else {
    for (const childNode of node.children) {
      emit('request', childNode)
    }
  }
}

const toggle = () => {
  if (props.node.children) {
    isOpen.value = !isOpen.value
    props.node.isOpen = isOpen.value
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
</style>
