/**
 * Storage Manager
 * Manages storage quota and monitoring
 */

class StorageManager {
  constructor() {
    this.storageInfo = null;
  }

  /**
   * Initialize storage manager
   */
  init() {
    this.storageInfo = document.getElementById('storage-info');
    this.updateStorageInfo();
  }

  /**
   * Check storage quota
   * @returns {Promise<Object>} Storage estimate
   */
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const percentUsed = (estimate.usage / estimate.quota) * 100;

        return {
          usage: estimate.usage,
          quota: estimate.quota,
          percentUsed: percentUsed.toFixed(2),
          available: estimate.quota - estimate.usage,
          usageFormatted: this.formatBytes(estimate.usage),
          quotaFormatted: this.formatBytes(estimate.quota),
          availableFormatted: this.formatBytes(estimate.quota - estimate.usage)
        };
      } catch (error) {
        console.error('[StorageManager] Error checking quota:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Request persistent storage
   * @returns {Promise<boolean>} Whether storage was persisted
   */
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersisted = await navigator.storage.persist();
        console.log(`[StorageManager] Storage persisted: ${isPersisted}`);
        return isPersisted;
      } catch (error) {
        console.error('[StorageManager] Error requesting persistent storage:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Update storage info in UI
   */
  async updateStorageInfo() {
    const estimate = await this.checkStorageQuota();

    if (estimate && this.storageInfo) {
      this.storageInfo.textContent = `Almacenamiento: ${estimate.usageFormatted} / ${estimate.quotaFormatted} (${estimate.percentUsed}%)`;

      // Warn if storage is getting full
      if (estimate.percentUsed > 90) {
        this.storageInfo.style.color = 'var(--error-color)';
      } else if (estimate.percentUsed > 75) {
        this.storageInfo.style.color = 'var(--warning-color)';
      } else {
        this.storageInfo.style.color = 'var(--text-secondary)';
      }
    } else if (this.storageInfo) {
      this.storageInfo.textContent = 'Almacenamiento: No disponible';
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if there's enough space for a download
   * @param {number} requiredBytes - Required bytes
   * @returns {Promise<boolean>} Whether there's enough space
   */
  async hasEnoughSpace(requiredBytes) {
    const estimate = await this.checkStorageQuota();
    if (!estimate) return true; // Assume true if we can't check

    return estimate.available >= requiredBytes;
  }
}

export default StorageManager;
