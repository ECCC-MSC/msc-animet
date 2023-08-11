const importLocaleFiles = require.context(
  ".",
  true,
  /^\.\/en\/layers_.+\.json$/
);

let localeData = {};

importLocaleFiles.keys().forEach((fileName) => {
  const sourceName = fileName.match(/layers_(.+)\.json$/)[1];

  localeData[sourceName] = importLocaleFiles(fileName);
});

export default localeData;
