document.addEventListener('DOMContentLoaded', () => {
  const generateSummaryBtn = document.getElementById('generateSummaryBtn');
  const loadingDiv = document.getElementById('loading');
  const statusMessageDiv = document.getElementById('statusMessage');
  const summaryResultsDiv = document.getElementById('summaryResults');

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

      loadingDiv.classList.remove('hidden');
      summaryResultsDiv.classList.add('hidden');
      displayStatus('Fetching and comparing data...', 'info');

      try {
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

          loadingDiv.classList.add('hidden');

          if (response.success) {
              displayStatus('Summary generated successfully!', 'success');
              displaySummary(response.summary);
          } else {
              displayStatus(`Error: ${response.message}`, 'error');
              console.error("Error generating summary:", response.error);
          }
      } catch (error) {
          loadingDiv.classList.add('hidden');
          displayStatus('An unexpected error occurred. Check console for details.', 'error');
          console.error("Popup script error:", error);
      }
  });

  function displayStatus(message, type) {
      statusMessageDiv.textContent = message;
      statusMessageDiv.className = `mt-4 text-center text-sm ${type === 'error' ? 'error-message' : type === 'success' ? 'success-message' : 'text-gray-400'}`;
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
});
