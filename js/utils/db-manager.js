/**
 * Database Manager
 * Manages IndexedDB for storing classification history and settings
 */

class DBManager {
  constructor() {
    this.dbName = 'ai-pwa-db';
    this.version = 1;
    this.db = null;
  }

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[DBManager] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[DBManager] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        console.log('[DBManager] Upgrading database...');
        const db = event.target.result;

        // Create history store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', {
            keyPath: 'id',
            autoIncrement: true
          });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('moduleType', 'moduleType', { unique: false });
          console.log('[DBManager] Created history object store');
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
          console.log('[DBManager] Created settings object store');
        }
      };
    });
  }

  /**
   * Add an entry to the history
   * @param {Object} entry - History entry
   * @returns {Promise<number>} ID of the added entry
   */
  async addToHistory(entry) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      const request = store.add({
        ...entry,
        timestamp: Date.now()
      });

      request.onsuccess = () => {
        console.log('[DBManager] Added to history:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[DBManager] Error adding to history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all history entries
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>}
   */
  async getHistory(limit = 50) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Descending order

      const results = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        console.error('[DBManager] Error getting history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a single history entry by ID
   * @param {number} id - Entry ID
   * @returns {Promise<Object>}
   */
  async getHistoryEntry(id) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[DBManager] Error getting entry:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a history entry
   * @param {number} id - Entry ID
   * @returns {Promise<void>}
   */
  async deleteHistoryEntry(id) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[DBManager] Deleted entry:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[DBManager] Error deleting entry:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all history
   * @returns {Promise<void>}
   */
  async clearHistory() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[DBManager] History cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[DBManager] Error clearing history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save a setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<void>}
   */
  async saveSetting(key, value) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => {
        console.log('[DBManager] Setting saved:', key);
        resolve();
      };

      request.onerror = () => {
        console.error('[DBManager] Error saving setting:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a setting
   * @param {string} key - Setting key
   * @param {any} defaultValue - Default value if not found
   * @returns {Promise<any>}
   */
  async getSetting(key, defaultValue = null) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };

      request.onerror = () => {
        console.error('[DBManager] Error getting setting:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[DBManager] Database closed');
    }
  }
}

export default DBManager;
