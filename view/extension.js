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

  // Load saved values from storage on page load
  loadFormValues();

  // Handle options link click
  optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
  });

  generateSummaryBtn.addEventListener('click', async () => {
      const jiraProjectKey = jiraProjectKeyInput.value.trim();
      const jiraFixVersion = jiraFixVersionInput.value.trim();
      const gitlabProjectId = gitlabProjectIdInput.value.trim();
      const gitlabCurrentTag = gitlabCurrentTagInput.value.trim();
      const gitlabPreviousTag = gitlabPreviousTagInput.value.trim();

      if (!jiraProjectKey || !jiraFixVersion || !gitlabProjectId || !gitlabCurrentTag || !gitlabPreviousTag) {
          displayStatus('Please fill in all input fields.', 'error');
          return;
      }

      // Save form values to storage
      saveFormValues();

      loadingSpinner.classList.remove('hidden');
      summaryResultsDiv.classList.add('hidden');
      displayStatus('Fetching and comparing data...', 'info');

      try {
          console.log('Sending message to background script...', {
              action: 'generateReleaseSummary',
              data: {
                  jiraProjectKey,
                  jiraFixVersion,
                  gitlabProjectId,
                  gitlabCurrentTag,
                  gitlabPreviousTag
              }
          });

          const response = await chrome.runtime.sendMessage({
              action: 'generateReleaseSummary',
              data: {
                  jiraProjectKey,
                  jiraFixVersion,
                  gitlabProjectId,
                  gitlabCurrentTag,
                  gitlabPreviousTag
              }
          });

          console.log('Received response from background script:', response);
          loadingSpinner.classList.add('hidden');

          // Check if response exists and handle undefined response
          if (!response) {
              displayStatus('No response from background script. Please check extension setup.', 'error');
              console.error("Error: No response received from background script");
              return;
          }

          if (response.success) {
              displayStatus('Summary generated successfully!', 'success');
              displaySummary(response.summary);
          } else {
              displayStatus(`Error: ${response.message || 'Unknown error occurred'}`, 'error');
              console.error("Error generating summary:", response.error || response);
          }
      } catch (error) {
          loadingSpinner.classList.add('hidden');
          displayStatus('An unexpected error occurred. Check console for details.', 'error');
          console.error("Side panel script error:", error);
      }
  });

  // Get available fix versions for project
  jiraFixVersionInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
          getFixVersions();
      }, 300);
  });

  getVersionsBtn.addEventListener('click', () => {
      getFixVersions();
  });

  async function getFixVersions() {
      const jiraProjectKey = jiraProjectKeyInput.value.trim();
      
      if (!jiraProjectKey) {
          displayStatus('Please enter a Jira project key first.', 'error');
          return;
      }
      
      if (fetchController) {
          fetchController.abort();
      }
      
      fetchController = new AbortController();
      const signal = fetchController.signal;
      
      displayStatus('Fetching available fix versions...', 'info');
      loadingSpinner.classList.remove('hidden');
      
      try {
          const response = await chrome.runtime.sendMessage({
              action: 'getFixVersions',
              data: { jiraProjectKey }
          });
          
          if (signal.aborted) {
              return;
          }

          if (response && response.success) {
              displayStatus('✓ Fix versions retrieved successfully!', 'success');
              displayVersions(response.data);
          } else {
              displayStatus(`✗ Failed to get fix versions: ${response?.message || 'Unknown error'}`, 'error');
              versionsDatalist.innerHTML = '';
          }
      } catch (error) {
          if (error.name !== 'AbortError') {
              displayStatus('✗ Error getting fix versions - check console', 'error');
              console.error('Get versions error:', error);
              versionsDatalist.innerHTML = '';
          }
      } finally {
          if (!signal.aborted) {
              loadingSpinner.classList.add('hidden');
          }
      }
  }

  function displayStatus(message, type) {
      statusMessageDiv.textContent = message;
      statusMessageDiv.className = `status-message visible ${type === 'error' ? 'status-error' : type === 'success' ? 'status-success' : 'status-info'}`;
  }

  function displaySummary(summary) {
      summaryResultsDiv.classList.remove('hidden');

      // Clear previous results
      jiraTicketsDiv.innerHTML = '';
      gitlabHistoryDiv.innerHTML = '';

      // Populate Jira tickets
      summary.allJiraIssues.forEach(issue => {
          const issueEl = document.createElement('div');
          issueEl.className = 'discrepancy-item';
          let issueHtml = `<strong><a href="https://your-jira-instance.com/browse/${issue.key}" target="_blank">${issue.key}</a></strong>: ${issue.summary} <br> <small>Status: ${issue.status}</small>`;
          issueEl.innerHTML = issueHtml;
          jiraTicketsDiv.appendChild(issueEl);
      });

      // Populate GitLab history
      summary.allGitLabCommits.forEach(commit => {
          const commitEl = document.createElement('div');
          commitEl.className = 'discrepancy-item';
          let commitHtml = `<strong><a href="https://your-gitlab-instance.com/${summary.gitlabProjectPath}/-/commit/${commit.id}" target="_blank">${commit.short_id}</a></strong>: ${commit.title}`;
          if (commit.jira_keys.length > 0) {
              commitHtml += `<br><small>Related Jira: ${commit.jira_keys.join(', ')}</small>`;
          }
          commitEl.innerHTML = commitHtml;
          gitlabHistoryDiv.appendChild(commitEl);
      });
  }

  function displayVersions(versions) {
      versionsDatalist.innerHTML = '';
      
      if (versions.length === 0) {
          return;
      }
      
      versions.forEach(version => {
          const option = document.createElement('option');
          option.value = version.name;
          option.dataset.id = version.id;
          versionsDatalist.appendChild(option);
      });
  }

  function clearList(ulElement) {
      ulElement.innerHTML = '';
  }

  function appendListItem(ulElement, text, link = null) {
      const li = document.createElement('li');
      if (link) {
          const a = document.createElement('a');
          a.href = link;
          a.target = "_blank";
          a.classList.add('jira-link');
          a.innerHTML = text;
          li.appendChild(a);
      } else {
          li.innerHTML = text;
      }
      ulElement.appendChild(li);
  }

  // Save form values to chrome storage
  function saveFormValues() {
      const selectedVersion = Array.from(versionsDatalist.options).find(option => option.value === jiraFixVersionInput.value);
      const versionId = selectedVersion ? selectedVersion.dataset.id : jiraFixVersionInput.value;

      const formData = {
          jiraProjectKey: jiraProjectKeyInput.value.trim(),
          jiraFixVersion: versionId,
          gitlabProjectId: gitlabProjectIdInput.value.trim(),
          gitlabCurrentTag: gitlabCurrentTagInput.value.trim(),
          gitlabPreviousTag: gitlabPreviousTagInput.value.trim()
      };
      
      chrome.storage.local.set({ formData }, () => {
          console.log('Form values saved to storage');
      });
  }

  // Load form values from chrome storage
  function loadFormValues() {
      chrome.storage.local.get(['formData'], (result) => {
          if (result.formData) {
              const data = result.formData;
              if (data.jiraProjectKey) jiraProjectKeyInput.value = data.jiraProjectKey;
              if (data.jiraFixVersion) jiraFixVersionInput.value = data.jiraFixVersion;
              if (data.gitlabProjectId) gitlabProjectIdInput.value = data.gitlabProjectId;
              if (data.gitlabCurrentTag) gitlabCurrentTagInput.value = data.gitlabCurrentTag;
              if (data.gitlabPreviousTag) gitlabPreviousTagInput.value = data.gitlabPreviousTag;
              console.log('Form values loaded from storage');
          }
      });
  }
});
