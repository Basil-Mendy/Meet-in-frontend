import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8001/api/",
});

// 🔐 Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔄 Handle 401 errors and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh");
        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem("access");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        const response = await axios.post(
          "http://127.0.0.1:8000/api/auth/refresh/",
          { refresh: refreshToken }
        );

        const newAccessToken = response.data.access;
        localStorage.setItem("access", newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
