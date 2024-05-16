<template>
  <div class="progress" v-if="loading">
    <div class="indeterminate"></div>
  </div>
</template>

<script>
export default {
  name: "LoadingBar",
  props: ["loading"],
};
</script>

<style scoped>
.progress {
  position: fixed;
  bottom: 0;
  left: 0;
  height: 2px;
  display: block;
  width: 100%;
  background-color: #7fb7e4;
  border-radius: 2px;
  background-clip: padding-box;
  overflow: hidden;
}

.indeterminate {
  background-color: #1689e7;
}

.indeterminate:before,
.indeterminate:after {
  content: "";
  position: absolute;
  background-color: inherit;
  top: 0;
  left: 0;
  bottom: 0;
  will-change: left, right;
}

.indeterminate:before {
  animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
}

.indeterminate:after {
  animation: indeterminate-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1)
    infinite;
  animation-delay: 1.15s;
}

@keyframes indeterminate {
  0% {
    left: -35%;
    right: 100%;
  }
  60% {
    left: 100%;
    right: -90%;
  }
  100% {
    left: 100%;
    right: -90%;
  }
}

@keyframes indeterminate-short {
  0% {
    left: -200%;
    right: 100%;
  }
  60% {
    left: 107%;
    right: -8%;
  }
  100% {
    left: 107%;
    right: -8%;
  }
}
</style>
