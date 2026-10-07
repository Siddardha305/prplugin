/**
 * SmartAdverts Premiere Tools - Timeline & Marker Module
 * Handles timeline playhead queries, marker additions, and frame inspection.
 */

// Dependency resolution (works with both CJS require and browser globals)
const Premiere = (typeof require === 'function' ? require('./premiere.js') : window.SmartPremiere);
const Utils = (typeof require === 'function' ? require('./utils.js') : window.SmartUtils);

/**
 * Retrieves the current playhead position as formatted timecode and raw TickTime
 * @returns {Promise<object>}
 */
async function getPlayheadInfo() {
  const sequence = await Premiere.getActiveSequence();
  if (!sequence) {
    return {
      hasSequence: false,
      timecode: '00:00:00:00',
      seconds: 0,
      tickTime: null
    };
  }

  let tickTime = null;
  let seconds = 0;
  let timecode = '00:00:00:00';

  if (typeof sequence.getPlayerPosition === 'function') {
    try {
      tickTime = await sequence.getPlayerPosition();
      if (tickTime) {
        if (typeof tickTime.seconds === 'number') {
          seconds = tickTime.seconds;
        }
        timecode = Utils.parseTickTimeToTimecode(tickTime);
      }
    } catch (err) {
      Utils.logger.warn('Failed to get player position from sequence:', err);
    }
  }

  return {
    hasSequence: true,
    timecode,
    seconds,
    tickTime
  };
}

/**
 * Adds a marker at the current playhead position in the active sequence
 * Uses official Premiere Pro UXP 25.6+ Action & Transaction model with multi-level fallbacks.
 *
 * @param {object} options
 * @param {string} [options.name="SmartAdverts Marker"]
 * @param {string} [options.comments=""]
 * @param {string} [options.markerType="Comment"]
 * @returns {Promise<object>}
 */
async function addMarkerAtPlayhead({
  name = 'SmartAdverts Marker',
  comments = 'Added by SmartAdverts Premiere Tools',
  markerType = 'Comment'
} = {}) {
  const project = await Premiere.getActiveProject();
  if (!project) {
    throw new Error('No project is open. Please open a project in Premiere Pro.');
  }

  const sequence = await Premiere.getActiveSequence();
  if (!sequence) {
    throw new Error('No active sequence found. Please open and select a sequence.');
  }

  const ppro = Premiere.getApp();
  if (!ppro) {
    throw new Error('Premiere Pro UXP host API is not available.');
  }

  // 1. Get current playhead TickTime
  let playheadTickTime = null;
  let timecodeStr = '00:00:00:00';

  if (typeof sequence.getPlayerPosition === 'function') {
    playheadTickTime = await sequence.getPlayerPosition();
    timecodeStr = Utils.parseTickTimeToTimecode(playheadTickTime);
  }

  // If playheadTickTime is still null, construct a default 0 TickTime if available
  if (!playheadTickTime && ppro.TickTime && typeof ppro.TickTime.createWithSeconds === 'function') {
    playheadTickTime = ppro.TickTime.createWithSeconds(0);
  }

  Utils.logger.log(`Adding marker "${name}" at timecode: ${timecodeStr}...`);

  // 2. Identify Markers collection
  let markersObj = null;
  if (ppro.Markers && typeof ppro.Markers.getMarkers === 'function') {
    markersObj = ppro.Markers.getMarkers(sequence);
  } else if (sequence.markers) {
    markersObj = sequence.markers;
  }

  let actionCreated = false;

  // METHOD A: Official Premiere Pro UXP 25.6+ Action & Transaction Pattern
  if (markersObj && typeof markersObj.createAddMarkerAction === 'function') {
    try {
      const zeroDuration = (ppro.TickTime && typeof ppro.TickTime.createWithSeconds === 'function')
        ? ppro.TickTime.createWithSeconds(0)
        : playheadTickTime;

      const markerAction = markersObj.createAddMarkerAction(
        name,
        markerType,
        playheadTickTime,
        zeroDuration,
        comments
      );

      if (markerAction) {
        if (typeof project.lockedAccess === 'function') {
          await project.lockedAccess(async () => {
            if (typeof project.executeTransaction === 'function') {
              await project.executeTransaction((compoundAction) => {
                compoundAction.addAction(markerAction);
              }, `Add Marker: ${name}`);
            }
          });
        } else if (typeof project.executeTransaction === 'function') {
          await project.executeTransaction((compoundAction) => {
            compoundAction.addAction(markerAction);
          }, `Add Marker: ${name}`);
        }
        actionCreated = true;
        Utils.logger.success(`Marker action executed successfully: "${name}" at ${timecodeStr}`);
      }
    } catch (err) {
      Utils.logger.warn(`createAddMarkerAction transaction failed: ${err.message || err}. Trying direct creation...`);
    }
  }

  // METHOD B: Direct createMarker method on Markers object (if supported)
  if (!actionCreated && markersObj && typeof markersObj.createMarker === 'function') {
    try {
      await markersObj.createMarker(name, markerType, playheadTickTime, 0, comments);
      actionCreated = true;
      Utils.logger.success(`Marker created directly on markers collection: "${name}" at ${timecodeStr}`);
    } catch (err) {
      Utils.logger.warn(`markers.createMarker failed: ${err.message || err}`);
    }
  }

  // METHOD C: Direct sequence.createMarker method (if present)
  if (!actionCreated && typeof sequence.createMarker === 'function') {
    try {
      await sequence.createMarker(playheadTickTime, name, comments);
      actionCreated = true;
      Utils.logger.success(`Marker created via sequence: "${name}" at ${timecodeStr}`);
    } catch (err) {
      Utils.logger.warn(`sequence.createMarker failed: ${err.message || err}`);
    }
  }

  if (!actionCreated) {
    throw new Error('The current Premiere Pro UXP version does not expose a supported marker creation method.');
  }

  return {
    success: true,
    name,
    timecode: timecodeStr,
    comments
  };
}

/**
 * Captures information about the current frame for thumbnail/inspection
 * @returns {Promise<object>}
 */
async function captureCurrentFrameInfo() {
  const sequence = await Premiere.getActiveSequence();
  if (!sequence) {
    throw new Error('No active sequence found.');
  }

  const playhead = await getPlayheadInfo();
  let frameSizeStr = '--';

  try {
    if (typeof sequence.getFrameSize === 'function') {
      const rect = await sequence.getFrameSize();
      if (rect) {
        const w = rect.width ?? (rect.right - rect.left);
        const h = rect.height ?? (rect.bottom - rect.top);
        if (w && h) {
          frameSizeStr = `${Math.round(w)} × ${Math.round(h)}`;
        }
      }
    }
  } catch (e) {}

  const frameInfo = {
    sequenceName: sequence.name || 'Untitled Sequence',
    timecode: playhead.timecode,
    seconds: playhead.seconds.toFixed(3),
    resolution: frameSizeStr,
    capturedAt: new Date().toLocaleTimeString()
  };

  Utils.logger.info(`Captured frame info: Sequence "${frameInfo.sequenceName}" at ${frameInfo.timecode} (${frameInfo.resolution})`);
  return frameInfo;
}

// Module export for CommonJS & Global Window fallback
const TimelineModule = {
  getPlayheadInfo,
  addMarkerAtPlayhead,
  captureCurrentFrameInfo
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimelineModule;
}
if (typeof window !== 'undefined') {
  window.SmartTimeline = TimelineModule;
}
