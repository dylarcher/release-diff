import { STATUS_TYPES } from "../shared/constants.js";

export class ToastNotificationService {
  constructor() {
    this.createToastContainer();
    this.toastQueue = [];
    this.maxToasts = 5;
  }

  createToastContainer() {
    if (!document.getElementById("toast-container")) {
      const container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - The type of toast (error, success, info, warning)
   * @param {number} duration - Duration in milliseconds (0 for permanent)
   * @param {boolean} showCloseButton - Whether to show close button
   */
  showToast(
    message,
    type = STATUS_TYPES.INFO,
    duration = 5000,
    showCloseButton = true
  ) {
    const toastId = this.generateToastId();
    const toast = this.createToastElement(
      toastId,
      message,
      type,
      showCloseButton
    );

    this.addToastToContainer(toast);

    // Show the toast with animation
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    // Auto-hide after duration if specified
    if (duration > 0) {
      setTimeout(() => {
        this.hideToast(toastId);
      }, duration);
    }

    return toastId;
  }

  createToastElement(id, message, type, showCloseButton) {
    const toast = document.createElement("div");
    toast.id = id;
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "polite");

    const messageElement = document.createElement("p");
    messageElement.className = "toast-message";
    messageElement.textContent = message;

    toast.appendChild(messageElement);

    if (showCloseButton) {
      const closeButton = document.createElement("button");
      closeButton.className = "toast-close";
      closeButton.setAttribute("aria-label", "Close notification");
      closeButton.addEventListener("click", () => this.hideToast(id));
      toast.appendChild(closeButton);
    }

    return toast;
  }

  addToastToContainer(toast) {
    const container = document.getElementById("toast-container");
    if (!container) {
      this.createToastContainer();
      return this.addToastToContainer(toast);
    }

    // Remove oldest toast if we've reached the maximum
    const existingToasts = container.querySelectorAll(".toast");
    if (existingToasts.length >= this.maxToasts) {
      const oldestToast = existingToasts[0];
      this.hideToast(oldestToast.id);
    }

    container.appendChild(toast);
  }

  hideToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.classList.remove("show");

      // Remove from DOM after animation
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300); // Match the CSS transition duration
    }
  }

  generateToastId() {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods
  showError(message, duration = 6000) {
    return this.showToast(message, STATUS_TYPES.ERROR, duration);
  }

  showSuccess(message, duration = 4000) {
    return this.showToast(message, STATUS_TYPES.SUCCESS, duration);
  }

  showInfo(message, duration = 4000) {
    return this.showToast(message, STATUS_TYPES.INFO, duration);
  }

  showWarning(message, duration = 5000) {
    return this.showToast(message, "warning", duration);
  }

  clearAllToasts() {
    const container = document.getElementById("toast-container");
    if (container) {
      const toasts = container.querySelectorAll(".toast");
      toasts.forEach((toast) => this.hideToast(toast.id));
    }
  }
}

export const toast = new ToastNotificationService();
export default toast;
