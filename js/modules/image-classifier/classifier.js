/**
 * Image Classifier Module - Unified Interface
 * Automatically selects the best AI library based on platform:
 * - iOS/iPadOS: ONNX Runtime Web with WebGL
 * - PC/Android: Transformers.js v3 with WebGPU/WASM
 */

import PlatformDetector from './platform-detector.js';
import ONNXAdapter from './onnx-adapter.js';
import TransformersAdapter from './transformers-adapter.js';

class ImageClassifier {
  constructor(dbManager, loadingManager, errorHandler) {
    this.dbManager = dbManager;
    this.loadingManager = loadingManager;
    this.errorHandler = errorHandler;

    // Platform detection
    this.platformDetector = new PlatformDetector();
    this.platform = this.platformDetector.getSummary();

    // Adapter (will be ONNX or Transformers based on platform)
    this.adapter = null;
    this.modelLoaded = false;
    this.currentModel = null;

    // Model configurations with both ONNX and Transformers paths
    this.models = {
      'mobilenet-v4': {
        name: 'MobileNetV4 Small',
        transformersId: 'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k',
        onnxPath: './models/mobilenetv2-12.onnx', // ONNX fallback
        description: 'Modelo ligero optimizado para velocidad. Recomendado para pruebas iniciales.',
        size: '~15 MB',
        speed: 'Rápido',
        iosCompatible: true
      },
      'mobilenet-v3': {
        name: 'MobileNetV3 Large',
        transformersId: 'Xenova/mobilenet_v3_large',
        onnxPath: './models/mobilenetv3-large.onnx',
        description: 'Modelo balanceado con buena precisión y velocidad moderada.',
        size: '~20 MB',
        speed: 'Medio',
        iosCompatible: true
      },
      'resnet50': {
        name: 'ResNet50',
        transformersId: 'Xenova/resnet-50',
        onnxPath: './models/resnet50.onnx',
        description: 'Modelo potente con alta precisión. Más lento pero más preciso.',
        size: '~100 MB',
        speed: 'Lento',
        iosCompatible: true
      }
    };

    console.log('[Classifier] Initialized with platform:', this.platform);
  }

  /**
   * Initialize the classifier with a specific model
   * @param {string} modelKey - Model key from this.models
   * @returns {Promise<void>}
   */
  async initialize(modelKey = 'mobilenet-v4') {
    try {
      // Check if model exists
      if (!this.models[modelKey]) {
        throw new Error(`Model ${modelKey} not found`);
      }

      this.currentModel = modelKey;
      const modelConfig = this.models[modelKey];

      console.log(`[Classifier] ===== Starting model initialization =====`);
      console.log(`[Classifier] Model: ${modelConfig.name}`);
      console.log(`[Classifier] Platform: ${this.platform.platform.isIOS ? 'iOS' : 'PC/Android'}`);
      console.log(`[Classifier] Recommended Library: ${this.platform.recommendedLibrary}`);
      console.log(`[Classifier] User Agent: ${navigator.userAgent}`);

      // Select appropriate adapter based on platform
      if (this.platform.platform.isIOS) {
        // iOS/iPadOS: Use ONNX Runtime Web
        console.log('[Classifier] Using ONNX Runtime Web for iOS/iPadOS');
        this.adapter = new ONNXAdapter(this.loadingManager, this.errorHandler);

        // For iOS, we'll use a pre-converted ONNX model
        // For MVP, we use MobileNetV2 ONNX model from ONNX Model Zoo
        const onnxModelUrl = 'https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx';

        await this.adapter.initialize(onnxModelUrl, {
          executionProvider: this.platform.recommendedExecutionProvider
        });

        this.errorHandler.showToast(
          'iOS detectado',
          `Usando ONNX Runtime Web con ${this.platform.recommendedExecutionProvider.toUpperCase()}`,
          'info'
        );

      } else {
        // PC/Android: Use Transformers.js v3
        console.log('[Classifier] Using Transformers.js v3 for PC/Android');
        this.adapter = new TransformersAdapter(this.loadingManager, this.errorHandler);

        await this.adapter.initialize(modelConfig.transformersId, {
          numThreads: 4
        });

        this.errorHandler.showToast(
          'Modelo cargado',
          `${modelConfig.name} con ${this.platform.recommendedExecutionProvider.toUpperCase()}`,
          'success'
        );
      }

      this.modelLoaded = true;
      console.log(`[Classifier] ===== Model loaded successfully =====`);
      console.log(`[Classifier] Adapter: ${this.adapter.getName()} v${this.adapter.getVersion()}`);

      // Save selected model to settings
      await this.dbManager.saveSetting('selectedModel', modelKey);

    } catch (error) {
      this.modelLoaded = false;

      console.error('[Classifier] ===== Error initializing model =====');
      console.error('[Classifier] Error name:', error.name);
      console.error('[Classifier] Error message:', error.message);
      console.error('[Classifier] Error stack:', error.stack);

      // Check for memory errors (common on iOS/iPad)
      if (error.message?.includes('out of memory') ||
          error.message?.includes('RangeError') ||
          error.message?.includes('memory') ||
          error.name === 'RangeError') {
        console.error('[Classifier] Memory error detected');
        this.errorHandler.showToast(
          'Memoria insuficiente',
          `El modelo ${this.models[modelKey]?.name || modelKey} es demasiado grande para este dispositivo.`,
          'error'
        );
      } else {
        console.error('[Classifier] Non-memory error');
        this.errorHandler.handleError(error, {
          context: 'model-initialization',
          modelKey: modelKey,
          platform: this.platform,
          adapter: this.adapter?.getName() || 'unknown'
        });
      }
      throw error;
    }
  }

  /**
   * Classify an image
   * @param {string|File|HTMLImageElement} imageSource - Image to classify
   * @param {number} topK - Number of top results to return
   * @returns {Promise<Object>}
   */
  async classifyImage(imageSource, topK = 5) {
    if (!this.modelLoaded || !this.adapter) {
      throw new Error('Model not loaded. Please initialize first.');
    }

    try {
      console.log('[Classifier] Classifying image with adapter:', this.adapter.getName());

      // Delegate to the appropriate adapter
      const result = await this.adapter.classifyImage(imageSource, topK);

      console.log('[Classifier] Classification result:', result);

      return result;

    } catch (error) {
      console.error('[Classifier] Error during classification:', error);
      this.errorHandler.handleError(error, {
        context: 'classification',
        adapter: this.adapter?.getName() || 'unknown'
      });
      throw error;
    }
  }

  /**
   * Create a thumbnail from an image
   * @param {HTMLImageElement} img - Image element
   * @param {number} maxSize - Maximum size for thumbnail
   * @returns {Promise<string>} Base64 data URL
   */
  async createThumbnail(img, maxSize = 100) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and convert to data URL
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    });
  }

  /**
   * Save classification result to history
   * @param {Object} classificationResult - Classification result
   * @param {string} imageThumbnail - Base64 thumbnail
   * @returns {Promise<number>}
   */
  async saveToHistory(classificationResult, imageThumbnail) {
    try {
      const entry = {
        moduleType: 'image-classification',
        imageThumb: imageThumbnail,
        results: classificationResult.results,
        inferenceTime: classificationResult.inferenceTime,
        model: classificationResult.model,
        adapter: this.adapter?.getName() || 'unknown',
        platform: this.platform.platform.isIOS ? 'iOS' : 'PC/Android'
      };

      const id = await this.dbManager.addToHistory(entry);
      console.log('[Classifier] Saved to history with ID:', id);
      return id;
    } catch (error) {
      console.error('[Classifier] Error saving to history:', error);
      this.errorHandler.handleError(error, { context: 'save-history' });
      throw error;
    }
  }

  /**
   * Get model configuration
   * @param {string} modelKey - Model key
   * @returns {Object}
   */
  getModelConfig(modelKey) {
    return this.models[modelKey] || null;
  }

  /**
   * Get all available models
   * @returns {Object}
   */
  getAvailableModels() {
    return this.models;
  }

  /**
   * Check if model is loaded
   * @returns {boolean}
   */
  isModelLoaded() {
    return this.modelLoaded;
  }

  /**
   * Get current model key
   * @returns {string}
   */
  getCurrentModel() {
    return this.currentModel;
  }

  /**
   * Get platform information
   * @returns {Object}
   */
  getPlatformInfo() {
    return this.platform;
  }

  /**
   * Get current adapter information
   * @returns {Object}
   */
  getAdapterInfo() {
    if (!this.adapter) {
      return { name: 'none', version: 'n/a' };
    }
    return {
      name: this.adapter.getName(),
      version: this.adapter.getVersion()
    };
  }
}

export default ImageClassifier;
