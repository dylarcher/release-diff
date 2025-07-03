import { displayStatusMessage } from '../helpers/statusDisplayManager.js';
import { saveFormDataToStorage, loadFormDataFromStorage } from '../helpers/chromeStorageManager.js';
import { sendMessageToBackgroundScript } from '../helpers/chromeMessageHandler.js';
import { clearElementContent, populateDatalistWithOptions, createDiscrepancyItemDiv } from '../helpers/domManipulationHelpers.js';
import { validateRequiredFields, extractFormFieldValues } from '../helpers/formValidationHelpers.js';

document.addEventListener('DOMContentLoaded', () => {
  const generateSummaryBtn = document.getElementById('generateSummaryBtn');
  const getVersionsBtn = document.getElementById('getVersionsBtn');
  const loadingSpinner = document.getElementById('loading-spinner');
  const statusMessageDiv = document.getElementById('statusMessage');
  const summaryResultsDiv = document.getElementById('summaryResults');
  const versionsDatalist = document.getElementById('versionsDatalist');

  const jiraProjectKeyInput = document.getElementById('jiraProjectKey');
  const jiraFixVersionInput = document.getElementById('jiraFixVersion');
  const gitlabProjectIdInput = document.getElementById('gitlabProjectId');
  const gitlabCurrentTagInput = document.getElementById('gitlabCurrentTag');
  const gitlabPreviousTagInput = document.getElementById('gitlabPreviousTag');

  const totalPlannedSpan = document.getElementById('totalPlanned');
  const totalInCodeSpan = document.getElementById('totalInCode');
  const countPlannedNotInCodeSpan = document.getElementById('countPlannedNotInCode');
  const countInCodeNotPlannedSpan = document.getElementById('countInCodeNotPlanned');
  const countStatusMismatchesSpan = document.getElementById('countStatusMismatches');

  const plannedNotInCodeList = document.getElementById('plannedNotInCodeList');
  const inCodeNotPlannedList = document.getElementById('inCodeNotPlannedList');
  const statusMismatchList = document.getElementById('statusMismatchList');
  const matchedIssuesList = document.getElementById('matchedIssuesList');

  const plannedNotInCodeSection = document.getElementById('plannedNotInCodeSection');
  const inCodeNotPlannedSection = document.getElementById('inCodeNotPlannedSection');
  const statusMismatchSection = document.getElementById('statusMismatchSection');

  const jiraTicketsDiv = document.getElementById('jira-tickets');
  const gitlabHistoryDiv = document.getElementById('gitlab-history');

  const optionsLink = document.getElementById('optionsLink');

  let fetchController;
  let debounceTimeout;

    loadFormValuesFromStorage();

  optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
  });

  generateSummaryBtn.addEventListener('click', async () => {
      const [jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag] =
          extractFormFieldValues(jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput);

      const validation = validateRequiredFields({
          jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag
      });

      if (!validation.isValid) {
          displayStatusMessage(statusMessageDiv, 'Please fill in all input fields.', 'error');
          return;
      }

      await saveFormValuesToStorage();
      showLoadingStateAndClearResults();
      displayStatusMessage(statusMessageDiv, 'Fetching and comparing data...', 'info');

      try {
          console.log('Sending message to background script...');

          const response = await sendMessageToBackgroundScript('generateReleaseSummary', {
              jiraProjectKey,
              jiraFixVersion,
              gitlabProjectId,
              gitlabCurrentTag,
              gitlabPreviousTag
          });

          console.log('Received response from background script:', response);
          loadingSpinner.classList.add('hidden');

          if (response.success) {
              displayStatusMessage(statusMessageDiv, 'Summary generated successfully!', 'success');
              displaySummaryResults(response.summary);
          } else {
              displayStatusMessage(statusMessageDiv, `Error: ${response.message || 'Unknown error occurred'}`, 'error');
          }
      } catch (error) {
          loadingSpinner.classList.add('hidden');
          displayStatusMessage(statusMessageDiv, 'An unexpected error occurred. Check console for details.', 'error');
          console.error("Side panel script error:", error);
      }
  });

  jiraFixVersionInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
          fetchAvailableFixVersions();
      }, 300);
  });

  getVersionsBtn.addEventListener('click', () => {
      fetchAvailableFixVersions();
  });

    async function fetchAvailableFixVersions() {
      const jiraProjectKey = jiraProjectKeyInput.value.trim();

      if (!jiraProjectKey) {
          displayStatusMessage(statusMessageDiv, 'Please enter a Jira project key first.', 'error');
          return;
      }

        abortPreviousFetchIfExists();
        setupNewFetchController();

        displayStatusMessage(statusMessageDiv, 'Fetching available fix versions...', 'info');
      loadingSpinner.classList.remove('hidden');

      try {
          const response = await sendMessageToBackgroundScript('getFixVersions', { jiraProjectKey });

          if (fetchController.signal.aborted) return;

          if (response.success) {
              displayStatusMessage(statusMessageDiv, '✓ Fix versions retrieved successfully!', 'success');
              populateDatalistWithOptions(versionsDatalist, response.data);
          } else {
              displayStatusMessage(statusMessageDiv, `✗ Failed to get fix versions: ${response.message || 'Unknown error'}`, 'error');
              clearElementContent(versionsDatalist);
          }
      } catch (error) {
          if (error.name !== 'AbortError') {
              displayStatusMessage(statusMessageDiv, '✗ Error getting fix versions - check console', 'error');
              console.error('Get versions error:', error);
              clearElementContent(versionsDatalist);
          }
      } finally {
          if (!fetchController.signal.aborted) {
              loadingSpinner.classList.add('hidden');
          }
      }
  }

    function displaySummaryResults(summary) {
      summaryResultsDiv.classList.remove('hidden');

        clearElementContent(jiraTicketsDiv);
        clearElementContent(gitlabHistoryDiv);

      summary.allJiraIssues.forEach(issue => {
          const issueHtml = `<strong><a href="https://your-jira-instance.com/browse/${issue.key}" target="_blank">${issue.key}</a></strong>: ${issue.summary} <br> <small>Status: ${issue.status}</small>`;
          const issueEl = createDiscrepancyItemDiv('discrepancy-item', issueHtml);
          jiraTicketsDiv.appendChild(issueEl);
      });

        summary.allGitLabCommits.forEach(commit => {
          let commitHtml = `<strong><a href="https://your-gitlab-instance.com/${summary.gitlabProjectPath}/-/commit/${commit.id}" target="_blank">${commit.short_id}</a></strong>: ${commit.title}`;
          if (commit.jira_keys && commit.jira_keys.length > 0) {
              commitHtml += `<br><small>Related Jira: ${commit.jira_keys.join(', ')}</small>`;
          }
          const commitEl = createDiscrepancyItemDiv('discrepancy-item', commitHtml);
          gitlabHistoryDiv.appendChild(commitEl);
      });
  }

    async function saveFormValuesToStorage() {
      const selectedVersion = Array.from(versionsDatalist.options).find(option => option.value === jiraFixVersionInput.value);
      const versionId = selectedVersion ? selectedVersion.dataset.id : jiraFixVersionInput.value;

      const formData = {
          jiraProjectKey: jiraProjectKeyInput.value.trim(),
          jiraFixVersion: versionId,
          gitlabProjectId: gitlabProjectIdInput.value.trim(),
          gitlabCurrentTag: gitlabCurrentTagInput.value.trim(),
          gitlabPreviousTag: gitlabPreviousTagInput.value.trim()
      };

        await saveFormDataToStorage(formData);
  }

    async function loadFormValuesFromStorage() {
        const data = await loadFormDataFromStorage();
        if (data.jiraProjectKey) jiraProjectKeyInput.value = data.jiraProjectKey;
        if (data.jiraFixVersion) jiraFixVersionInput.value = data.jiraFixVersion;
        if (data.gitlabProjectId) gitlabProjectIdInput.value = data.gitlabProjectId;
        if (data.gitlabCurrentTag) gitlabCurrentTagInput.value = data.gitlabCurrentTag;
        if (data.gitlabPreviousTag) gitlabPreviousTagInput.value = data.gitlabPreviousTag;
    }

    function showLoadingStateAndClearResults() {
        loadingSpinner.classList.remove('hidden');
        summaryResultsDiv.classList.add('hidden');
    }

    function abortPreviousFetchIfExists() {
        if (fetchController) {
            fetchController.abort();
        }
    }

    function setupNewFetchController() {
        fetchController = new AbortController();
  }
});
