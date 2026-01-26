import api from './api';

export const fetchFamilyProfiles = async () => {
  const response = await api.get('/api/family/profiles');
  return response.data;
};

export const fetchFamilyLinks = async () => {
  const response = await api.get('/api/family/links');
  return response.data;
};

export const fetchFamilyInvites = async () => {
  const response = await api.get('/api/family/invites');
  return response.data;
};

export const createFamilyInvite = async (inviteeEmail = null, permissions = null) => {
  const response = await api.post('/api/family/invite-adult', {
    invitee_email: inviteeEmail || null,
    permissions: permissions || null,
  });
  return response.data;
};

export const acceptFamilyInvite = async (code) => {
  const response = await api.post('/api/family/accept-invite', { code });
  return response.data;
};

export const cancelFamilyInvite = async (inviteId) => {
  const response = await api.delete(`/api/family/invite/${inviteId}`);
  return response.data;
};

export const resendFamilyInvite = async (inviteId) => {
  const response = await api.post(`/api/family/invite/${inviteId}/resend`);
  return response.data;
};

export const createFamilyLink = async (targetProfileId) => {
  const response = await api.post('/api/family/links', { target_profile_id: targetProfileId });
  return response.data;
};

export const acceptFamilyLink = async (linkId) => {
  const response = await api.post(`/api/family/links/${linkId}/accept`);
  return response.data;
};

export const fetchFamilyDataShares = async () => {
  const response = await api.get('/api/family/data-shares');
  return response.data;
};

export const createFamilyDataShare = async (toProfileId, permissions = {}) => {
  const response = await api.post('/api/family/data-shares', {
    to_profile_id: toProfileId,
    permissions,
  });
  return response.data;
};

export const revokeFamilyDataShare = async (shareId) => {
  const response = await api.delete(`/api/family/data-shares/${shareId}`);
  return response.data;
};

export const deleteFamilyProfile = async (profileId) => {
  const response = await api.delete(`/api/family/profiles/${profileId}`);
  return response.data;
};

export const addFamilyChild = async (memberData) => {
  const response = await api.post('/api/family/add-child', memberData);
  return response.data;
};

export const addFamilyAdult = async (memberData) => {
  const response = await api.post('/api/family/add-adult', memberData);
  return response.data;
};

export const addFamilyElder = async (memberData) => {
  const response = await api.post('/api/family/add-elder', memberData);
  return response.data;
};
