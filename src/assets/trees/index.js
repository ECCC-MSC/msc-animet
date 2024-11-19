const modules = {};
const files = import.meta.glob('./*.js', {eager: true});

Object.keys(files).forEach(key => {
  if (key === './index.js') return;
  modules[key.replace(/(\.\/|\.js)/g, '')] = files[key].default;
});

export default modules;

