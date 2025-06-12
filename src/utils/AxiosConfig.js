import axios from 'axios'
import axiosRetry from 'axios-retry'

axiosRetry(axios, {
  retries: 4,
  retryDelay: (retryCount) => retryCount * 800,
  retryCondition: (error) => error.response && error.response.status === 401,
})

export default axios
