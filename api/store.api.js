"use strict";

import { STORAGE_KEYS, CONSOLE_MESSAGES } from '../conf/constants.conf.js';

export class ChromeStore {
  static async saveFormDataToStorage(formData) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEYS.FORM_DATA]: formData }, (result) => {
        const { success, error } = {
          true: { success: true, error: null },
          false: { success: false, error: chrome.runtime.lastError }
        }[!Boolean(chrome.runtime.lastError)];

        if (success) {
          console.info(CONSOLE_MESSAGES.FORM_VALUES_SAVED_TO_STORAGE);
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

// Export named functions for compatibility
export const {
  saveFormDataToStorage,
  loadFormDataFromStorage,
  saveApiConfigurationToStorage,
  loadApiConfigurationFromStorage
} = ChromeStore;

// Add theme preference methods that are referenced in other files
export const saveThemePreference = async (theme) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.THEME_PREFERENCE]: theme }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

export const loadThemePreference = async () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.THEME_PREFERENCE], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[STORAGE_KEYS.THEME_PREFERENCE] || 'light');
      }
    });
  });
};

export default new ChromeStore();
