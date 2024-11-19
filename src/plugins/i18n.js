import { createI18n } from 'vue-i18n';
import localeData from '../locales/importLocaleFiles';

const enCommonPath = '../locales/en/common.json'
let en = {...import.meta.glob('../locales/en/common.json', {eager: true})[enCommonPath]};
for (const src in localeData['enLocaleData']) {
  Object.assign(en, localeData['enLocaleData'][src]);
}

const frCommonPath = '../locales/fr/common.json'
let fr = {...import.meta.glob('../locales/fr/common.json', {eager: true})[frCommonPath]};
for (const src in localeData['frLocaleData']) {
  Object.assign(fr, localeData['frLocaleData'][src]);
}

const messages = {
  en: en,
  fr: fr,
};

let locale = navigator.language.split('-')[0];

export default createI18n({
  legacy: false,
  locale: locale,
  fallbackLocale: 'en',
  messages,
  silentFallbackWarn: true,
});
