"use strict";

import { STORAGE_KEYS, CONSOLE_MESSAGES } from "../conf/constants.conf.js";
import { loadApiConfigurationFromStorage, saveApiConfigurationToStorage } from "../api/store.api.js";

export class ClientStorage {
  // Theme preference methods
  static async saveThemePreference(theme) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(
        { [STORAGE_KEYS.THEME_PREFERENCE]: theme },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              CONSOLE_MESSAGES.SAVE_ERROR,
              chrome.runtime.lastError,
            );
            reject(chrome.runtime.lastError);
          } else {
            console.info(CONSOLE_MESSAGES.THEME_SAVED, theme);
            resolve();
          }
        },
      );
    });
  }

  static async loadThemePreference() {
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

  // User modifications storage methods
  static generateContextKey(
    jiraProjectKey,
    jiraFixVersion,
    gitlabProjectId,
    gitlabCurrentTag,
    gitlabPreviousTag,
  ) {
    // Normalize inputs to prevent minor differences from creating different keys
    const pKey = jiraProjectKey?.trim().toUpperCase() || "unknownproject";
    const fVersion = jiraFixVersion?.trim() || "unknownfixversion";
    const gProjectId = gitlabProjectId?.trim() || "unknowngitlabproject";
    const gCurrTag = gitlabCurrentTag?.trim() || "unknowncurrenttag";
    const gPrevTag = gitlabPreviousTag?.trim() || "unknownprevtag";
    return `${pKey}_${fVersion}_${gProjectId}_${gCurrTag}_${gPrevTag}`;
  }

  static async saveUserModifications(contextKey, modifications) {
    return new Promise(async (resolve, reject) => {
      try {
        const allModifications = await this.loadAllUserModifications();
        allModifications[contextKey] = modifications;
        chrome.storage.local.set(
          { [STORAGE_KEYS.USER_MODIFICATIONS]: allModifications },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error saving user modifications:",
                chrome.runtime.lastError,
              );
              reject(chrome.runtime.lastError);
            } else {
              console.info(
                "User modifications saved for context:",
                contextKey,
                modifications,
              );
              resolve();
            }
          },
        );
      } catch (error) {
        console.error("Failed to save user modifications:", error);
        reject(error);
      }
    });
  }

  static async loadUserModifications(contextKey) {
    return new Promise(async (resolve, reject) => {
      try {
        const allModifications = await this.loadAllUserModifications();
        resolve(
          allModifications[contextKey] || {
            manualMatches: [],
            userUnmatches: [],
            flaggedItems: {},
          },
        );
      } catch (error) {
        console.error(
          "Failed to load user modifications for context:",
          contextKey,
          error,
        );
        // Resolve with empty defaults if there's an error, so the app doesn't break
        resolve({ manualMatches: [], userUnmatches: [], flaggedItems: {} });
      }
    });
  }

  static async loadAllUserModifications() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([STORAGE_KEYS.USER_MODIFICATIONS], (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error loading all user modifications:",
            chrome.runtime.lastError,
          );
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[STORAGE_KEYS.USER_MODIFICATIONS] || {});
        }
      });
    });
  }
}

export const {
  generateContextKey,
  loadAllUserModifications,
  loadThemePreference,
  loadUserModifications,
  saveThemePreference,
  saveUserModifications,
} = ClientStorage || {};

export default new ClientStorage();
