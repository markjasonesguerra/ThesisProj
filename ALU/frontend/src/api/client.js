import axios from 'axios';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL ?? 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const token = localStorage.getItem('adminToken');
if (token) {
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default client;
