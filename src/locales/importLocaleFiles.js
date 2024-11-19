// src/locales/importLocale.js
const importEnLocaleFiles = import.meta.glob('./en/layers_*.json', {eager: true});
const importFrLocaleFiles = import.meta.glob('./fr/layers_*.json', {eager: true});

let enLocaleData = {};
let frLocaleData = {};

// Process English locales
for (const path in importEnLocaleFiles) {
  const sourceName = path.match(/layers_(.+)\.json$/)[1];
  enLocaleData[sourceName] = importEnLocaleFiles[path].default;
}

// Process French locales
for (const path in importFrLocaleFiles) {
  const sourceName = path.match(/layers_(.+)\.json$/)[1];
  frLocaleData[sourceName] = importFrLocaleFiles[path].default;
}

const localeData = { enLocaleData, frLocaleData };

export default localeData;
