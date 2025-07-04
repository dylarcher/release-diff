import { CSS_CLASSES, STATUS_TYPES } from '../shared/presetConstants.js';

class StatusDisplayManager {
  static displayStatusMessage(messageElement, message, type) {
    messageElement.textContent = message;

    const typeClasses = {
      [STATUS_TYPES.ERROR]: CSS_CLASSES.STATUS_ERROR,
      [STATUS_TYPES.SUCCESS]: CSS_CLASSES.STATUS_SUCCESS,
      [STATUS_TYPES.INFO]: CSS_CLASSES.STATUS_INFO
    };

    messageElement.className = `${CSS_CLASSES.STATUS_MESSAGE} ${CSS_CLASSES.VISIBLE} ${typeClasses[type] || CSS_CLASSES.STATUS_INFO}`;
  }

  static displayStatusWithAutoHide(messageElement, message, type, hideAfterMs = 3000) {
    messageElement.textContent = message;

    const typeClasses = {
      [STATUS_TYPES.SUCCESS]: CSS_CLASSES.STATUS_SUCCESS,
      [STATUS_TYPES.ERROR]: CSS_CLASSES.STATUS_ERROR
    };

    messageElement.className = `${CSS_CLASSES.STATUS_MESSAGE} ${typeClasses[type] || CSS_CLASSES.STATUS_ERROR}`;
    messageElement.classList.add(CSS_CLASSES.VISIBLE);

    if (hideAfterMs > 0) {
      setTimeout(() => {
        messageElement.classList.remove(CSS_CLASSES.VISIBLE);
      }, hideAfterMs);
    }
  }
}

// Export individual functions for backward compatibility
export const displayStatusMessage = StatusDisplayManager.displayStatusMessage;
export const displayStatusWithAutoHide = StatusDisplayManager.displayStatusWithAutoHide;
export default StatusDisplayManager;
