import api from './client';

// ─── Auth ────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// ─── Challenges ──────────────────────────────────────
export const challengesAPI = {
  getAll: () => api.get('/challenges').then((r) => r.data),
  submitFlag: (id, flag) => api.post(`/challenges/${id}/submit`, { flag }).then((r) => r.data),
  getCategories: () => api.get('/challenges/categories').then((r) => r.data),
  getUserStats: () => api.get('/challenges/stats').then((r) => r.data),
};

// ─── Admin ───────────────────────────────────────────
export const adminChallengesAPI = {
  getAll: () => api.get('/admin/challenges').then((r) => r.data),
  create: (data) => api.post('/admin/challenges', data).then((r) => r.data),
  update: (id, data) => api.put(`/admin/challenges/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/admin/challenges/${id}`).then((r) => r.data),
  getStats: () => api.get('/admin/stats').then((r) => r.data),
  getHealth: () => api.get('/admin/health').then((r) => r.data),
  getJoinRequests: () => api.get('/admin/join-requests').then((r) => r.data),
};

export const adminUsersAPI = {
  getAll: () => api.get('/admin/users').then((r) => r.data),
  updateRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  delete: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
};

// ─── Leaderboard ─────────────────────────────────────
export const leaderboardAPI = {
  getRankings: () => api.get('/leaderboard').then((r) => r.data),
  getChartData: () => api.get('/leaderboard/chart').then((r) => r.data),
};

// ─── Teams ───────────────────────────────────────────
export const teamsAPI = {
  getAll: () => api.get('/teams').then((r) => r.data),
  getById: (id) => api.get(`/teams/${id}`).then((r) => r.data),
  getActivity: (id) => api.get(`/teams/${id}/activity`).then((r) => r.data),
  create: (name) => api.post('/teams/create', { name }).then((r) => r.data),
  requestJoin: (team_id) => api.post('/teams/request-join', { team_id }).then((r) => r.data),
  myRequests: () => api.get('/teams/my-requests').then((r) => r.data),
  pendingRequests: () => api.get('/teams/pending-requests').then((r) => r.data),
  approveRequest: (id) => api.post(`/teams/requests/${id}/approve`).then((r) => r.data),
  rejectRequest: (id) => api.post(`/teams/requests/${id}/reject`).then((r) => r.data),
  transferCaptain: (new_captain_id) => api.put('/teams/transfer-captain', { new_captain_id }).then((r) => r.data),
};

// ─── Announcements ───────────────────────────────────
export const announcementsAPI = {
  getAll: () => api.get('/announcements').then((r) => r.data),
  create: (data) => api.post('/admin/announcements', data).then((r) => r.data),
};

// ─── Activity Feed ───────────────────────────────────
export const activityAPI = {
  getGlobal: ({ limit = 20 } = {}) => api.get(`/activity?limit=${limit}`).then((r) => r.data),
};
