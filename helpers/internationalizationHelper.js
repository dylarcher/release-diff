/**
 * Internationalization helper for Chrome Extension
 * Handles loading and applying localized messages to HTML elements
 */

import { CONSOLE_MESSAGES } from '../shared/presetConstants.js';

class InternationalizationHelper {
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
      const localizedText = InternationalizationHelper.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        // HTML (simple tags) should be directly in messages.json.
        // Default to innerHTML to render them.
        element.innerHTML = localizedText;
      } else if (localizedText === messageKey) {
        // Fallback or if key is the desired text and no message found
        element.innerHTML = messageKey; // Use innerHTML for consistency, works for plain text too.
      }
    }

    // Handle title attributes
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    for (const element of titleElements) {
      const messageKey = element.getAttribute('data-i18n-title');
      const localizedText = InternationalizationHelper.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        element.setAttribute('title', localizedText);
      } else if (localizedText === messageKey) {
        element.setAttribute('title', messageKey);
      }
    }

    // Handle placeholder attributes for input fields
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    for (const element of placeholderElements) {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      const localizedText = InternationalizationHelper.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        element.setAttribute('placeholder', localizedText);
      } else if (localizedText === messageKey) {
        element.setAttribute('placeholder', messageKey);
      }
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

// Export individual functions for backward compatibility
export const getMessage = InternationalizationHelper.getMessage;
export const initializeI18n = InternationalizationHelper.initializeI18n;
export const updateElementText = InternationalizationHelper.updateElementText;
export default InternationalizationHelper;

// Auto-initialize when DOM is ready
const initializeWhenReady = () => {
  // Using an object for direct lookup based on readyState
  const readyStateActions = {
    loading: () => document.addEventListener('DOMContentLoaded', InternationalizationHelper.initializeI18n),
    interactive: InternationalizationHelper.initializeI18n, // Call directly if already interactive
    complete: InternationalizationHelper.initializeI18n // Call directly if already complete
  };

  // Check if document.readyState is one of the keys in readyStateActions
  if (readyStateActions[document.readyState]) {
    readyStateActions[document.readyState]();
  } else {
    // Fallback, though 'loading' is typical if script runs early.
    // If script is deferred, 'interactive' or 'complete' are more likely.
    document.addEventListener('DOMContentLoaded', InternationalizationHelper.initializeI18n);
  }
};

initializeWhenReady();
