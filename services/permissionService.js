/**
 * Permission Service - Frontend
 * 
 * Provides permission checking functions for the frontend.
 * Works offline-first, checking permissions locally and syncing with backend when available.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { getActiveProfile } from './profileService';

// Permission constants (matching backend)
export const ACCOUNT_TYPES = {
  FAMILY_ADMIN: 'family_admin',
  ADULT_MEMBER: 'adult_member',
  CHILD: 'child',
  ELDER_UNDER_CARE: 'elder_under_care',
};

export const ACTIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  DELETE: 'delete',
  SHARE: 'share',
  MANAGE_PROFILES: 'manage_profiles',
};

export const ACCESS_LEVELS = {
  READ_ONLY: 'read_only',
  READ_WRITE: 'read_write',
  FULL: 'full',
};

// Permission matrix (matching backend)
const ACCOUNT_PERMISSIONS = {
  [ACCOUNT_TYPES.FAMILY_ADMIN]: {
    can_manage_profiles: true,
    can_view_family_data: true,
    can_edit_family_data: true,
    can_delete_family_data: true,
    can_share_data: true,
  },
  [ACCOUNT_TYPES.ADULT_MEMBER]: {
    can_manage_profiles: false,
    can_view_family_data: true,
    can_edit_family_data: true,
    can_delete_family_data: false,
    can_share_data: true,
  },
  [ACCOUNT_TYPES.CHILD]: {
    can_manage_profiles: false,
    can_view_family_data: false,
    can_edit_family_data: false,
    can_delete_family_data: false,
    can_share_data: false,
  },
  [ACCOUNT_TYPES.ELDER_UNDER_CARE]: {
    can_manage_profiles: false,
    can_view_family_data: true,
    can_edit_family_data: false,
    can_delete_family_data: false,
    can_share_data: false,
  },
};

/**
 * Get user account type from storage
 */
export const getUserAccountType = async () => {
  try {
    const userStr = await AsyncStorage.getItem('authUser');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.account_type || ACCOUNT_TYPES.FAMILY_ADMIN;
  } catch (error) {
    console.error('Error getting user account type:', error);
    return null;
  }
};

/**
 * Get active profile
 */
export const getActiveProfileData = async () => {
  try {
    const profile = await getActiveProfile();
    return profile;
  } catch (error) {
    console.error('Error getting active profile:', error);
    return null;
  }
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = async (permission) => {
  try {
    const accountType = await getUserAccountType();
    if (!accountType) return false;
    
    const permissions = ACCOUNT_PERMISSIONS[accountType] || {};
    return permissions[permission] === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Check if user can perform action on own data
 */
export const canPerformActionOnOwnData = async (action) => {
  try {
    const accountType = await getUserAccountType();
    if (!accountType) return false;
    
    const permissions = ACCOUNT_PERMISSIONS[accountType] || {};
    
    switch (action) {
      case ACTIONS.VIEW:
        return true; // Users can always view their own data
      case ACTIONS.EDIT:
        return permissions.can_edit_family_data === true;
      case ACTIONS.DELETE:
        return accountType === ACCOUNT_TYPES.FAMILY_ADMIN;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking own data permission:', error);
    return false;
  }
};

/**
 * Check if user can perform action on profile
 * This checks local permissions and optionally syncs with backend
 */
export const canPerformActionOnProfile = async (profileId, action) => {
  try {
    const activeProfile = await getActiveProfileData();
    if (!activeProfile) return false;
    
    // Own profile
    if (activeProfile.id === profileId) {
      return await canPerformActionOnOwnData(action);
    }
    
    // Check if user is family_admin (can access all family profiles)
    const accountType = await getUserAccountType();
    if (accountType === ACCOUNT_TYPES.FAMILY_ADMIN) {
      // Verify profile belongs to same family (would need to check locally or with backend)
      // For now, assume true if we have the profile locally
      const profileKey = `profile_${profileId}_data`;
      const profileData = await AsyncStorage.getItem(profileKey);
      if (profileData) {
        const profile = JSON.parse(profileData);
        // Check if same family (would need family_id stored)
        return true; // Simplified - should verify family_id
      }
    }
    
    // Check caregiver access (stored locally)
    const caregiverKey = `profile_${profileId}_caregiver_access`;
    const caregiverData = await AsyncStorage.getItem(caregiverKey);
    if (caregiverData) {
      const caregiver = JSON.parse(caregiverData);
      return canPerformActionWithAccessLevel(caregiver.access_level, action);
    }
    
    // Check data sharing (stored locally)
    const shareKey = `profile_${profileId}_data_share`;
    const shareData = await AsyncStorage.getItem(shareKey);
    if (shareData) {
      const share = JSON.parse(shareData);
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return false; // Expired
      }
      const permissions = share.permissions || {};
      switch (action) {
        case ACTIONS.VIEW:
          return permissions.can_view === true;
        case ACTIONS.EDIT:
          return permissions.can_edit === true;
        case ACTIONS.DELETE:
          return permissions.can_delete === true;
        default:
          return false;
      }
    }
    
    // Check if can view family data (read-only)
    if (action === ACTIONS.VIEW) {
      return await hasPermission('can_view_family_data');
    }
    
    return false;
  } catch (error) {
    console.error('Error checking profile permission:', error);
    return false;
  }
};

/**
 * Check if access level allows action
 */
export const canPerformActionWithAccessLevel = (accessLevel, action) => {
  if (accessLevel === ACCESS_LEVELS.FULL) {
    return true;
  }
  if (accessLevel === ACCESS_LEVELS.READ_WRITE) {
    return action === ACTIONS.VIEW || action === ACTIONS.EDIT;
  }
  if (accessLevel === ACCESS_LEVELS.READ_ONLY) {
    return action === ACTIONS.VIEW;
  }
  return false;
};

/**
 * Sync permissions from backend
 * Call this when app comes online or after login
 */
export const syncPermissionsFromBackend = async () => {
  try {
    const activeProfile = await getActiveProfileData();
    if (!activeProfile) return;
    
    // Fetch caregiver relationships
    try {
      const response = await api.get('/api/family/caregivers');
      if (response.data) {
        // Store locally
        for (const caregiver of response.data) {
          const key = `profile_${caregiver.profile_id}_caregiver_access`;
          await AsyncStorage.setItem(key, JSON.stringify(caregiver));
        }
      }
    } catch (error) {
      console.warn('Error syncing caregivers:', error);
    }
    
    // Fetch data shares
    try {
      const response = await api.get('/api/family/data-shares');
      if (response.data) {
        // Store locally
        for (const share of response.data) {
          const key = `profile_${share.from_profile_id}_data_share`;
          await AsyncStorage.setItem(key, JSON.stringify(share));
        }
      }
    } catch (error) {
      console.warn('Error syncing data shares:', error);
    }
  } catch (error) {
    console.error('Error syncing permissions:', error);
  }
};

/**
 * Clear all permission data (on logout)
 */
export const clearPermissions = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const permissionKeys = keys.filter(key => 
      key.includes('_caregiver_access') || key.includes('_data_share')
    );
    await AsyncStorage.multiRemove(permissionKeys);
  } catch (error) {
    console.error('Error clearing permissions:', error);
  }
};
