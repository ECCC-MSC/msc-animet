<template>
  <v-col cols="auto" class="d-flex justify-end pa-2">
    <v-btn
      v-for="(platform, index) in platforms"
      :key="index"
      class="rounded-circle"
      size="36"
      variant="text"
      @click="platformLink(platform)"
    >
      <v-icon size="26"> {{ platform.icon }} </v-icon>
    </v-btn>
  </v-col>
</template>

<script>
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'

export default {
  setup() {
    const { t } = useI18n()
    const store = inject('store')

    const prefixLink = () => {
      return window.location.origin + window.location.pathname
    }

    const socialTitle = () => {
      return t('AnimationFrom')
    }

    const socialHashtags = () => {
      return t('SocialWeatherHashtags')
    }

    const socialUrl = () => {
      return permalink.value ? permalink.value : prefixLink()
    }

    const platformLink = (plat) => {
      const shareLink = plat.urlbase + objectToGetParams(plat.params)
      window.open(shareLink, '__blank')
    }

    const objectToGetParams = (object) => {
      return (
        '?' +
        Object.keys(object)
          .filter((key) => !!object[key])
          .map((key) => `${key}=${encodeURIComponent(object[key])}`)
          .join('&')
      )
    }

    const permalink = computed(() => store.getPermalink)

    const platforms = {
      email: {
        urlbase: 'mailto:',
        params: {
          subject: t('MSCAnimetEmail'),
          body: socialTitle() + ' ' + socialUrl(),
        },
        icon: 'mdi-email',
      },
      twitter: {
        urlbase: 'https://twitter.com/intent/tweet',
        params: {
          text: socialTitle(),
          hashtags: socialHashtags(),
          url: socialUrl(),
        },
        icon: 'mdi-twitter',
      },
      facebook: {
        urlbase: 'https://www.facebook.com/sharer/sharer.php',
        params: {
          title: socialTitle(),
          hashtag: socialHashtags(),
          u: socialUrl(),
        },
        icon: 'mdi-facebook',
      },
      linkedin: {
        urlbase: 'https://linkedin.com/shareArticle',
        params: {
          url: socialUrl(),
        },
        icon: 'mdi-linkedin',
      },
      mastodon_social: {
        urlbase: 'https://mastodon.social/share',
        params: {
          title: socialTitle(),
          url: socialUrl(),
        },
        icon: 'mdi-mastodon',
      },
    }
    return { platforms, platformLink }
  },
}
</script>
