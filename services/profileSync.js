import { syncProfilesWithServer } from './profileService';

const DEFAULT_SYNC_MINUTES = 10;
let syncTimer = null;

const scheduleNextSync = () => {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(async () => {
    try {
      await syncProfilesWithServer();
    } finally {
      scheduleNextSync();
    }
  }, DEFAULT_SYNC_MINUTES * 60 * 1000);
};

export const startProfileSyncLoop = () => {
  if (syncTimer) return;
  scheduleNextSync();
};

export const stopProfileSyncLoop = () => {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
};
