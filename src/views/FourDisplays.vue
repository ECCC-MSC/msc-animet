<template>
  <div class="page">
    <iframe v-for="n in 4" :key="n" :src="iframeSrc" class="quadrant"></iframe>
  </div>
</template>

<script>
export default {
  computed: {
    iframeSrc() {
      return `${window.location.origin}/${
        window.location.pathname.split("/")[1]
      }`;
    },
  },
};
</script>

<style scoped>
.page {
  height: 100%;
  padding: 0;
  margin: 0;
}
.quadrant {
  width: 50%;
  height: 50%;
  float: left;
}
</style>
