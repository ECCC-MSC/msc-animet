<template>
  <div class="page">
    <iframe
      v-for="(n, index) in 4"
      :key="n"
      :src="iframeSrc(index)"
      class="quadrant"
      :ref="`iframe-${index}`"
      @load="iframeLoaded(index)"
    ></iframe>
  </div>
</template>

<script>
export default {
  mounted() {
    if (localStorage.getItem("displays-url") !== null) {
      const permalinks = JSON.parse(localStorage.getItem("displays-url"));
      this.permalinkInfos = permalinks;
    }
  },
  data() {
    return {
      permalinkInfos: ["", "", "", ""],
    };
  },
  methods: {
    iframeLoaded(index) {
      // Update each permalink URL to the one currently displayed before leaving the page
      const iframe = this.$refs[`iframe-${index}`][0];
      iframe.contentWindow.onbeforeunload = () => {
        this.permalinkInfos[index] =
          iframe.contentWindow.location.href.split("?")[1];
        if (index === 3) {
          localStorage.setItem(
            "displays-url",
            JSON.stringify(this.permalinkInfos)
          );
        }
      };
    },
    iframeSrc(index) {
      const baseUrl = `${window.location.origin}/${
        window.location.pathname.split("/")[1]
      }`;
      return `${baseUrl}?${this.permalinkInfos[index]}`;
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
