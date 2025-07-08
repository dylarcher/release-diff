import { ERROR_MESSAGES, CONSOLE_MESSAGES } from '../shared/constants.js';

class ChromeMessageHandler {
  static async sendMessageToBackgroundScript(action, data = {}) {
    try {
      const response = await chrome.runtime.sendMessage({ action, data });

      if (!response) {
        throw new Error(ERROR_MESSAGES.NO_BACKGROUND_SCRIPT_RESPONSE);
      }

      return response;
    } catch (error) {
      console.error(`${CONSOLE_MESSAGES.ERROR_SENDING_MESSAGE_WITH_ACTION} '${action}':`, error);
      throw error;
    }
  }

  static handleAsyncBackgroundMessage(messageHandler) {
    return (request, sender, sendResponse) => {
      (async () => {
        try {
          const result = await messageHandler(request, sender);
          sendResponse(result);
        } catch (error) {
          console.error(CONSOLE_MESSAGES.BACKGROUND_MESSAGE_HANDLER_ERROR, error);
          sendResponse({
            success: false,
            message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR_OCCURRED,
            error: error.toString()
          });
        }
      })();

      return true;
    };
  }
}
export const sendMessageToBackgroundScript = ChromeMessageHandler.sendMessageToBackgroundScript;
export const handleAsyncBackgroundMessage = ChromeMessageHandler.handleAsyncBackgroundMessage;
export default ChromeMessageHandler;
