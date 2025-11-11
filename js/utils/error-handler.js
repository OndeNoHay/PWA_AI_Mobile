/**
 * Error Handler Utility
 * Manages error handling and user notifications
 */

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.toastContainer = null;
  }

  /**
   * Initialize the error handler
   */
  init() {
    this.toastContainer = document.getElementById('toast-container');
    if (!this.toastContainer) {
      console.warn('[ErrorHandler] Toast container not found');
    }

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error, { type: 'global', message: event.message });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, { type: 'unhandled-promise' });
    });
  }

  /**
   * Handle an error and show appropriate message to user
   * @param {Error} error - The error object
   * @param {Object} context - Additional context about the error
   */
  handleError(error, context = {}) {
    const errorInfo = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      context: context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };

    this.errorLog.push(errorInfo);
    console.error('[Error]', errorInfo);

    // Determine error type and show appropriate message
    if (error?.name === 'QuotaExceededError') {
      this.showToast(
        'Almacenamiento lleno',
        'No hay suficiente espacio. Por favor, libera espacio o limpia el historial.',
        'warning'
      );
    } else if (error?.message?.includes('Model not found') || error?.message?.includes('model')) {
      this.showToast(
        'Error cargando modelo',
        'No se pudo cargar el modelo de IA. Verifica tu conexión e intenta de nuevo.',
        'error'
      );
    } else if (error?.message?.includes('WebGPU') || error?.message?.includes('GPU')) {
      this.showToast(
        'GPU no disponible',
        'Se usará CPU (más lento). Para mejor rendimiento, actualiza tu navegador.',
        'info'
      );
    } else if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      this.showToast(
        'Error de red',
        'Problemas de conexión. Verifica tu internet e intenta de nuevo.',
        'error'
      );
    } else {
      this.showToast(
        'Error inesperado',
        error?.message || 'Ocurrió un error. Por favor, intenta de nuevo.',
        'error'
      );
    }
  }

  /**
   * Show a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   */
  showToast(title, message, type = 'info') {
    if (!this.toastContainer) {
      console.warn('[ErrorHandler] Toast container not available');
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    `;

    this.toastContainer.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }
}

export default ErrorHandler;
