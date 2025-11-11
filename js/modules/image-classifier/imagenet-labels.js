/**
 * ImageNet Labels Module
 * Provides access to the 1000 ImageNet class labels
 */

// Import labels from JSON file
let IMAGENET_LABELS = null;

/**
 * Load ImageNet labels from JSON file
 * @returns {Promise<Array<string>>} Array of 1000 class labels
 */
async function loadImageNetLabels() {
  if (IMAGENET_LABELS) {
    return IMAGENET_LABELS;
  }

  try {
    const response = await fetch('./js/modules/image-classifier/imagenet-labels.json');
    if (!response.ok) {
      throw new Error(`Failed to load ImageNet labels: ${response.statusText}`);
    }
    IMAGENET_LABELS = await response.json();
    console.log('[ImageNet Labels] Loaded', IMAGENET_LABELS.length, 'labels');
    return IMAGENET_LABELS;
  } catch (error) {
    console.error('[ImageNet Labels] Error loading labels:', error);
    // Return fallback labels
    return getFallbackLabels();
  }
}

/**
 * Get label by index
 * @param {number} index - Class index (0-999)
 * @returns {string} Class label
 */
function getLabelByIndex(index) {
  if (!IMAGENET_LABELS) {
    console.warn('[ImageNet Labels] Labels not loaded yet');
    return `class_${index}`;
  }

  if (index < 0 || index >= IMAGENET_LABELS.length) {
    console.warn('[ImageNet Labels] Index out of range:', index);
    return `unknown_${index}`;
  }

  return IMAGENET_LABELS[index];
}

/**
 * Get all labels
 * @returns {Array<string>|null} Array of all labels or null if not loaded
 */
function getAllLabels() {
  return IMAGENET_LABELS;
}

/**
 * Check if labels are loaded
 * @returns {boolean}
 */
function isLoaded() {
  return IMAGENET_LABELS !== null;
}

/**
 * Fallback labels in case the JSON file can't be loaded
 * Returns a minimal set of common categories
 * @returns {Array<string>}
 */
function getFallbackLabels() {
  console.warn('[ImageNet Labels] Using fallback labels');
  // Create array with 1000 generic labels
  const labels = [];
  for (let i = 0; i < 1000; i++) {
    labels.push(`class_${i}`);
  }
  return labels;
}

export {
  loadImageNetLabels,
  getLabelByIndex,
  getAllLabels,
  isLoaded
};
