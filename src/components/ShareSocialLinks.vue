<template>
  <v-col cols="auto" class="d-flex justify-end">
    <v-btn
      icon
      v-for="(platform, index) in platforms"
      :key="index"
      @click="platformLink(platform)"
    >
      <v-icon> {{ platform.icon }} </v-icon>
    </v-btn>
  </v-col>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  methods: {
    prefixLink() {
      return window.location.origin + window.location.pathname;
    },
    socialTitle() {
      return this.$t("animationFrom");
    },
    socialHashtags() {
      var l = this.$t("socialWeatherHashtags");
      return l;
    },
    socialUrl() {
      return this.getPermalink ? this.getPermalink : this.prefixLink();
    },
    platformLink(plat) {
      const shareLink = plat.urlbase + this.objectToGetParams(plat.params);
      window.open(shareLink, "__blank");
    },
    objectToGetParams(object) {
      return (
        "?" +
        Object.keys(object)
          .filter((key) => !!object[key])
          .map((key) => `${key}=${encodeURIComponent(object[key])}`)
          .join("&")
      );
    },
  },
  data() {
    return {
      platforms: {
        email: {
          urlbase: "mailto:",
          params: {
            subject: this.$t("MSCAnimetEmail"),
            body: this.socialTitle() + " " + this.socialUrl(),
          },
          icon: "mdi-email",
        },
        twitter: {
          urlbase: "https://twitter.com/intent/tweet",
          params: {
            text: this.socialTitle(),
            hashtags: this.socialHashtags(),
            url: this.socialUrl(),
          },
          icon: "mdi-twitter",
        },
        facebook: {
          urlbase: "https://www.facebook.com/sharer/sharer.php",
          params: {
            title: this.socialTitle(),
            hashtag: this.socialHashtags(),
            u: this.socialUrl(),
          },
          icon: "mdi-facebook",
        },
        linkedin: {
          urlbase: "https://linkedin.com/shareArticle",
          params: {
            url: this.socialUrl(),
          },
          icon: "mdi-linkedin",
        },
        mastodon_social: {
          urlbase: "https://mastodon.social/share",
          params: {
            title: this.socialTitle(),
            url: this.socialUrl(),
          },
          icon: "mdi-mastodon",
        },
      },
    };
  },
  computed: {
    ...mapGetters("Layers", ["getPermalink"]),
  },
};
</script>
