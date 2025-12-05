import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:8484/api',
    withCredentials: true,
});

// Spring Security의 CSRF 기본 설정과 연동합니다.
// axios는 이 설정에 따라 'XSRF-TOKEN' 쿠키를 읽어 'X-XSRF-TOKEN' 헤더에 자동으로 추가합니다.
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