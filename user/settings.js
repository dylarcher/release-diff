document.addEventListener('DOMContentLoaded', () => {
  const jiraBaseUrlInput = document.getElementById('jiraBaseUrl');
  const jiraPatInput = document.getElementById('jiraPat');
  const gitlabBaseUrlInput = document.getElementById('gitlabBaseUrl');
  const gitlabPatInput = document.getElementById('gitlabPat');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');
    const testBtn = document.getElementById('testBtn');
    const testJiraBtn = document.getElementById('testJiraBtn');
    const testGitLabBtn = document.getElementById('testGitLabBtn');

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

    // Test button to verify background script communication
    testBtn.addEventListener('click', async () => {
        displayStatus('Testing connection...', 'info');
        try {
            const response = await chrome.runtime.sendMessage({ action: 'test' });
            console.log('Test response:', response);
            if (response && response.success) {
                displayStatus('✓ Background script connection successful!', 'success');
                testBtn.textContent = 'Re-test Connection';
            } else {
                displayStatus('✗ Background script connection failed', 'error');
            }
        } catch (error) {
            displayStatus('✗ Test failed - check console', 'error');
            console.error('Test error:', error);
        }
    });

    // Test Jira connection specifically
    testJiraBtn.addEventListener('click', async () => {
        displayStatus('Testing Jira API connection...', 'info');
        try {
            const response = await chrome.runtime.sendMessage({ action: 'testJira' });
            console.log('Jira test response:', response);
            if (response && response.success) {
                displayStatus('✓ Jira API connection successful!', 'success');
                testJiraBtn.textContent = 'Re-test Jira API';
                console.log('Jira server info:', response.data);
            } else {
                displayStatus(`✗ Jira API test failed: ${response?.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayStatus('✗ Jira test failed - check console', 'error');
            console.error('Jira test error:', error);
        }
    });

    // Test GitLab connection specifically
    testGitLabBtn.addEventListener('click', async () => {
        displayStatus('Testing GitLab API connection...', 'info');
        try {
            const response = await chrome.runtime.sendMessage({ action: 'testGitLab' });
            console.log('GitLab test response:', response);
            if (response && response.success) {
                displayStatus('✓ GitLab API connection successful!', 'success');
                testGitLabBtn.textContent = 'Re-test GitLab API';
                console.log('GitLab server info:', response.data);
            } else {
                displayStatus(`✗ GitLab API test failed: ${response?.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayStatus('✗ GitLab test failed - check console', 'error');
            console.error('GitLab test error:', error);
        }
    });

  // Function to display status messages
  function displayStatus(message, type) {
      statusDiv.textContent = message; ""
      statusDiv.className = `status-message ${type === 'success' ? 'status-success' : 'status-error'}`;
      statusDiv.classList.add('visible');
      setTimeout(() => {
          statusDiv.classList.remove('visible');
      }, 3000); // Hide after 3 seconds
  }
});
