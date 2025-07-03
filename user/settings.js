import { displayStatusWithAutoHide } from '../helpers/statusDisplayManager.js';
import { saveApiConfigurationToStorage, loadApiConfigurationFromStorage } from '../helpers/chromeStorageManager.js';
import { sendMessageToBackgroundScript } from '../helpers/chromeMessageHandler.js';
import { validateRequiredFields } from '../helpers/formValidationHelpers.js';

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

    loadSavedSettingsIntoForm();

    saveButton.addEventListener('click', async () => {
      const jiraBaseUrl = jiraBaseUrlInput.value.trim();
      const jiraPat = jiraPatInput.value.trim();
      const gitlabBaseUrl = gitlabBaseUrlInput.value.trim();
      const gitlabPat = gitlabPatInput.value.trim();

        const validation = validateRequiredFields({
            jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat
        });

        if (!validation.isValid) {
            displayStatusWithAutoHide(statusDiv, 'All fields are required!', 'error');
          return;
      }

        try {
          await saveApiConfigurationToStorage(jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat);
          displayStatusWithAutoHide(statusDiv, 'Settings saved!', 'success');
      } catch (error) {
            displayStatusWithAutoHide(statusDiv, 'Failed to save settings!', 'error');
            console.error('Save error:', error);
        }
    });

    testBtn.addEventListener('click', async () => {
        await testConnectionWithFeedback('test', 'Testing connection...', '✓ Background script connection successful!', testBtn, 'Re-test Connection');
    });

    testJiraBtn.addEventListener('click', async () => {
        await testConnectionWithFeedback('testJira', 'Testing Jira API connection...', '✓ Jira API connection successful!', testJiraBtn, 'Re-test Jira API');
    });

    testGitLabBtn.addEventListener('click', async () => {
        await testConnectionWithFeedback('testGitLab', 'Testing GitLab API connection...', '✓ GitLab API connection successful!', testGitLabBtn, 'Re-test GitLab API');
    });

    async function testConnectionWithFeedback(action, loadingMessage, successMessage, button, successButtonText) {
        displayStatusWithAutoHide(statusDiv, loadingMessage, 'info', 0);

        try {
            const response = await sendMessageToBackgroundScript(action);

            if (response.success) {
                displayStatusWithAutoHide(statusDiv, successMessage, 'success');
                button.textContent = successButtonText;
                if (response.data) {
                    console.log(`${action} response data:`, response.data);
                }
            } else {
                displayStatusWithAutoHide(statusDiv, `✗ ${action} failed: ${response.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            displayStatusWithAutoHide(statusDiv, `✗ ${action} failed - check console`, 'error');
            console.error(`${action} error:`, error);
        }
    }

    async function loadSavedSettingsIntoForm() {
        try {
            const config = await loadApiConfigurationFromStorage();
            jiraBaseUrlInput.value = config.jiraBaseUrl || '';
            jiraPatInput.value = config.jiraPat || '';
            gitlabBaseUrlInput.value = config.gitlabBaseUrl || '';
            gitlabPatInput.value = config.gitlabPat || '';
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
});
