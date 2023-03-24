<template>
  <v-col cols="auto" class="d-flex justify-end">
    <v-btn icon @click="platformLink(facebook)">
      <v-icon> mdi-facebook </v-icon>
    </v-btn>

    <v-btn icon @click="platformLink(twitter)">
      <v-icon> mdi-twitter </v-icon>
    </v-btn>

    <v-btn icon @click="platformLink(email)">
      <v-icon> mdi-email </v-icon>
    </v-btn>

    <v-btn icon @click="platformLink(linkedin)">
      <v-icon> mdi-linkedin </v-icon>
    </v-btn>

    <v-btn icon @click="platformLink(mastodon_social)">
      <v-icon> mdi-mastodon </v-icon>
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
  computed: {
    ...mapGetters("Layers", ["getPermalink"]),
    linkedin() {
      return {
        urlbase: "https://linkedin.com/shareArticle",
        params: {
          url: this.socialUrl(),
        },
      };
    },
    facebook() {
      return {
        urlbase: "https://www.facebook.com/sharer/sharer.php",
        params: {
          title: this.socialTitle(),
          hashtag: this.socialHashtags(),
          u: this.socialUrl(),
        },
      };
    },
    twitter() {
      return {
        urlbase: "https://twitter.com/intent/tweet",
        params: {
          text: this.socialTitle(),
          hashtags: this.socialHashtags(),
          url: this.socialUrl(),
        },
      };
    },
    mastodon_social() {
      return {
        urlbase: "https://mastodon.social/share",
        params: {
          title: this.socialTitle(),
          url: this.socialUrl(),
        },
      };
    },
    email() {
      return {
        urlbase: "mailto:",
        params: {
          subject: this.$t("MSCAnimetEmail"),
          body: this.socialTitle() + " " + this.socialUrl(),
        },
      };
    },
  },
};
</script>
