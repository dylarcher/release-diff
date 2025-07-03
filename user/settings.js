document.addEventListener('DOMContentLoaded', () => {
  const jiraBaseUrlInput = document.getElementById('jiraBaseUrl');
  const jiraPatInput = document.getElementById('jiraPat');
  const gitlabBaseUrlInput = document.getElementById('gitlabBaseUrl');
  const gitlabPatInput = document.getElementById('gitlabPat');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  // Load saved settings when the options page opens
  chrome.storage.local.get(['jiraBaseUrl', 'jiraPat', 'gitlabBaseUrl', 'gitlabPat'], (result) => {
      jiraBaseUrlInput.value = result.jiraBaseUrl || '';
      jiraPatInput.value = result.jiraPat || '';
      gitlabBaseUrlInput.value = result.gitlabBaseUrl || '';
      gitlabPatInput.value = result.gitlabPat || '';
  });

  // Save settings when the button is clicked
  saveButton.addEventListener('click', () => {
      const jiraBaseUrl = jiraBaseUrlInput.value.trim();
      const jiraPat = jiraPatInput.value.trim();
      const gitlabBaseUrl = gitlabBaseUrlInput.value.trim();
      const gitlabPat = gitlabPatInput.value.trim();

      if (!jiraBaseUrl || !jiraPat || !gitlabBaseUrl || !gitlabPat) {
          displayStatus('All fields are required!', 'error');
          return;
      }

      chrome.storage.local.set({ jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat }, () => {
          displayStatus('Settings saved!', 'success');
      });
  });

  // Function to display status messages
  function displayStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = `status-message ${type === 'success' ? 'status-success' : 'status-error'}`;
      statusDiv.classList.remove('hidden');
      setTimeout(() => {
          statusDiv.classList.add('hidden');
      }, 3000); // Hide after 3 seconds
  }
});
