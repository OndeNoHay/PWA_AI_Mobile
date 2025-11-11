/**
 * Loading State Manager
 * Manages loading indicators and progress bars
 */

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.loadingSection = null;
    this.loadingText = null;
    this.progressBar = null;
    this.progressText = null;
  }

  /**
   * Initialize the loading manager
   */
  init() {
    this.loadingSection = document.getElementById('loading-section');
    this.loadingText = document.getElementById('loading-text');
    this.progressBar = document.getElementById('progress-bar');
    this.progressText = document.getElementById('progress-text');
  }

  /**
   * Show loading indicator
   * @param {string} message - Loading message to display
   */
  showLoading(message = 'Cargando...') {
    if (!this.loadingSection) {
      console.warn('[LoadingManager] Loading section not found');
      return;
    }

    this.loadingSection.style.display = 'block';
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }
    this.updateProgress(0);
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    if (this.loadingSection) {
      this.loadingSection.style.display = 'none';
    }
    this.updateProgress(0);
  }

  /**
   * Update progress bar
   * @param {number} progress - Progress percentage (0-100)
   */
  updateProgress(progress) {
    if (this.progressBar) {
      this.progressBar.style.width = `${progress}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  /**
   * Update loading message
   * @param {string} message - New loading message
   */
  updateMessage(message) {
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }
  }

  /**
   * Check if loading is active
   */
  isLoading() {
    return this.loadingSection && this.loadingSection.style.display !== 'none';
  }
}

export default LoadingManager;
