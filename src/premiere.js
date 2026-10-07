/**
 * SmartAdverts Premiere Tools - Core Premiere Pro Bridge
 * Manages host detection, connection status, and active project access.
 */

// Safe reference to Premiere Pro host module
let ppro = null;
let isHostDetected = false;

try {
  if (typeof require === 'function') {
    ppro = require('premierepro');
    if (ppro) {
      isHostDetected = true;
    }
  }
} catch (error) {
  // Not in UXP host runtime or running in standalone browser test
  ppro = null;
  isHostDetected = false;
}

/**
 * Checks if the Premiere Pro UXP API is available in current runtime
 * @returns {boolean}
 */
function isAvailable() {
  if (isHostDetected && ppro) {
    return true;
  }
  // Retry require if it was loaded later
  try {
    if (typeof require === 'function') {
      ppro = require('premierepro');
      isHostDetected = !!ppro;
      return isHostDetected;
    }
  } catch (e) {
    return false;
  }
  return false;
}

/**
 * Returns the raw Premiere Pro host object
 */
function getApp() {
  if (!isAvailable()) {
    return null;
  }
  return ppro;
}

/**
 * Retrieves the active Premiere Pro project
 * @returns {Promise<any|null>} Active project object or null
 */
async function getActiveProject() {
  if (!isAvailable()) {
    return null;
  }

  try {
    // Official UXP 25.6+ standard: ppro.Project.getActiveProject()
    if (ppro.Project && typeof ppro.Project.getActiveProject === 'function') {
      const proj = await ppro.Project.getActiveProject();
      return proj;
    }
    // Alternate or direct property fallback
    if (ppro.app && ppro.app.project) {
      return ppro.app.project;
    }
    if (ppro.project) {
      return ppro.project;
    }
    return null;
  } catch (error) {
    console.error('[SmartAdverts] Error retrieving active project:', error);
    return null;
  }
}

/**
 * Retrieves the currently active sequence from the active project
 * @returns {Promise<any|null>} Active sequence object or null
 */
async function getActiveSequence() {
  const project = await getActiveProject();
  if (!project) {
    return null;
  }

  try {
    // Official UXP standard: project.getActiveSequence()
    if (typeof project.getActiveSequence === 'function') {
      const seq = await project.getActiveSequence();
      return seq;
    }
    // Direct property fallback
    if (project.activeSequence) {
      return project.activeSequence;
    }
    return null;
  } catch (error) {
    console.error('[SmartAdverts] Error retrieving active sequence:', error);
    return null;
  }
}

/**
 * Gets a comprehensive health/connection report
 * @returns {Promise<object>} Connection diagnostics
 */
async function getConnectionInfo() {
  const available = isAvailable();
  if (!available) {
    return {
      connected: false,
      hostAvailable: false,
      projectName: 'Not Connected',
      sequenceName: 'Not Connected',
      details: 'Premiere Pro UXP host API not detected. Open via UXP Developer Tool inside Premiere Pro.'
    };
  }

  try {
    const project = await getActiveProject();
    if (!project) {
      return {
        connected: true,
        hostAvailable: true,
        hasProject: false,
        projectName: 'No Project Open',
        sequenceName: 'None',
        details: 'Premiere Pro connected. Please open or create a project.'
      };
    }

    const projectName = project.name || 'Untitled Project';
    const sequence = await getActiveSequence();

    if (!sequence) {
      return {
        connected: true,
        hostAvailable: true,
        hasProject: true,
        projectName,
        hasSequence: false,
        sequenceName: 'No Sequence Active',
        details: 'Project open. Please click or open a sequence in the timeline.'
      };
    }

    const sequenceName = sequence.name || 'Untitled Sequence';

    return {
      connected: true,
      hostAvailable: true,
      hasProject: true,
      projectName,
      hasSequence: true,
      sequenceName,
      details: 'Premiere Pro connected and active sequence detected.'
    };
  } catch (error) {
    return {
      connected: false,
      hostAvailable: true,
      projectName: 'Error querying project',
      sequenceName: 'Error',
      error: error.message || String(error),
      details: 'Error while communicating with Premiere Pro.'
    };
  }
}

// Module export for CommonJS & Global Window fallback
const PremiereBridge = {
  isAvailable,
  getApp,
  getActiveProject,
  getActiveSequence,
  getConnectionInfo
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PremiereBridge;
}
if (typeof window !== 'undefined') {
  window.SmartPremiere = PremiereBridge;
}
