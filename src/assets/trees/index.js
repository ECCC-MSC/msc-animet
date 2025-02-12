const modules = {}
const files = import.meta.glob(['./*.js', '../presets/*.js'], { eager: true })

Object.keys(files).forEach((key) => {
  if (key === './index.js') return
  const fileName = key.split('/').pop().replace('.js', '')
  modules[fileName] = files[key].default
})

export default modules
