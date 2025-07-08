import { CONSOLE_MESSAGES } from '../shared/constants.js';

export class InternationalizationHelper {
  static getMessage(messageName, substitutions = null) {
    try {
      return chrome.i18n.getMessage(messageName, substitutions);
    } catch (error) {
      console.warn(`${CONSOLE_MESSAGES.I18N_MESSAGE_FAILED} "${messageName}":`, error);
      return messageName;
    }
  }
  static initializeI18n() {
    const textElements = document.querySelectorAll('[data-i18n]');
    for (const element of textElements) {
      const messageKey = element.getAttribute('data-i18n');
      const localizedText = InternationalizationHelper.getMessage(messageKey);

      if (localizedText && localizedText !== messageKey) {
        element.innerHTML = localizedText;
      } else if (localizedText === messageKey) {
        element.textContent = messageKey;
      }
    }
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    for (const element of titleElements) {
      const messageKey = element.getAttribute('data-i18n-title');
      const localizedText = InternationalizationHelper.getMessage(messageKey);
      element.setAttribute('title', localizedText || messageKey);
    }
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    for (const element of placeholderElements) {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      const localizedText = InternationalizationHelper.getMessage(messageKey);
      element.setAttribute('placeholder', localizedText || messageKey);
    }
  }
  static updateElementText(elementId, messageKey, substitutions = null) {
    const element = document.getElementById(elementId);
    if (element) {
      const localizedText = this.getMessage(messageKey, substitutions);
      if (localizedText && localizedText !== messageKey) {
        element.textContent = localizedText;
      } else if (localizedText === messageKey) {
        element.textContent = messageKey;
      }
    }
  }
}

export const { getMessage, initializeI18n, updateElementText } = InternationalizationHelper;
export default new InternationalizationHelper();

(() => {
  const readyStateActions = {
    loading: () => document.addEventListener('DOMContentLoaded', InternationalizationHelper.initializeI18n),
    interactive: InternationalizationHelper.initializeI18n,
    complete: InternationalizationHelper.initializeI18n
  };
  if (readyStateActions[document.readyState]) {
    readyStateActions[document.readyState]();
  } else {
    document.addEventListener('DOMContentLoaded', InternationalizationHelper.initializeI18n);
  }
})();
