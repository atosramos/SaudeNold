import { refreshAccessToken } from './auth';

const DEFAULT_REFRESH_MINUTES = 13;
let refreshTimer = null;

const scheduleNextRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(async () => {
    const token = await refreshAccessToken();
    if (token) {
      scheduleNextRefresh();
    } else {
      stopTokenRefreshLoop();
    }
  }, DEFAULT_REFRESH_MINUTES * 60 * 1000);
};

export const startTokenRefreshLoop = async () => {
  if (refreshTimer) {
    return;
  }
  scheduleNextRefresh();
};

export const stopTokenRefreshLoop = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};
