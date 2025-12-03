import axios from 'axios';

const axiosInstance = axios.create({
    // 백엔드 API의 기본 URL을 설정합니다.
    baseURL: 'http://localhost:8484/api', 
});

// 요청 인터셉터 (Request Interceptor)
// 모든 요청이 보내지기 전에 이 함수가 실행됩니다.
axiosInstance.interceptors.request.use(
    (config) => {
        // localStorage에서 accessToken을 가져옵니다.
        const token = localStorage.getItem('accessToken');

        // 토큰이 존재하면, 모든 요청의 Authorization 헤더에 토큰을 추가합니다.
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // 요청 에러 처리
        return Promise.reject(error);
    }
);

export default axiosInstance;