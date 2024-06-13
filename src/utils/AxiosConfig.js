import axios from "axios";
import axiosRetry from "axios-retry";

axiosRetry(axios, {
  retries: 4,
  retryDelay: (retryCount) => {
    return retryCount * 800;
  },
});

export default axios;
