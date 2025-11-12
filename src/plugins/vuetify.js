import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          surface: '#323235',
          'on-surface': '#f0f0f0',
          snackbarBackground: '#424242',
          snackbarText: '#eeeeee',
          primary: '#1689E7',
          accent: '#4CBB99',
          secondary: '#7BC6FF',
          success: '#4CAF50',
          info: '#2196F3',
          warning: '#e27d01',
          error: '#FF5252',
        },
      },
      light: {
        colors: {
          surface: '#F5F5F3',
          'on-surface': '#2e2e2e',
          primary: '#1689E7',
          accent: '#4CBB99',
          secondary: '#7BC6FF',
          success: '#4CAF50',
          info: '#2196F3',
          warning: '#e27d01',
          error: '#FF5252',
        },
      },
    },
  },
})
