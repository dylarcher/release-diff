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
    // Handle text content
    const textElements = document.querySelectorAll('[data-i18n]');
    for (const element of textElements) {
      const messageKey = element.getAttribute('data-i18n');
      const localizedText = this.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        // Handle HTML content with placeholders
        const content = {
          true: () => this.processPlaceholders(localizedText, messageKey),
          false: () => localizedText
        }[Boolean(localizedText.includes('$'))]();

        if (Boolean(localizedText.includes('$'))) {
          element.innerHTML = content;
        } else {
          element.textContent = content;
        }
      }
    }

    // Handle title attributes
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    for (const element of titleElements) {
      const messageKey = element.getAttribute('data-i18n-title');
      const localizedText = this.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        element.setAttribute('title', localizedText);
      }
    }

    // Handle placeholder attributes
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    for (const element of placeholderElements) {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      const localizedText = this.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        element.setAttribute('placeholder', localizedText);
      }
    }
  }

  /**
   * Process placeholders in localized text
   * @param {string} text - The text with placeholders
   * @param {string} messageKey - The original message key for context
   * @returns {string} The processed text with HTML
   */
  static processPlaceholders(text, messageKey) {
    const placeholderProcessors = {
      compareNotice: (text) => text
        .replace('$JIRA_TICKETS$', '<em>Jira tickets</em>')
        .replace('$GITLAB_CHANGES$', '<em>GitLab changes</em>'),

      poweredBy: (text) => text.replace('$CHROME_EXTENSION_API$', '<strong>Chrome Extension API</strong>'),

      securityNoticeText: (text) => text
        .replace('$API$', '<abbr title="Application Programming Interface">API</abbr>')
        .replace('$PAT$', '<abbr title="Personal Access Token">PAT</abbr>')
        .replace('$NOT$', '<ins>NOT</ins>')
        .replace('$THIS_EXTENSION$', '<em>This extension</em>')
        .replace('$LOCAL_STORAGE$', '<code>localStorage</code>'),

      jiraPatHint: (text) => text
        .replace('$PAT$', '<abbr title="Personal Access Token">PAT</abbr>')
        .replace('$LEARN_LINK$', '<a href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/" target="_blank">Learn how to generate a Jira <abbr title="Application Programming Interface">API</abbr> token</a>'),

      gitlabPatHint: (text) => text
        .replace('$PAT$', '<abbr title="Personal Access Token">PAT</abbr>')
        .replace('$LEARN_LINK$', '<a href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html" target="_blank">Learn how to create a GitLab <abbr title="Personal Access Token">PAT</abbr></a>'),

      jiraUrl: (text) => text.replace('$URL$', '<abbr title="Uniform Resource Locator">URL</abbr>'),
      gitlabUrl: (text) => text.replace('$URL$', '<abbr title="Uniform Resource Locator">URL</abbr>'),

      jiraPat: (text) => text.replace('$PAT$', '<abbr title="Personal Access Token">PAT</abbr>'),
      gitlabPat: (text) => text.replace('$PAT$', '<abbr title="Personal Access Token">PAT</abbr>'),

      testJiraApi: (text) => text.replace('$API$', '<abbr title="Application Programming Interface">API</abbr>'),
      testGitlabApi: (text) => text.replace('$API$', '<abbr title="Application Programming Interface">API</abbr>'),

      gitlabProjectIdHint: (text) => text.replace('$SETTINGS_PATH$', '<samp>Settings > General > Project ID</samp>'),

      jiraReleaseVersionIdHint: (text) => text.replace('$URL_PATTERN$', '<samp>.../browse/DDSTM/1.1.0/#####</samp>'),

      jiraUrlHint: (text) => text.replace('$EXAMPLE_URL$', '<samp>https://jira.dell.net</samp>'),

      gitlabUrlHint: (text) => text.replace('$EXAMPLE_URL$', '<samp>https://gitlab.dell.net</samp>')
    };

    return placeholderProcessors[messageKey] ? placeholderProcessors[messageKey](text) : text;
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
        element.textContent = localizedText;
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
  const readyStates = {
    loading: () => document.addEventListener('DOMContentLoaded', InternationalizationHelper.initializeI18n),
    interactive: () => InternationalizationHelper.initializeI18n(),
    complete: () => InternationalizationHelper.initializeI18n()
  };

  const handler = readyStates[document.readyState];
  if (handler) handler();
};

initializeWhenReady();
