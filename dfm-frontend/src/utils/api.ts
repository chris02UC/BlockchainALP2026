import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Points to your Express backend
  headers: {
    'Content-Type': 'application/json',
  },
});