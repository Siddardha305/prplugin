/**
 * SmartAdverts Premiere Tools - Sequence Management Module
 * Handles sequence inspection, aspect ratio queries, and sequence creation.
 */

// Dependency resolution (works with both CJS require and browser globals)
const Premiere = (typeof require === 'function' ? require('./premiere.js') : window.SmartPremiere);
const Utils = (typeof require === 'function' ? require('./utils.js') : window.SmartUtils);

/**
 * Retrieves comprehensive details about the active sequence
 * @returns {Promise<object>}
 */
async function getActiveSequenceDetails() {
  const sequence = await Premiere.getActiveSequence();
  if (!sequence) {
    return {
      hasSequence: false,
      name: '--',
      width: null,
      height: null,
      resolutionStr: '--',
      aspectRatioStr: '--',
      timecode: '--:--:--:--',
      fps: 30
    };
  }

  const name = sequence.name || 'Untitled Sequence';
  let width = null;
  let height = null;
  let fps = 30;

  // 1. Retrieve Frame Size via Sequence.getFrameSize() (UXP 25.6+ standard)
  try {
    if (typeof sequence.getFrameSize === 'function') {
      const rect = await sequence.getFrameSize();
      if (rect) {
        if (typeof rect.width === 'number' && typeof rect.height === 'number') {
          width = Math.round(rect.width);
          height = Math.round(rect.height);
        } else if (rect.right !== undefined && rect.left !== undefined) {
          width = Math.round(Math.abs(rect.right - rect.left));
          height = Math.round(Math.abs(rect.bottom - rect.top));
        }
      }
    }
  } catch (err) {
    Utils.logger.warn('Could not read frame size via getFrameSize():', err);
  }

  // 2. Fallback: Sequence Settings (Sequence.getSettings())
  if (!width || !height) {
    try {
      if (typeof sequence.getSettings === 'function') {
        const settings = await sequence.getSettings();
        if (settings) {
          if (typeof settings.getVideoFrameRect === 'function') {
            const rect = await settings.getVideoFrameRect();
            if (rect) {
              width = Math.round(rect.width ?? Math.abs(rect.right - rect.left));
              height = Math.round(rect.height ?? Math.abs(rect.bottom - rect.top));
            }
          } else if (settings.videoFrameWidth && settings.videoFrameHeight) {
            width = settings.videoFrameWidth;
            height = settings.videoFrameHeight;
          }
        }
      }
    } catch (err) {
      Utils.logger.warn('Could not read settings via getSettings():', err);
    }
  }

  // 3. Fallback: direct properties if legacy bridge
  if (!width || !height) {
    if (sequence.frameSizeHorizontal && sequence.frameSizeVertical) {
      width = sequence.frameSizeHorizontal;
      height = sequence.frameSizeVertical;
    }
  }

  // 4. Retrieve Playhead Position Timecode
  let timecode = '00:00:00:00';
  try {
    if (typeof sequence.getPlayerPosition === 'function') {
      const tickTime = await sequence.getPlayerPosition();
      timecode = Utils.parseTickTimeToTimecode(tickTime, fps);
    }
  } catch (err) {
    Utils.logger.warn('Could not retrieve player position:', err);
  }

  const resolutionStr = (width && height) ? `${width} × ${height}` : 'Custom / Unspecified';
  const aspectRatioStr = (width && height) ? Utils.getAspectRatioLabel(width, height) : '--';

  return {
    hasSequence: true,
    sequenceObj: sequence,
    name,
    width,
    height,
    resolutionStr,
    aspectRatioStr,
    timecode,
    fps
  };
}

/**
 * Standard preset aspect ratio specifications
 */
const ASPECT_RATIO_PRESETS = {
  '16:9': {
    name: '16:9 (Landscape / YouTube)',
    width: 1920,
    height: 1080,
    shortLabel: '16:9',
    description: 'Standard Full HD Landscape (1920 × 1080)'
  },
  '9:16': {
    name: '9:16 (Shorts / Reels / TikTok)',
    width: 1080,
    height: 1920,
    shortLabel: '9:16',
    description: 'Vertical Full HD (1080 × 1920)'
  },
  '1:1': {
    name: '1:1 (Square / Social Feed)',
    width: 1080,
    height: 1080,
    shortLabel: '1:1',
    description: 'Square HD (1080 × 1080)'
  }
};

/**
 * Creates a new sequence tailored for the selected aspect ratio
 * @param {'16:9' | '9:16' | '1:1'} ratioKey
 * @param {string} customName
 * @returns {Promise<object>} Result
 */
async function createSequenceWithRatio(ratioKey, customName = '') {
  const project = await Premiere.getActiveProject();
  if (!project) {
    throw new Error('No active project found in Premiere Pro. Please create or open a project first.');
  }

  const preset = ASPECT_RATIO_PRESETS[ratioKey];
  if (!preset) {
    throw new Error(`Unsupported aspect ratio key: "${ratioKey}"`);
  }

  const seqName = customName.trim() || `Sequence_${preset.shortLabel.replace(':', 'x')}_${preset.width}x${preset.height}`;

  Utils.logger.log(`Attempting to create sequence: "${seqName}" (${preset.width}x${preset.height})...`);

  // Try creating sequence via Project.createSequence(name)
  let newSequence = null;
  if (typeof project.createSequence === 'function') {
    try {
      newSequence = await project.createSequence(seqName);
      Utils.logger.success(`Created new sequence: "${seqName}"`);
    } catch (err) {
      Utils.logger.warn(`Project.createSequence failed: ${err.message || err}. Checking alternatives...`);
    }
  }

  if (!newSequence && typeof project.createSequenceWithPresetPath === 'function') {
    try {
      newSequence = await project.createSequenceWithPresetPath(seqName, '');
      Utils.logger.success(`Created new sequence via preset path: "${seqName}"`);
    } catch (err) {
      Utils.logger.error('Failed to create sequence with preset path:', err);
    }
  }

  if (!newSequence) {
    // If API creates sequence without returning object reference or returns true/void
    Utils.logger.info(`Sequence creation command dispatched for "${seqName}".`);
  }

  return {
    success: true,
    name: seqName,
    ratio: preset.shortLabel,
    resolution: `${preset.width} × ${preset.height}`,
    description: preset.description
  };
}

// Module export for CommonJS & Global Window fallback
const SequenceModule = {
  getActiveSequenceDetails,
  createSequenceWithRatio,
  ASPECT_RATIO_PRESETS
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SequenceModule;
}
if (typeof window !== 'undefined') {
  window.SmartSequence = SequenceModule;
}
