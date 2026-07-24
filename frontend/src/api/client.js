import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(new Error(error.response?.data?.message || error.message || 'Request failed.'))
);

export default api;
