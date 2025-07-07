"use strict";

import { CONSOLE_MESSAGES } from '../conf/constants.conf.js';

export class I18n {
  /**
   * Get a localized message from Chrome's i18n API
   * @param {string} messageName - The message key from messages.json
   * @param {string|string[]} substitutions - Optional substitutions for placeholders
   * @returns {string} The localized message
   */
  static getMessage(messageName, substitutions = null) {
    try {
      return chrome.i18n.getMessage(messageName, substitutions);
    } catch (error) {
      console.warn(`${CONSOLE_MESSAGES.I18N_MESSAGE_FAILED} "${messageName}":`, error);
      return messageName; // Fallback to the key name
    }
  }

  /**
   * Initialize internationalization for the current page
   * Searches for elements with data-i18n attributes and replaces their content
   */
  static initializeI18n() {
    // Handle text content for elements with data-i18n
    const textElements = document.querySelectorAll('[data-i18n]');
    for (const element of textElements) {
      const messageKey = element.getAttribute('data-i18n');
      const localizedText = I18n.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        // Message came from messages.json. Assuming it contains safe HTML for formatting.
        element.innerHTML = localizedText;
      } else if (localizedText === messageKey) {
        // Fallback: Use the attribute value itself as text. MUST use textContent here to prevent XSS.
        element.textContent = messageKey;
      }
    }

    // Handle title attributes (should always be text)
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    for (const element of titleElements) {
      const messageKey = element.getAttribute('data-i18n-title');
      const localizedText = I18n.getMessage(messageKey);
      // Set attribute directly. If localizedText is empty/null, title might be empty or fallback to key.
      // Browsers treat title attribute value as text.
      element.setAttribute('title', localizedText || messageKey);
    }

    // Handle placeholder attributes (should always be text)
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    for (const element of placeholderElements) {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      const localizedText = I18n.getMessage(messageKey);
      // Set attribute directly. Browsers treat placeholder attribute value as text.
      element.setAttribute('placeholder', localizedText || messageKey);
    }
  }

  /**
   * Update a specific element's text content with localized message
   * @param {string} elementId - The ID of the element to update
   * @param {string} messageKey - The message key from messages.json
   * @param {string|string[]} substitutions - Optional substitutions for placeholders
   */
  static updateElementText(elementId, messageKey, substitutions = null) {
    const element = document.getElementById(elementId);
    if (element) {
      const localizedText = this.getMessage(messageKey, substitutions);
      if (localizedText && localizedText !== messageKey) {
        // Assuming status messages are plain text, textContent is appropriate.
        // If HTML is ever needed in status messages, this would need to be innerHTML.
        element.textContent = localizedText;
      } else if (localizedText === messageKey) {
        element.textContent = messageKey;
      }
    }
  }
}

export const { getMessage, initializeI18n, updateElementText } = I18n || {};

(() => {
  // Using an object for direct lookup based on readyState
  const readyStateActions = {
    loading: () => document.addEventListener('DOMContentLoaded', I18n.initializeI18n),
    interactive: I18n.initializeI18n, // Call directly if already interactive
    complete: I18n.initializeI18n // Call directly if already complete
  };

  // Check if document.readyState is one of the keys in readyStateActions
  if (readyStateActions[document.readyState]) {
    readyStateActions[document.readyState]();
  } else {
    // Fallback, though 'loading' is typical if script runs early.
    // If script is deferred, 'interactive' or 'complete' are more likely.
    document.addEventListener('DOMContentLoaded', I18n.initializeI18n);
  }
})();

export default new I18n();
