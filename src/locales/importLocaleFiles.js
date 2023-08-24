// For 'en' translations
const importEnLocaleFiles = require.context(
  ".",
  true,
  /^\.\/en\/layers_.+\.json$/
);
let enLocaleData = {};

importEnLocaleFiles.keys().forEach((fileName) => {
  const sourceName = fileName.match(/layers_(.+)\.json$/)[1];
  enLocaleData[sourceName] = importEnLocaleFiles(fileName);
});

// For 'fr' translations
const importFrLocaleFiles = require.context(
  ".",
  true,
  /^\.\/fr\/layers_.+\.json$/
);
let frLocaleData = {};

importFrLocaleFiles.keys().forEach((fileName) => {
  const sourceName = fileName.match(/layers_(.+)\.json$/)[1];
  frLocaleData[sourceName] = importFrLocaleFiles(fileName);
});

let localeData = { enLocaleData, frLocaleData };

export default localeData;
