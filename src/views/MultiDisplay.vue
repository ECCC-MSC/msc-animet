<template>
  <div class="page">
    <iframe
      v-for="(n, index) in displayCount"
      :key="n"
      :src="iframeSrc(index)"
      :style="getCSS(index)"
      :ref="`iframe-${index}`"
      @load="iframeLoaded(index)"
    ></iframe>
  </div>
</template>

<script>
export default {
  props: ["disp"],
  created() {
    const regex = /(1|2|3|4),(1|2|3|4),(1|2|3|4),(1|2|3|4)/;
    if (regex.test(this.disp)) {
      this.dispMatrix = this.disp.match(regex).slice(1).map(Number);
      let differentNumbers = new Set(this.dispMatrix);

      if (differentNumbers.size === this.displayCount) {
        // Rules to make sure the layout is valid:
        // - A number cannot be present exactly 3 times (would make an L shape)
        // - A number cannot appear in the diagonal unless all numbers are the same
        for (let i = 0; i < 2; i++) {
          let sameIndexList = [i];
          let other = 0;
          for (let j = i + 1; j < this.dispMatrix.length; j++) {
            if (this.dispMatrix[i] === this.dispMatrix[j]) {
              sameIndexList.push(j);
            } else {
              other = j;
            }
          }
          if (sameIndexList.length === 3) {
            if (other - 2 < 0) {
              this.dispMatrix[other + 2] = this.dispMatrix[other];
            } else {
              this.dispMatrix[other - 2] = this.dispMatrix[other];
            }
          }
        }
        if (this.displayCount !== 4) {
          if (this.dispMatrix[0] === this.dispMatrix[3]) {
            this.dispMatrix[3] = this.dispMatrix[1];
          }
          if (this.dispMatrix[1] === this.dispMatrix[2]) {
            this.dispMatrix[2] = this.dispMatrix[0];
          }
        }
      } else {
        this.setDefault();
      }
    } else {
      this.setDefault();
    }
    this.indexLoc = [...new Set(this.dispMatrix)];
    if (localStorage.getItem("displays-url") !== null) {
      const permalinks = JSON.parse(localStorage.getItem("displays-url"));
      this.permalinkInfos = permalinks;
    }
  },
  data() {
    return {
      displayCount: parseInt(this.$route.params.number, 10),
      dispMatrix: null,
      indexLoc: [],
      permalinkInfos: ["", "", "", ""],
    };
  },
  methods: {
    getCSS(index) {
      let styleObj = {
        position: "absolute",
        height: "50%",
        width: "50%",
      };
      switch (index) {
        case 0:
          styleObj["left"] = 0;
          styleObj["top"] = 0;
          if (this.dispMatrix[index] === this.dispMatrix[index + 2]) {
            styleObj["height"] = "100%";
          }
          if (this.dispMatrix[index] === this.dispMatrix[index + 1]) {
            styleObj["width"] = "100%";
          }
          return styleObj;
        case 1:
          if (this.dispMatrix[index] === this.dispMatrix[index - 1]) {
            if (this.dispMatrix[index + 1] === this.dispMatrix[index + 2]) {
              styleObj["width"] = "100%";
            }
            styleObj["bottom"] = 0;
            styleObj["left"] = 0;
          } else {
            if (this.dispMatrix[index] === this.dispMatrix[index + 2]) {
              styleObj["height"] = "100%";
            }
            styleObj["right"] = 0;
            styleObj["top"] = 0;
          }
          return styleObj;
        case 2:
          styleObj["bottom"] = 0;
          if (
            this.dispMatrix[index] === this.dispMatrix[index - 2] ||
            this.dispMatrix[index - 1] === this.dispMatrix[index - 2]
          ) {
            styleObj["right"] = 0;
          } else {
            if (this.dispMatrix[index] === this.dispMatrix[index + 1]) {
              styleObj["width"] = "100%";
            }
            styleObj["left"] = 0;
          }
          return styleObj;
        case 3:
          styleObj["bottom"] = 0;
          styleObj["right"] = 0;
          return styleObj;
      }
    },
    iframeLoaded(index) {
      // Update each permalink URL to the one currently displayed before leaving the page
      const iframe = this.$refs[`iframe-${index}`][0];
      iframe.contentWindow.onbeforeunload = () => {
        this.permalinkInfos[this.indexLoc[index] - 1] =
          iframe.contentWindow.location.href.split("?")[1];
        if (index === this.displayCount - 1) {
          localStorage.setItem(
            "displays-url",
            JSON.stringify(this.permalinkInfos)
          );
        }
      };
    },
    iframeSrc(index) {
      const permalinkIndex = this.indexLoc[index] - 1;
      const baseUrl = `${window.location.origin}/${
        window.location.pathname.split("/")[1]
      }`;
      return `${baseUrl}?${this.permalinkInfos[permalinkIndex]}`;
    },
    setDefault() {
      switch (this.displayCount) {
        case 1:
          this.dispMatrix = [1, 1, 1, 1];
          break;
        case 2:
          this.dispMatrix = [1, 2, 1, 2];
          break;
        case 3:
          this.dispMatrix = [1, 2, 1, 3];
          break;
        default:
          this.dispMatrix = [1, 2, 3, 4];
          break;
      }
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
</style>
