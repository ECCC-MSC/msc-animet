import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          snackbarBackground: '#424242',
          snackbarText: '#eeeeee',
          primary: '#1689E7',
          accent: '#4CBB99',
          secondary: '#7BC6FF',
          success: '#4CAF50',
          info: '#2196F3',
          warning: '#FB8C00',
          error: '#FF5252',
        },
      },
      light: {
        colors: {
          primary: '#1689E7',
          accent: '#4CBB99',
          secondary: '#7BC6FF',
          success: '#4CAF50',
          info: '#2196F3',
          warning: '#FB8C00',
          error: '#FF5252',
        },
      },
    },
  },
})
