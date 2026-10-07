/**
 * SmartAdverts Premiere Tools - Utility Functions
 * Handles logging, status messaging, timecode calculations, and error handling.
 */

// Global state for logs
const logHistory = [];
const MAX_LOG_HISTORY = 100;

/**
 * Format timestamp for console/UI display (HH:MM:SS.mmm)
 */
function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

/**
 * In-panel & Developer Console Logger
 */
const logger = {
  log(message, data) {
    const time = getTimestamp();
    const entry = { type: 'info', time, message, data };
    this._append(entry);
    if (data !== undefined) {
      console.log(`[SmartAdverts ${time}] ${message}`, data);
    } else {
      console.log(`[SmartAdverts ${time}] ${message}`);
    }
  },

  success(message, data) {
    const time = getTimestamp();
    const entry = { type: 'success', time, message, data };
    this._append(entry);
    if (data !== undefined) {
      console.log(`%c[SmartAdverts ${time}] ✓ ${message}`, 'color: #38D39F; font-weight: bold;', data);
    } else {
      console.log(`%c[SmartAdverts ${time}] ✓ ${message}`, 'color: #38D39F; font-weight: bold;');
    }
  },

  warn(message, data) {
    const time = getTimestamp();
    const entry = { type: 'warn', time, message, data };
    this._append(entry);
    if (data !== undefined) {
      console.warn(`[SmartAdverts ${time}] ⚠ ${message}`, data);
    } else {
      console.warn(`[SmartAdverts ${time}] ⚠ ${message}`);
    }
  },

  error(message, error) {
    const time = getTimestamp();
    const entry = { type: 'error', time, message, error };
    this._append(entry);
    if (error !== undefined) {
      console.error(`[SmartAdverts ${time}] ✕ ${message}`, error);
    } else {
      console.error(`[SmartAdverts ${time}] ✕ ${message}`);
    }
  },

  _append(entry) {
    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) {
      logHistory.shift();
    }
    this._updateUI(entry);
  },

  _updateUI(entry) {
    if (typeof document === 'undefined') return;
    const logContainer = document.getElementById('debug-log-content');
    if (!logContainer) return;

    const line = document.createElement('div');
    line.className = `log-line log-${entry.type}`;
    
    let text = `[${entry.time}] ${entry.message}`;
    if (entry.error && entry.error.message) {
      text += ` (${entry.error.message})`;
    }
    line.textContent = text;
    logContainer.appendChild(line);

    // Keep log scrolled to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  },

  clear() {
    logHistory.length = 0;
    if (typeof document === 'undefined') return;
    const logContainer = document.getElementById('debug-log-content');
    if (logContainer) {
      logContainer.innerHTML = '<div class="log-line log-info">[System] Logs cleared. Ready.</div>';
    }
  },

  getHistory() {
    return [...logHistory];
  }
};

/**
 * Display user-facing status feedback banner
 * @param {string} message - Message to display
 * @param {'info' | 'success' | 'error' | 'warn'} type - Severity level
 * @param {number} duration - Auto-dismiss duration in ms (0 = persistent)
 */
let statusTimeout = null;

function showStatus(message, type = 'info', duration = 4000) {
  if (typeof document === 'undefined') return;

  const banner = document.getElementById('status-banner');
  const messageEl = document.getElementById('status-banner-text');
  const iconEl = document.getElementById('status-banner-icon');

  if (!banner || !messageEl) return;

  // Clear previous timer
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }

  // Set message and type
  messageEl.textContent = message;
  banner.className = `status-banner status-${type} show`;

  if (iconEl) {
    switch (type) {
      case 'success':
        iconEl.textContent = '✓';
        break;
      case 'error':
        iconEl.textContent = '✕';
        break;
      case 'warn':
        iconEl.textContent = '⚠';
        break;
      default:
        iconEl.textContent = 'ℹ';
        break;
    }
  }

  // Also record in logger
  if (type === 'error') {
    logger.error(message);
  } else if (type === 'success') {
    logger.success(message);
  } else if (type === 'warn') {
    logger.warn(message);
  } else {
    logger.log(message);
  }

  if (duration > 0) {
    statusTimeout = setTimeout(() => {
      banner.classList.remove('show');
    }, duration);
  }
}

/**
 * Convert seconds (float/int) to Timecode string (HH:MM:SS:FF)
 * @param {number} totalSeconds
 * @param {number} fps - Default 30.0
 * @returns {string} HH:MM:SS:FF
 */
function formatSecondsToTimecode(totalSeconds, fps = 30) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00:00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);
  const fractionalSeconds = remainingSeconds - Math.floor(remainingSeconds);
  const frames = Math.floor(fractionalSeconds * fps);

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Convert Premiere Pro ticks to Timecode string
 * Standard Premiere ticks per second = 254,016,000,000
 * @param {string|number} ticks
 * @param {number} fps
 * @returns {string}
 */
const TICKS_PER_SECOND = 254016000000;

function formatTicksToTimecode(ticks, fps = 30) {
  if (!ticks) return '00:00:00:00';
  
  let numTicks = 0;
  if (typeof ticks === 'string') {
    numTicks = parseFloat(ticks);
  } else if (typeof ticks === 'number') {
    numTicks = ticks;
  }

  if (isNaN(numTicks) || numTicks <= 0) {
    return '00:00:00:00';
  }

  const totalSeconds = numTicks / TICKS_PER_SECOND;
  return formatSecondsToTimecode(totalSeconds, fps);
}

/**
 * Safely parse a TickTime object or numeric time into a formatted timecode
 * @param {any} tickTimeObj - TickTime instance or number/string
 * @param {number} fps
 * @returns {string}
 */
function parseTickTimeToTimecode(tickTimeObj, fps = 30) {
  if (!tickTimeObj) return '00:00:00:00';

  // If it's an official UXP TickTime object with .seconds
  if (typeof tickTimeObj.seconds === 'number') {
    return formatSecondsToTimecode(tickTimeObj.seconds, fps);
  }

  // If it's an official UXP TickTime object with .ticks
  if (tickTimeObj.ticks !== undefined) {
    return formatTicksToTimecode(tickTimeObj.ticks, fps);
  }

  if (typeof tickTimeObj === 'number') {
    return formatSecondsToTimecode(tickTimeObj, fps);
  }

  if (typeof tickTimeObj === 'string') {
    // If already in HH:MM:SS:FF format
    if (/^\d{2}:\d{2}:\d{2}[:;]\d{2}$/.test(tickTimeObj)) {
      return tickTimeObj;
    }
    // If tick string
    return formatTicksToTimecode(tickTimeObj, fps);
  }

  return '00:00:00:00';
}

/**
 * Calculates standard aspect ratio label from width and height
 * @param {number} width
 * @param {number} height
 * @returns {string} e.g. "16:9", "9:16", "1:1", "4:3", "21:9", or "Custom"
 */
function getAspectRatioLabel(width, height) {
  if (!width || !height) return '--';

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const simplifiedW = width / divisor;
  const simplifiedH = height / divisor;

  const ratio = width / height;

  // Approximate standard ratios with precision tolerance
  if (Math.abs(ratio - 16 / 9) < 0.02) return '16:9 (Landscape)';
  if (Math.abs(ratio - 9 / 16) < 0.02) return '9:16 (Shorts/Reels)';
  if (Math.abs(ratio - 1.0) < 0.02) return '1:1 (Square)';
  if (Math.abs(ratio - 4 / 3) < 0.02) return '4:3 (Standard)';
  if (Math.abs(ratio - 21 / 9) < 0.05) return '21:9 (Ultrawide)';

  return `${simplifiedW}:${simplifiedH}`;
}

// Module export for CommonJS & Global Window fallback
const Utils = {
  logger,
  showStatus,
  formatSecondsToTimecode,
  formatTicksToTimecode,
  parseTickTimeToTimecode,
  getAspectRatioLabel,
  TICKS_PER_SECOND
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
if (typeof window !== 'undefined') {
  window.SmartUtils = Utils;
}
