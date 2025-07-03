export function displayStatusMessage(messageElement, message, type) {
  messageElement.textContent = message;
  messageElement.className = `status-message visible ${type === 'error' ? 'status-error' : type === 'success' ? 'status-success' : 'status-info'}`;
}

export function displayStatusWithAutoHide(messageElement, message, type, hideAfterMs = 3000) {
  messageElement.textContent = message;
  messageElement.className = `status-message ${type === 'success' ? 'status-success' : 'status-error'}`;
  messageElement.classList.add('visible');

  if (hideAfterMs > 0) {
    setTimeout(() => {
      messageElement.classList.remove('visible');
    }, hideAfterMs);
  }
}
