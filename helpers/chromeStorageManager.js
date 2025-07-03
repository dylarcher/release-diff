export function saveFormDataToStorage(formData) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ formData }, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        console.log('Form values saved to storage');
        resolve(result);
      }
    });
  });
}

export function loadFormDataFromStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['formData'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.formData || {});
      }
    });
  });
}

export function saveApiConfigurationToStorage(jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat }, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

export function loadApiConfigurationFromStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['jiraBaseUrl', 'jiraPat', 'gitlabBaseUrl', 'gitlabPat'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}
