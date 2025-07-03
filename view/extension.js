document.addEventListener('DOMContentLoaded', () => {
  const generateSummaryBtn = document.getElementById('generateSummaryBtn');
  const testBtn = document.getElementById('testBtn');
  const testJiraBtn = document.getElementById('testJiraBtn');
  const testGitLabBtn = document.getElementById('testGitLabBtn');
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
      statusMessageDiv.className = `mt-4 text-center ${type === 'error' ? 'error-message' : type === 'success' ? 'success-message' : type === 'info' ? 'info-message' : 'text-gray-400'}`;
  }

  function displaySummary(summary) {
      summaryResultsDiv.classList.remove('hidden');

      totalPlannedSpan.textContent = summary.totalPlannedIssues;
      totalInCodeSpan.textContent = summary.totalIssuesInCode;
      countPlannedNotInCodeSpan.textContent = summary.plannedNotInCode.length;
      countInCodeNotPlannedSpan.textContent = summary.inCodeNotPlanned.length;
      countStatusMismatchesSpan.textContent = summary.statusMismatches.length;

      clearList(plannedNotInCodeList);
      clearList(inCodeNotPlannedList);
      clearList(statusMismatchList);
      clearList(matchedIssuesList);

      if (summary.plannedNotInCode.length > 0) {
          plannedNotInCodeSection.classList.remove('hidden');
          summary.plannedNotInCode.forEach(issue => {
              appendListItem(plannedNotInCodeList, `Jira: ${issue.key} - ${issue.summary} (Status: ${issue.status})`, `https://your-jira-instance.com/browse/${issue.key}`);
          });
      } else {
          plannedNotInCodeSection.classList.add('hidden');
      }

      if (summary.inCodeNotPlanned.length > 0) {
          inCodeNotPlannedSection.classList.remove('hidden');
          summary.inCodeNotPlanned.forEach(issueKey => {
              appendListItem(inCodeNotPlannedList, `Jira: ${issueKey} (linked in GitLab, but not planned)`);
          });
      } else {
          inCodeNotPlannedSection.classList.add('hidden');
      }

      if (summary.statusMismatches.length > 0) {
          statusMismatchSection.classList.remove('hidden');
          summary.statusMismatches.forEach(issue => {
              appendListItem(statusMismatchList, `Jira: ${issue.key} - ${issue.summary} (Current Status: ${issue.status})`, `https://your-jira-instance.com/browse/${issue.key}`);
          });
      } else {
          statusMismatchSection.classList.add('hidden');
      }

      summary.matchedIssues.forEach(issue => {
          let itemText = `Jira: ${issue.key} - ${issue.summary} (Status: ${issue.status})`;
          let jiraLink = `https://your-jira-instance.com/browse/${issue.key}`;
          let gitlabCommits = issue.commits.map(commit => `<a href="https://your-gitlab-instance.com/${summary.gitlabProjectPath}/-/commit/${commit.id}" target="_blank" class="gitlab-link">${commit.short_id}</a>`).join(', ');
          let gitlabMRs = issue.merge_requests.map(mr => `<a href="https://your-gitlab-instance.com/${summary.gitlabProjectPath}/-/merge_requests/${mr.iid}" target="_blank" class="gitlab-link">!${mr.iid}</a>`).join(', ');

          if (gitlabCommits || gitlabMRs) {
              itemText += `<br><small>GitLab: ${gitlabCommits} ${gitlabMRs ? 'MRs: ' + gitlabMRs : ''}</small>`;
          }
          appendListItem(matchedIssuesList, itemText, jiraLink);
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
