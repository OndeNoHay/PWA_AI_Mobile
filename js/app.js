/**
 * AI Technical Assistant - Main Application Entry Point
 * Version: 1.0.0 MVP
 */

import DBManager from './utils/db-manager.js';
import ErrorHandler from './utils/error-handler.js';
import LoadingManager from './utils/loading-manager.js';
import StorageManager from './utils/storage-manager.js';
import ImageClassifier from './modules/image-classifier/classifier.js';
import ClassifierUIController from './modules/image-classifier/ui-controller.js';

class App {
  constructor() {
    this.dbManager = null;
    this.errorHandler = null;
    this.loadingManager = null;
    this.storageManager = null;
    this.classifier = null;
    this.classifierUI = null;

    this.statusDot = null;
    this.statusText = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('[App] Initializing AI Technical Assistant...');

    try {
      // Initialize core utilities
      await this.initializeUtilities();

      // Register service worker
      await this.registerServiceWorker();

      // Initialize database
      await this.initializeDatabase();

      // Initialize classifier module
      await this.initializeClassifier();

      // Initialize UI controller
      this.initializeUI();

      // Check and update app status
      this.updateAppStatus();

      // Setup online/offline detection
      this.setupConnectivityDetection();

      // Request persistent storage
      await this.storageManager.requestPersistentStorage();

      // Update storage info periodically
      setInterval(() => {
        this.storageManager.updateStorageInfo();
      }, 30000); // Every 30 seconds

      console.log('[App] Application initialized successfully');
      this.errorHandler.showToast(
        'Bienvenido',
        'AI Technical Assistant está listo para usar',
        'success'
      );

    } catch (error) {
      console.error('[App] Error during initialization:', error);
      this.errorHandler?.handleError(error, { context: 'app-initialization' });
    }
  }

  /**
   * Initialize core utilities
   */
  async initializeUtilities() {
    console.log('[App] Initializing utilities...');

    // Error Handler
    this.errorHandler = new ErrorHandler();
    this.errorHandler.init();

    // Loading Manager
    this.loadingManager = new LoadingManager();
    this.loadingManager.init();

    // Storage Manager
    this.storageManager = new StorageManager();
    this.storageManager.init();

    // Status elements
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
  }

  /**
   * Register service worker for PWA functionality
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('[App] Registering service worker...');
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('[App] Service Worker registered:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[App] New service worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New service worker available');
              this.errorHandler.showToast(
                'Actualización disponible',
                'Recarga la página para obtener la última versión',
                'info'
              );
            }
          });
        });

      } catch (error) {
        console.error('[App] Service Worker registration failed:', error);
      }
    } else {
      console.warn('[App] Service Workers not supported');
    }
  }

  /**
   * Initialize database
   */
  async initializeDatabase() {
    console.log('[App] Initializing database...');
    this.dbManager = new DBManager();
    await this.dbManager.init();
  }

  /**
   * Detect if running on iOS/iPadOS
   * @returns {boolean}
   */
  isIOS() {
    const isIOSPlatform = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform);

    // iPad on iOS 13+ detection
    const isIPadOS = navigator.userAgent.includes("Mac") && "ontouchend" in document;

    const isIOS = isIOSPlatform || isIPadOS;

    console.log('[App] iOS Detection:');
    console.log('  - Platform:', navigator.platform);
    console.log('  - User Agent:', navigator.userAgent);
    console.log('  - isIOSPlatform:', isIOSPlatform);
    console.log('  - isIPadOS:', isIPadOS);
    console.log('  - Result:', isIOS);

    return isIOS;
  }

  /**
   * Initialize classifier module
   */
  async initializeClassifier() {
    console.log('[App] Initializing classifier module...');

    this.classifier = new ImageClassifier(
      this.dbManager,
      this.loadingManager,
      this.errorHandler
    );

    // iOS/iPadOS: Use API instead of local model due to memory constraints
    if (this.isIOS()) {
      console.log('[App] iOS detected - using API mode');
      this.classifier.useAPI = true;
      this.classifier.modelLoaded = true; // Mark as "loaded" since API doesn't need loading
      this.classifier.currentModel = 'api';

      this.errorHandler.showToast(
        'iOS: Modo API Activado',
        'Usando API en línea (requiere internet). Los modelos locales no funcionan en iOS debido a limitaciones de memoria.',
        'info'
      );

      // Update model selector to show API option
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) {
        modelSelect.value = 'api';
        modelSelect.disabled = true; // Disable selector on iOS
      }

      // Update model info
      const modelInfo = document.getElementById('model-info');
      if (modelInfo) {
        modelInfo.textContent = 'iOS usa API en línea. Requiere conexión a internet.';
        modelInfo.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        modelInfo.style.borderColor = '#ffc107';
      }

      return; // Skip model loading
    }

    // Non-iOS: Load model normally
    const defaultModel = 'mobilenet-v4';
    const savedModel = await this.dbManager.getSetting('selectedModel', defaultModel);
    console.log('[App] Loading model:', savedModel);

    // Initialize with saved or default model
    try {
      console.log('[App] Attempting to initialize with model:', savedModel);
      await this.classifier.initialize(savedModel);
      console.log('[App] Model initialized successfully');
    } catch (error) {
      console.error('[App] Failed to initialize model:', error);

      // If model fails to load (e.g., memory error), try with lightest model
      if (savedModel !== 'mobilenet-v4') {
        console.warn('[App] Falling back to MobileNetV4');
        this.errorHandler.showToast(
          'Modelo alternativo',
          'Usando MobileNetV4 debido a limitaciones del dispositivo',
          'warning'
        );

        try {
          await this.classifier.initialize('mobilenet-v4');
          console.log('[App] Fallback to MobileNetV4 successful');
        } catch (fallbackError) {
          console.error('[App] Fallback also failed:', fallbackError);
          this.errorHandler.showToast(
            'Error crítico',
            'No se pudo cargar ningún modelo. Por favor, recarga la página.',
            'error'
          );
          throw fallbackError;
        }
      } else {
        // Even MobileNetV4 failed - this is a critical error
        console.error('[App] Even MobileNetV4 failed to load');
        this.errorHandler.showToast(
          'Error crítico',
          'No se pudo cargar el modelo. Verifica tu conexión y espacio disponible.',
          'error'
        );
        throw error;
      }
    }

    // Update model selector UI
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
      modelSelect.value = this.classifier.getCurrentModel() || savedModel;
    }
  }

  /**
   * Initialize UI controller
   */
  initializeUI() {
    console.log('[App] Initializing UI controller...');

    this.classifierUI = new ClassifierUIController(
      this.classifier,
      this.dbManager,
      this.errorHandler
    );

    this.classifierUI.init();
  }

  /**
   * Update app status indicator
   */
  updateAppStatus() {
    const isOnline = navigator.onLine;
    const modelLoaded = this.classifier?.isModelLoaded();

    if (this.statusDot && this.statusText) {
      if (modelLoaded && isOnline) {
        this.statusDot.className = 'status-dot online';
        this.statusText.textContent = 'Online - Listo';
      } else if (modelLoaded && !isOnline) {
        this.statusDot.className = 'status-dot offline';
        this.statusText.textContent = 'Offline - Listo';
      } else {
        this.statusDot.className = 'status-dot';
        this.statusText.textContent = 'Cargando modelo...';
      }
    }
  }

  /**
   * Setup connectivity detection
   */
  setupConnectivityDetection() {
    window.addEventListener('online', () => {
      console.log('[App] Connection restored');
      this.updateAppStatus();
      this.errorHandler.showToast(
        'Conexión restaurada',
        'La aplicación está nuevamente online',
        'success'
      );
    });

    window.addEventListener('offline', () => {
      console.log('[App] Connection lost');
      this.updateAppStatus();
      this.errorHandler.showToast(
        'Sin conexión',
        'La aplicación seguirá funcionando en modo offline',
        'info'
      );
    });
  }
}

// Initialize app when DOM is ready
let appInstance;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    appInstance = new App();
    appInstance.init();
    // Make app globally accessible for debugging
    window.app = appInstance;
  });
} else {
  appInstance = new App();
  appInstance.init();
  // Make app globally accessible for debugging
  window.app = appInstance;
}

export default App;
