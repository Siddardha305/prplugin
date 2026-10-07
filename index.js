/**
 * SmartAdverts Premiere Tools - Main Application Controller
 * Handles UI interactions, UXP lifecycle events, and orchestrates Premiere Pro operations.
 */

// Module references
const Utils = (typeof window !== 'undefined' && window.SmartUtils) || (typeof require === 'function' ? require('./src/utils.js') : {});
const Premiere = (typeof window !== 'undefined' && window.SmartPremiere) || (typeof require === 'function' ? require('./src/premiere.js') : {});
const Sequence = (typeof window !== 'undefined' && window.SmartSequence) || (typeof require === 'function' ? require('./src/sequence.js') : {});
const Timeline = (typeof window !== 'undefined' && window.SmartTimeline) || (typeof require === 'function' ? require('./src/timeline.js') : {});

// Setup UXP Panel Entrypoint if running inside Adobe UXP runtime
try {
  if (typeof require === 'function') {
    const uxp = require('uxp');
    if (uxp && uxp.entrypoints) {
      uxp.entrypoints.setup({
        panels: {
          smartadvertsPanel: {
            show(rootNode) {
              Utils.logger.log('SmartAdverts panel shown in workspace.');
              refreshProjectInfo();
            },
            hide() {
              Utils.logger.log('SmartAdverts panel hidden.');
            }
          }
        }
      });
    }
  }
} catch (e) {
  console.log('[SmartAdverts] Standalone / non-entrypoint initialization:', e.message);
}

// DOM Elements Cache
let elements = {};

function initDOMElements() {
  elements = {
    statusDot: document.getElementById('status-dot'),
    connStatusText: document.getElementById('connection-status-text'),
    valProjectName: document.getElementById('val-project-name'),
    valSequenceName: document.getElementById('val-sequence-name'),
    valResolution: document.getElementById('val-resolution'),
    valAspectRatio: document.getElementById('val-aspect-ratio'),
    valCurrentTime: document.getElementById('val-current-time'),
    valHostStatus: document.getElementById('val-host-status'),

    btnRefresh: document.getElementById('btn-refresh'),
    btnRatio169: document.getElementById('btn-ratio-16-9'),
    btnRatio916: document.getElementById('btn-ratio-9-16'),
    btnRatio11: document.getElementById('btn-ratio-1-1'),

    inputMarkerName: document.getElementById('input-marker-name'),
    btnAddMarker: document.getElementById('btn-add-marker'),
    btnSyncTime: document.getElementById('btn-sync-time'),
    btnClearLog: document.getElementById('btn-clear-log'),

    // Video Tools items
    itemVideoRemoveSilence: document.getElementById('item-video-remove-silence'),
    itemVideoAddMarker: document.getElementById('item-video-add-marker'),
    itemVideoCreateSeq: document.getElementById('item-video-create-seq'),
    itemVideoGetInfo: document.getElementById('item-video-get-info'),

    // Captions items
    itemCaptionTools: document.getElementById('item-caption-tools'),
    itemCaptionStyle: document.getElementById('item-caption-style'),

    // Shorts / Reels items
    itemShorts916: document.getElementById('item-shorts-916'),
    itemShorts11: document.getElementById('item-shorts-11'),
    itemShorts169: document.getElementById('item-shorts-169'),

    // Thumbnail items
    itemThumbCapture: document.getElementById('item-thumb-capture'),
    itemThumbExport: document.getElementById('item-thumb-export'),

    // Modal
    infoModal: document.getElementById('info-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalBtnClose: document.getElementById('modal-btn-close')
  };
}

/**
 * Updates the UI with current Premiere Pro project and sequence state
 */
async function refreshProjectInfo() {
  try {
    if (elements.btnRefresh) {
      elements.btnRefresh.disabled = true;
      elements.btnRefresh.innerHTML = '<span>⏳</span> Refreshing...';
    }

    Utils.logger.log('Querying Premiere Pro project state...');

    const conn = await Premiere.getConnectionInfo();
    const isAvailable = Premiere.isAvailable();

    if (!isAvailable) {
      updateUIStatus(false, 'Not Connected');
      elements.valProjectName.textContent = 'Not Connected';
      elements.valSequenceName.textContent = 'Not Connected';
      elements.valResolution.textContent = '--';
      elements.valAspectRatio.textContent = '--';
      elements.valCurrentTime.textContent = '00:00:00:00';
      elements.valHostStatus.textContent = 'Host API Offline';
      Utils.showStatus('Premiere Pro API unavailable. Make sure plugin is loaded via UXP Developer Tool.', 'warn');
      return;
    }

    if (!conn.hasProject) {
      updateUIStatus(true, 'Connected (No Project)');
      elements.valProjectName.textContent = 'No Project Open';
      elements.valSequenceName.textContent = '--';
      elements.valResolution.textContent = '--';
      elements.valAspectRatio.textContent = '--';
      elements.valCurrentTime.textContent = '00:00:00:00';
      elements.valHostStatus.textContent = 'No Project Open';
      Utils.showStatus('Connected to Premiere Pro (No active project)', 'info');
      return;
    }

    // Active project is open
    elements.valProjectName.textContent = conn.projectName;

    // Fetch Sequence Details
    const seqDetails = await Sequence.getActiveSequenceDetails();

    if (seqDetails.hasSequence) {
      updateUIStatus(true, 'Connected');
      elements.valSequenceName.textContent = seqDetails.name;
      elements.valResolution.textContent = seqDetails.resolutionStr;
      elements.valAspectRatio.textContent = seqDetails.aspectRatioStr;
      elements.valCurrentTime.textContent = seqDetails.timecode;
      elements.valHostStatus.textContent = 'Connected & Active';

      Utils.showStatus(`✓ Connected: "${conn.projectName}" | Sequence: "${seqDetails.name}"`, 'success');
      Utils.logger.success(`Project: "${conn.projectName}", Sequence: "${seqDetails.name}" (${seqDetails.resolutionStr}) at ${seqDetails.timecode}`);
    } else {
      updateUIStatus(true, 'Connected');
      elements.valSequenceName.textContent = 'No Active Sequence';
      elements.valResolution.textContent = '--';
      elements.valAspectRatio.textContent = '--';
      elements.valCurrentTime.textContent = '00:00:00:00';
      elements.valHostStatus.textContent = 'Connected (No Sequence)';
      Utils.showStatus('✓ Connected to Premiere Pro. No active sequence selected in timeline.', 'info');
    }
  } catch (error) {
    Utils.logger.error('Error during refresh:', error);
    Utils.showStatus(`✕ Error querying Premiere: ${error.message || error}`, 'error');
  } finally {
    if (elements.btnRefresh) {
      elements.btnRefresh.disabled = false;
      elements.btnRefresh.innerHTML = '<span>🔄</span> Refresh';
    }
  }
}

/**
 * Updates the connection status pill and dot
 */
function updateUIStatus(isConnected, statusText) {
  if (elements.statusDot) {
    elements.statusDot.className = isConnected ? 'status-dot connected' : 'status-dot';
  }
  if (elements.connStatusText) {
    elements.connStatusText.textContent = statusText;
  }
}

/**
 * Handles adding a marker at the current playhead
 */
async function handleAddMarker() {
  const markerName = elements.inputMarkerName ? elements.inputMarkerName.value.trim() : 'SmartAdverts Marker';

  try {
    if (elements.btnAddMarker) {
      elements.btnAddMarker.disabled = true;
      elements.btnAddMarker.innerHTML = '<span>⏳</span> Adding...';
    }

    const result = await Timeline.addMarkerAtPlayhead({
      name: markerName || 'SmartAdverts Marker',
      comments: 'Added via SmartAdverts Premiere Tools'
    });

    Utils.showStatus(`✓ Marker added: "${result.name}" at ${result.timecode}`, 'success');
    
    // Update timecode in info card
    if (elements.valCurrentTime && result.timecode) {
      elements.valCurrentTime.textContent = result.timecode;
    }
  } catch (error) {
    Utils.logger.error('Failed to add marker:', error);
    Utils.showStatus(`✕ Unable to add marker: ${error.message || error}`, 'error');
  } finally {
    if (elements.btnAddMarker) {
      elements.btnAddMarker.disabled = false;
      elements.btnAddMarker.innerHTML = '<span>📍</span> Add Marker';
    }
  }
}

/**
 * Handles querying current playhead timecode
 */
async function handleSyncTime() {
  try {
    if (elements.btnSyncTime) {
      elements.btnSyncTime.disabled = true;
    }
    const playhead = await Timeline.getPlayheadInfo();
    if (playhead.hasSequence) {
      if (elements.valCurrentTime) {
        elements.valCurrentTime.textContent = playhead.timecode;
      }
      Utils.showStatus(`✓ Playhead Time: ${playhead.timecode}`, 'info');
    } else {
      Utils.showStatus('✕ No active sequence found', 'warn');
    }
  } catch (error) {
    Utils.showStatus(`✕ Time query failed: ${error.message}`, 'error');
  } finally {
    if (elements.btnSyncTime) {
      elements.btnSyncTime.disabled = false;
    }
  }
}

/**
 * Handles creation of sequence with selected aspect ratio
 */
async function handleCreateRatioSequence(ratioKey) {
  try {
    Utils.showStatus(`Creating ${ratioKey} sequence...`, 'info', 2000);
    const result = await Sequence.createSequenceWithRatio(ratioKey);
    Utils.showStatus(`✓ Created ${result.ratio} sequence: "${result.name}" (${result.resolution})`, 'success');
    await refreshProjectInfo();
  } catch (error) {
    Utils.logger.error(`Failed to create ${ratioKey} sequence:`, error);
    Utils.showStatus(`✕ ${error.message || error}`, 'error');
  }
}

/**
 * Shows the roadmap modal for features planned in Phase 2
 */
function showFeatureModal(title, description, status = 'Phase 2 Planned') {
  if (!elements.infoModal) return;
  elements.modalTitle.textContent = `${title} (${status})`;
  elements.modalBody.innerHTML = description;
  elements.infoModal.classList.add('show');
}

function hideFeatureModal() {
  if (elements.infoModal) {
    elements.infoModal.classList.remove('show');
  }
}

/**
 * Captures current frame information
 */
async function handleCaptureFrameInfo() {
  try {
    const frameInfo = await Timeline.captureCurrentFrameInfo();
    Utils.showStatus(`✓ Frame Info: ${frameInfo.timecode} (${frameInfo.resolution})`, 'success');
    showFeatureModal(
      'Frame Information Snapshot',
      `<strong>Sequence:</strong> ${frameInfo.sequenceName}<br/>
       <strong>Playhead:</strong> ${frameInfo.timecode} (${frameInfo.seconds}s)<br/>
       <strong>Resolution:</strong> ${frameInfo.resolution}<br/>
       <strong>Timestamp:</strong> ${frameInfo.capturedAt}<br/><br/>
       <em>Frame snapshot ready for thumbnail generation.</em>`,
      'Active'
    );
  } catch (error) {
    Utils.showStatus(`✕ ${error.message || error}`, 'error');
  }
}

/**
 * Bind all DOM event listeners
 */
function attachEventListeners() {
  // Refresh & Sync
  if (elements.btnRefresh) {
    elements.btnRefresh.addEventListener('click', refreshProjectInfo);
  }
  if (elements.btnSyncTime) {
    elements.btnSyncTime.addEventListener('click', handleSyncTime);
  }

  // Aspect Ratio buttons
  if (elements.btnRatio169) {
    elements.btnRatio169.addEventListener('click', () => handleCreateRatioSequence('16:9'));
  }
  if (elements.btnRatio916) {
    elements.btnRatio916.addEventListener('click', () => handleCreateRatioSequence('9:16'));
  }
  if (elements.btnRatio11) {
    elements.btnRatio11.addEventListener('click', () => handleCreateRatioSequence('1:1'));
  }

  // Marker
  if (elements.btnAddMarker) {
    elements.btnAddMarker.addEventListener('click', handleAddMarker);
  }
  if (elements.inputMarkerName) {
    elements.inputMarkerName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddMarker();
    });
  }

  // Clear Logs
  if (elements.btnClearLog) {
    elements.btnClearLog.addEventListener('click', () => Utils.logger.clear());
  }

  // Video Tools Interactive List Items
  if (elements.itemVideoRemoveSilence) {
    elements.itemVideoRemoveSilence.addEventListener('click', () => {
      showFeatureModal(
        'Remove Silence',
        'Auto-detection and ripple-deletion of silent audio pauses in timeline audio tracks.<br/><br/>' +
        '<strong>Status:</strong> Scheduled for Phase 2 via UXP audio analysis & clip trimming actions.'
      );
    });
  }
  if (elements.itemVideoAddMarker) {
    elements.itemVideoAddMarker.addEventListener('click', handleAddMarker);
  }
  if (elements.itemVideoCreateSeq) {
    elements.itemVideoCreateSeq.addEventListener('click', () => handleCreateRatioSequence('16:9'));
  }
  if (elements.itemVideoGetInfo) {
    elements.itemVideoGetInfo.addEventListener('click', refreshProjectInfo);
  }

  // Captions
  if (elements.itemCaptionTools) {
    elements.itemCaptionTools.addEventListener('click', () => {
      showFeatureModal(
        'Caption Tools',
        'Tools for generating, splitting, and synchronizing subtitle tracks with video pacing.<br/><br/>' +
        '<strong>Status:</strong> Scheduled for Phase 2.'
      );
    });
  }
  if (elements.itemCaptionStyle) {
    elements.itemCaptionStyle.addEventListener('click', () => {
      showFeatureModal(
        'Apply Caption Style',
        'Apply SmartAdverts branded typography, text animation, background boxes, and color grading to caption tracks.<br/><br/>' +
        '<strong>Status:</strong> Scheduled for Phase 2.'
      );
    });
  }

  // Shorts / Reels items
  if (elements.itemShorts916) {
    elements.itemShorts916.addEventListener('click', () => handleCreateRatioSequence('9:16'));
  }
  if (elements.itemShorts11) {
    elements.itemShorts11.addEventListener('click', () => handleCreateRatioSequence('1:1'));
  }
  if (elements.itemShorts169) {
    elements.itemShorts169.addEventListener('click', () => handleCreateRatioSequence('16:9'));
  }

  // Thumbnail items
  if (elements.itemThumbCapture) {
    elements.itemThumbCapture.addEventListener('click', handleCaptureFrameInfo);
  }
  if (elements.itemThumbExport) {
    elements.itemThumbExport.addEventListener('click', () => {
      showFeatureModal(
        'Export Current Frame',
        'Extract and save a high-resolution PNG/JPEG thumbnail snapshot directly from the current playhead position.<br/><br/>' +
        '<strong>Status:</strong> Scheduled for Phase 2.'
      );
    });
  }

  // Modal close
  if (elements.modalBtnClose) {
    elements.modalBtnClose.addEventListener('click', hideFeatureModal);
  }
  if (elements.infoModal) {
    elements.infoModal.addEventListener('click', (e) => {
      if (e.target === elements.infoModal) hideFeatureModal();
    });
  }
}

// Application Startup
document.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  attachEventListeners();
  Utils.logger.log('SmartAdverts Premiere Tools panel loaded.');
  refreshProjectInfo();
});
