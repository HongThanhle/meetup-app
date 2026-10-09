import axios from 'axios';

// ĐỔI URL này thành backend thật của bạn (Render, ngrok...)
const BASE_URL = 'https://meetup-app-backend-c8au.onrender.com';
// Tạo 1 instance axios riêng để tự động gắn token vào mọi request
export function createApiClient(token) {
  const client = axios.create({ baseURL: BASE_URL });
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return client;
}

// ----- Auth -----
export async function register({ name, email, password }) {
  const response = await axios.post(`${BASE_URL}/auth/register`, { name, email, password });
  return response.data; // { token, user }
}

export async function login({ email, password }) {
  const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return response.data; // { token, user }
}

// ----- Group -----
export async function createGroup(token, { groupName }) {
  const client = createApiClient(token);
  const response = await client.post('/groups', { groupName });
  return response.data; // { groupId, inviteCode, groupName }
}

export async function getMyGroups(token) {
  const client = createApiClient(token);
  const response = await client.get('/groups');
  return response.data;
}

export async function leaveGroup(token, { groupId }) {
  const client = createApiClient(token);
  const response = await client.post(`/groups/${groupId}/leave`);
  return response.data;
}

export async function joinGroup(token, { inviteCode }) {
  const client = createApiClient(token);
  const response = await client.post('/groups/join', { inviteCode });
  return response.data; // { groupId, groupName }
}

export async function getGroupStatus(token, groupId) {
  const client = createApiClient(token);
  const response = await client.get(`/groups/${groupId}/status`);
  return response.data; // { members: [{ userId, name, isLeader, hasSubmitted }], finalizedPlace }
}

// ----- Location -----
export async function submitGPSLocation(token, { groupId, lat, lng }) {
  const client = createApiClient(token);
  const response = await client.post(`/groups/${groupId}/location`, {
    source: 'gps',
    lat,
    lng,
  });
  return response.data;
}

export async function geocodePreview(token, { address }) {
  const client = createApiClient(token);
  const response = await client.post('/geocode-preview', { address });
  return response.data; // { lat, lng, matchedAddress }
}

export async function confirmManualLocation(token, { groupId, lat, lng, address }) {
  const client = createApiClient(token);
  const response = await client.post(`/groups/${groupId}/location`, {
    source: 'manual',
    lat,
    lng,
    address,
  });
  return response.data;
}

export async function reverseGeocode(token, { lat, lng }) {
  const client = createApiClient(token);
  const response = await client.post('/reverse-geocode', { lat, lng });
  return response.data; // { address }
}

// ----- Suggestions -----
export async function getSuggestions(token, groupId) {
  const client = createApiClient(token);
  const response = await client.get(`/groups/${groupId}/suggest`);
  return response.data; // { centroid, viewerLocation, suggestions: [...] }
}

export async function getRouteToSuggestion(token, groupId, { lat, lng }) {
  const client = createApiClient(token);
  const response = await client.post(`/groups/${groupId}/route`, { lat, lng });
  return response.data; // { coordinates: [[lng, lat], ...], distanceMeters, durationSeconds }
}

// ----- Vote -----
export async function castVote(token, { groupId, placeId, placeName, lat, lng }) {
  const client = createApiClient(token);
  const response = await client.post(`/groups/${groupId}/vote`, {
    placeId,
    placeName,
    lat,
    lng,
  });
  return response.data; // tally entries include voterIds and voterNames
}

export async function getVoteResults(token, groupId) {
  const client = createApiClient(token);
  const response = await client.get(`/groups/${groupId}/vote-results`);
  return response.data; // tally entries include voterIds and voterNames
}

export async function finalizeMeetupPlace(token, { groupId, placeId, placeName, lat, lng, address }) {
  const client = createApiClient(token);
  const response = await client.post(`/groups/${groupId}/finalize`, {
    placeId,
    placeName,
    lat,
    lng,
    address,
  });
  return response.data; // { finalizedPlace }
}