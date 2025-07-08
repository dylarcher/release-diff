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
export const saveFormDataToStorage = ChromeStorageManager.saveFormDataToStorage;
export const loadFormDataFromStorage = ChromeStorageManager.loadFormDataFromStorage;
export const saveApiConfigurationToStorage = ChromeStorageManager.saveApiConfigurationToStorage;
export const loadApiConfigurationFromStorage = ChromeStorageManager.loadApiConfigurationFromStorage;
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

export default ChromeStorageManager;
