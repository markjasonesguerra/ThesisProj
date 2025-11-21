import client from './client';

export const login = (payload) => client.post('/api/auth/login', payload);

export const signup = (payload) => client.post('/api/auth/signup', payload);

export const submitMembershipApplication = (payload) => client.post('/api/auth/register', payload);

export const updateUserProfile = (userId, payload) => client.put(`/api/users/${userId}`, payload);
