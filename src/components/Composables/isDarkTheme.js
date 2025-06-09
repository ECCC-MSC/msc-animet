import { computed } from 'vue'
import { useTheme } from 'vuetify'

export function isDarkTheme() {
  const theme = useTheme()
  const isDark = computed(() => {
    return theme.global.current.value?.dark || false
  })

  return { isDark, theme }
}
