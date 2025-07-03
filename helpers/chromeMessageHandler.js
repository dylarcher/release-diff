export async function sendMessageToBackgroundScript(action, data = {}) {
  try {
    const response = await chrome.runtime.sendMessage({ action, data });

    if (!response) {
      throw new Error('No response from background script. Please check extension setup.');
    }

    return response;
  } catch (error) {
    console.error(`Error sending message with action '${action}':`, error);
    throw error;
  }
}

export function handleAsyncBackgroundMessage(messageHandler) {
  return (request, sender, sendResponse) => {
    (async () => {
      try {
        const result = await messageHandler(request, sender);
        sendResponse(result);
      } catch (error) {
        console.error('Background message handler error:', error);
        sendResponse({
          success: false,
          message: error.message || 'Unknown error occurred',
          error: error.toString()
        });
      }
    })();

    return true;
  };
}
