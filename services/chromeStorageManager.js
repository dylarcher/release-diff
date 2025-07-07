import { STORAGE_KEYS, CONSOLE_MESSAGES } from '../shared/presetConstants.js';

class ChromeStorageManager {
  static async saveFormDataToStorage(formData) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEYS.FORM_DATA]: formData }, (result) => {
        const { success, error } = {
          true: { success: true, error: null },
          false: { success: false, error: chrome.runtime.lastError }
        }[!Boolean(chrome.runtime.lastError)];

        if (success) {
          console.log(CONSOLE_MESSAGES.FORM_VALUES_SAVED_TO_STORAGE);
          resolve(result);
        } else {
          reject(error);
        }
      });
    });
  }

  static async loadFormDataFromStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([STORAGE_KEYS.FORM_DATA], (result) => {
        const { success, error } = {
          true: { success: true, error: null },
          false: { success: false, error: chrome.runtime.lastError }
        }[!Boolean(chrome.runtime.lastError)];

        if (success) {
          resolve(result[STORAGE_KEYS.FORM_DATA] || {});
        } else {
          reject(error);
        }
      });
    });
  }

  static async saveApiConfigurationToStorage(jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat) {
    return new Promise((resolve, reject) => {
      const config = {
        [STORAGE_KEYS.JIRA_BASE_URL]: jiraBaseUrl,
        [STORAGE_KEYS.JIRA_PAT]: jiraPat,
        [STORAGE_KEYS.GITLAB_BASE_URL]: gitlabBaseUrl,
        [STORAGE_KEYS.GITLAB_PAT]: gitlabPat
      };

      chrome.storage.local.set(config, (result) => {
        const { success, error } = {
          true: { success: true, error: null },
          false: { success: false, error: chrome.runtime.lastError }
        }[!Boolean(chrome.runtime.lastError)];

        if (success) {
          resolve(result);
        } else {
          reject(error);
        }
      });
    });
  }

  static async loadApiConfigurationFromStorage() {
    const keys = [
      STORAGE_KEYS.JIRA_BASE_URL,
      STORAGE_KEYS.JIRA_PAT,
      STORAGE_KEYS.GITLAB_BASE_URL,
      STORAGE_KEYS.GITLAB_PAT
    ];

    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        const { success, error } = {
          true: { success: true, error: null },
          false: { success: false, error: chrome.runtime.lastError }
        }[!Boolean(chrome.runtime.lastError)];

        if (success) {
          resolve(result);
        } else {
          reject(error);
        }
      });
    });
  }
}

// Export individual functions for backward compatibility
export const saveFormDataToStorage = ChromeStorageManager.saveFormDataToStorage;
export const loadFormDataFromStorage = ChromeStorageManager.loadFormDataFromStorage;
export const saveApiConfigurationToStorage = ChromeStorageManager.saveApiConfigurationToStorage;
export const loadApiConfigurationFromStorage = ChromeStorageManager.loadApiConfigurationFromStorage;

// Theme preference functions
export async function saveThemePreference(theme) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.THEME_PREFERENCE]: theme }, () => {
      if (chrome.runtime.lastError) {
        console.error(CONSOLE_MESSAGES.SAVE_ERROR, chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log(CONSOLE_MESSAGES.THEME_SAVED, theme);
        resolve();
      }
    });
  });
}

export async function loadThemePreference() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.THEME_PREFERENCE], (result) => {
      if (chrome.runtime.lastError) {
        console.error(CONSOLE_MESSAGES.LOAD_ERROR, chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[STORAGE_KEYS.THEME_PREFERENCE]);
      }
    });
  });
}

// ===== User Modifications Storage =====

// Helper to generate a consistent context key
export function generateContextKey(jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag) {
  // Normalize inputs to prevent minor differences from creating different keys
  const pKey = jiraProjectKey?.trim().toUpperCase() || 'unknownproject';
  const fVersion = jiraFixVersion?.trim() || 'unknownfixversion';
  const gProjectId = gitlabProjectId?.trim() || 'unknowngitlabproject';
  const gCurrTag = gitlabCurrentTag?.trim() || 'unknowncurrenttag';
  const gPrevTag = gitlabPreviousTag?.trim() || 'unknownprevtag';
  return `${pKey}_${fVersion}_${gProjectId}_${gCurrTag}_${gPrevTag}`;
}

export async function saveUserModifications(contextKey, modifications) {
  return new Promise(async (resolve, reject) => {
    try {
      const allModifications = await loadAllUserModifications();
      allModifications[contextKey] = modifications;
      chrome.storage.local.set({ [STORAGE_KEYS.USER_MODIFICATIONS]: allModifications }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving user modifications:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('User modifications saved for context:', contextKey, modifications);
          resolve();
        }
      });
    } catch (error) {
      console.error('Failed to save user modifications:', error);
      reject(error);
    }
  });
}

export async function loadUserModifications(contextKey) {
  return new Promise(async (resolve, reject) => {
    try {
      const allModifications = await loadAllUserModifications();
      resolve(allModifications[contextKey] || { manualMatches: [], userUnmatches: [], flaggedItems: {} });
    } catch (error) {
      console.error('Failed to load user modifications for context:', contextKey, error);
      // Resolve with empty defaults if there's an error, so the app doesn't break
      resolve({ manualMatches: [], userUnmatches: [], flaggedItems: {} });
    }
  });
}

async function loadAllUserModifications() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.USER_MODIFICATIONS], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading all user modifications:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[STORAGE_KEYS.USER_MODIFICATIONS] || {});
      }
    });
  });
}


export default ChromeStorageManager;
