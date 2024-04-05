<template>
  <div class="page">
    <iframe
      v-for="n in 4"
      :key="n"
      src="https://eccc-msc.github.io/msc-animet/"
      class="quadrant"
    ></iframe>
  </div>
</template>

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
