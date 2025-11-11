/**
 * Platform Detector Module
 * Detects the platform (iOS/iPadOS vs PC/Android) to select the appropriate AI library
 */

class PlatformDetector {
  constructor() {
    this.platform = this.detect();
    this.capabilities = this.detectCapabilities();
  }

  /**
   * Detect if running on iOS/iPadOS
   * @returns {Object} Platform information
   */
  detect() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    // Check for iPhone, iPad, iPod
    const isIOSPlatform = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(platform);

    // iPad on iOS 13+ detection (reports as Mac)
    const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;

    // Check user agent for iOS/Safari
    const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

    const isIOS = isIOSPlatform || isIPadOS || isIOSUserAgent;

    const info = {
      isIOS: isIOS,
      isIPadOS: isIPadOS,
      platform: platform,
      userAgent: userAgent,
      maxTouchPoints: maxTouchPoints,
      recommendedLibrary: isIOS ? 'onnx' : 'transformers'
    };

    console.log('[PlatformDetector] Platform detection:', info);

    return info;
  }

  /**
   * Detect browser capabilities (WebGPU, WebGL, WASM)
   * @returns {Object} Capabilities information
   */
  detectCapabilities() {
    const caps = {
      webgpu: 'gpu' in navigator,
      webgl: this.detectWebGL(),
      webgl2: this.detectWebGL2(),
      wasm: this.detectWASM(),
      simd: this.detectSIMD(),
      threads: this.detectThreads()
    };

    console.log('[PlatformDetector] Capabilities:', caps);

    return caps;
  }

  /**
   * Detect WebGL support
   * @returns {boolean}
   */
  detectWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect WebGL2 support
   * @returns {boolean}
   */
  detectWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect WebAssembly support
   * @returns {boolean}
   */
  detectWASM() {
    try {
      return typeof WebAssembly === 'object' &&
             typeof WebAssembly.instantiate === 'function';
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect SIMD support
   * @returns {boolean}
   */
  detectSIMD() {
    try {
      return typeof WebAssembly !== 'undefined' &&
             WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect multithreading support
   * @returns {boolean}
   */
  detectThreads() {
    return typeof SharedArrayBuffer !== 'undefined';
  }

  /**
   * Check if the platform is iOS/iPadOS
   * @returns {boolean}
   */
  isIOS() {
    return this.platform.isIOS;
  }

  /**
   * Get recommended library based on platform
   * @returns {string} 'onnx' or 'transformers'
   */
  getRecommendedLibrary() {
    return this.platform.recommendedLibrary;
  }

  /**
   * Get recommended execution provider based on capabilities
   * @param {string} library - 'onnx' or 'transformers'
   * @returns {string} Recommended execution provider
   */
  getRecommendedExecutionProvider(library) {
    if (library === 'onnx') {
      // For ONNX Runtime Web on iOS, use WebGL
      if (this.capabilities.webgl2) {
        return 'webgl';
      } else if (this.capabilities.webgl) {
        return 'webgl';
      } else {
        return 'wasm';
      }
    } else {
      // For Transformers.js on PC/Android, prefer WebGPU
      if (this.capabilities.webgpu) {
        return 'webgpu';
      } else {
        return 'wasm';
      }
    }
  }

  /**
   * Get platform summary for logging
   * @returns {Object}
   */
  getSummary() {
    return {
      platform: this.platform,
      capabilities: this.capabilities,
      recommendedLibrary: this.getRecommendedLibrary(),
      recommendedExecutionProvider: this.getRecommendedExecutionProvider(this.getRecommendedLibrary())
    };
  }
}

export default PlatformDetector;
