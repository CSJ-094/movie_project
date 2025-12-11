import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:8484/api',
    withCredentials: true,
});
axiosInstance.defaults.xsrfCookieName = 'XSRF-TOKEN';
axiosInstance.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

// 요청 인터셉터 (Request Interceptor)
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;