import { handleAsyncBackgroundMessage } from '../helpers/chromeMessageHandler.js';
import { loadApiConfigurationFromStorage } from '../helpers/chromeStorageManager.js';
import { makeAuthenticatedApiRequest, buildCleanApiUrl } from '../helpers/apiRequestManager.js';
import { extractJiraIssueKeysFromText } from '../helpers/jiraIssueKeyParser.js';

console.log('Background script loaded successfully');

chrome.action.onClicked.addListener(async (tab) => {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
      console.log('Side panel opened for tab:', tab.id);
  } catch (error) {
      console.error('Error opening side panel:', error.message);
      try {
          await chrome.sidePanel.open({ windowId: tab.windowId });
          console.log('Side panel opened for window:', tab.windowId);
      } catch (windowError) {
          console.error('Window-level side panel open also failed:', windowError.message);
      }
  }
});

chrome.runtime.onMessage.addListener(handleAsyncBackgroundMessage(async (request, sender) => {
    console.log('Background script received message:', request);

    switch (request.action) {
        case 'generateReleaseSummary':
            return await generateReleaseSummaryHandler(request.data);
        case 'getFixVersions':
            return await getFixVersionsHandler(request.data);
        case 'test':
            return { success: true, message: 'Background script is working!' };
        case 'testJira':
            return await testJiraConnectionHandler();
        case 'testGitLab':
            return await testGitLabConnectionHandler();
        default:
            return { success: false, message: 'Unknown action', error: 'Unknown action' };
    }
}));

async function generateReleaseSummaryHandler(data) {
    const { jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag } = data;

    const config = await loadApiConfigurationFromStorage();
    const { jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat } = config;

    if (!jiraBaseUrl || !jiraPat || !gitlabBaseUrl || !gitlabPat) {
        throw new Error('API configuration missing. Please go to options page to set up.');
    }

    const jiraIssues = await fetchJiraIssuesForProjectAndVersion(jiraBaseUrl, jiraPat, jiraProjectKey, jiraFixVersion);
    const plannedIssueKeys = new Set(jiraIssues.map(issue => issue.key));

    const gitlabCommits = await fetchGitLabCommitsBetweenTags(gitlabBaseUrl, gitlabPat, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag);
    const gitlabProject = await fetchGitLabProjectDetails(gitlabBaseUrl, gitlabPat, gitlabProjectId);

    const allGitLabCommits = gitlabCommits.map(commit => ({
        ...commit,
        jira_keys: extractJiraIssueKeysFromText(commit.title + ' ' + (commit.message || ''))
    }));

    const allJiraIssues = jiraIssues.map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name
    }));

    const summary = analyzeIssueAndCommitCorrelation(allJiraIssues, allGitLabCommits, plannedIssueKeys, gitlabProject.path_with_namespace);
    summary.allJiraIssues = allJiraIssues;
    summary.allGitLabCommits = allGitLabCommits;
    summary.gitlabProjectPath = gitlabProject.path_with_namespace;

    return { success: true, summary };
}

async function getFixVersionsHandler(data) {
    const { jiraProjectKey } = data;
    const config = await loadApiConfigurationFromStorage();
    const { jiraBaseUrl, jiraPat } = config;

    if (!jiraBaseUrl || !jiraPat || !jiraProjectKey) {
        throw new Error('Missing configuration. Please ensure Jira URL, PAT, and project key are provided.');
    }

    const versions = await fetchJiraFixVersionsForProject(jiraBaseUrl, jiraPat, jiraProjectKey);
    return {
        success: true,
        message: `Found ${versions.length} fix versions for project ${jiraProjectKey}`,
        data: versions
    };
}

async function testJiraConnectionHandler() {
    const config = await loadApiConfigurationFromStorage();
    const { jiraBaseUrl, jiraPat } = config;

    if (!jiraBaseUrl || !jiraPat) {
        throw new Error('Jira configuration missing. Please set up your Jira URL and PAT in the options page.');
    }

    const testEndpoints = [
        'rest/api/2/serverInfo',
        'rest/api/2/myself',
        'rest/api/3/serverInfo',
        'rest/api/3/myself'
    ];

    for (const endpoint of testEndpoints) {
        try {
            const url = buildCleanApiUrl(jiraBaseUrl, endpoint);
            const result = await makeAuthenticatedApiRequest(url, jiraPat, 'Basic');
            return {
                success: true,
                message: `✓ Jira connection successful! Using endpoint: ${endpoint}`,
                data: result
            };
    } catch (error) {
        if (error.message.includes('401')) {
            throw new Error('Authentication failed. Please check your Jira PAT and ensure it has the correct permissions.');
        } else if (error.message.includes('403')) {
            throw new Error('Access forbidden. Your PAT may not have sufficient permissions to access Jira.');
        } else if (error.message.includes('404')) {
            continue;
        }
    }
  }

    throw new Error('All Jira test endpoints failed. This might be a Jira Server/Data Center instance with different API paths.');
}

async function testGitLabConnectionHandler() {
    throw new Error('GitLab test not implemented yet');
}

async function fetchJiraIssuesForProjectAndVersion(jiraBaseUrl, jiraPat, projectKey, fixVersion) {
    let allIssues = [];
    let startAt = 0;
    const maxResults = 50;

    const jql = encodeURIComponent(`project = "${projectKey}" AND fixVersion = "${fixVersion}"`);
    const fields = encodeURIComponent('key,summary,status,resolution,fixVersions,updated');

    const apiVersions = ['2', '3'];
    let lastError = null;

    for (const version of apiVersions) {
        try {
        while (true) {
          const endpoint = `rest/api/${version}/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`;
          const url = buildCleanApiUrl(jiraBaseUrl, endpoint);

          const data = await makeAuthenticatedApiRequest(url, jiraPat, 'Basic');

          if (!data.issues || data.issues.length === 0) break;

          allIssues = allIssues.concat(data.issues);
          startAt += data.issues.length;

          if (startAt >= data.total) break;
      }

        console.log(`Successfully used Jira API version ${version}, found ${allIssues.length} issues`);
        return allIssues;

    } catch (error) {
        console.log(`Jira API version ${version} failed:`, error.message);
        lastError = error;
        allIssues = [];
        startAt = 0;

          if (error.message.includes('does not exist for the field \'fixVersion\'')) {
              throw new Error(`Fix version "${fixVersion}" does not exist in project "${projectKey}". Please check the exact name in your Jira project settings.`);
          }
      }
  }

    throw new Error(`All Jira API versions failed. Last error: ${lastError.message}`);
}

async function fetchGitLabProjectDetails(gitlabBaseUrl, gitlabPat, projectId) {
    const url = buildCleanApiUrl(gitlabBaseUrl, `api/v4/projects/${projectId}`);
    return await makeAuthenticatedApiRequest(url, gitlabPat, 'Bearer');
}

async function fetchGitLabTagsForProject(gitlabBaseUrl, gitlabPat, projectId) {
    const url = buildCleanApiUrl(gitlabBaseUrl, `api/v4/projects/${projectId}/repository/tags?per_page=100`);
    return await makeAuthenticatedApiRequest(url, gitlabPat, 'Bearer');
}

async function fetchGitLabCommitsBetweenTags(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag) {
    let allCommits = [];
    let page = 1;
    const perPage = 100;

    const tags = await fetchGitLabTagsForProject(gitlabBaseUrl, gitlabPat, projectId);
    const currentTagObj = tags.find(tag => tag.name === currentTag);
    const previousTagObj = tags.find(tag => tag.name === previousTag);

    if (!currentTagObj || !previousTagObj) {
        throw new Error(`Could not find GitLab tags: ${currentTag} or ${previousTag}. Ensure they exist and are correctly named.`);
    }

    const currentTagDate = currentTagObj.commit.committed_date;
    const previousTagDate = previousTagObj.commit.committed_date;

    while (true) {
      const endpoint = `api/v4/projects/${projectId}/repository/commits?per_page=${perPage}&since=${previousTagDate}&until=${currentTagDate}&page=${page}`;
      const url = buildCleanApiUrl(gitlabBaseUrl, endpoint);

      const commits = await makeAuthenticatedApiRequest(url, gitlabPat, 'Bearer');
      if (commits.length === 0) break;

      allCommits = allCommits.concat(commits);
      page++;
  }

    return allCommits;
}

async function fetchJiraFixVersionsForProject(jiraBaseUrl, jiraPat, projectKey) {
    const apiVersions = ['2', '3'];

    for (const version of apiVersions) {
        try {
            const endpoint = `rest/api/${version}/project/${projectKey}/versions`;
            const url = buildCleanApiUrl(jiraBaseUrl, endpoint);
            const versions = await makeAuthenticatedApiRequest(url, jiraPat, 'Basic');
            return versions.filter(v => !v.archived);
        } catch (error) {
            if (version === '3') {
                throw error;
            }
        }
    }
}

function analyzeIssueAndCommitCorrelation(jiraIssues, gitlabCommits, plannedIssueKeys, gitlabProjectPath) {
    const issuesInCodeMap = new Map();
    const allIssueKeysInCode = new Set();

    for (const commit of gitlabCommits) {
      const commitJiraKeys = commit.jira_keys || [];

      commitJiraKeys.forEach(jiraKey => {
          allIssueKeysInCode.add(jiraKey);
          if (!issuesInCodeMap.has(jiraKey)) {
              issuesInCodeMap.set(jiraKey, { commits: [], merge_requests: [] });
          }
          issuesInCodeMap.get(jiraKey).commits.push({ id: commit.id, short_id: commit.short_id });
    });
  }

    const plannedNotInCode = [];
    const inCodeNotPlanned = [];
    const statusMismatches = [];
    const matchedIssues = [];

    for (const jiraIssue of jiraIssues) {
        if (allIssueKeysInCode.has(jiraIssue.key)) {
        matchedIssues.push({
            key: jiraIssue.key,
          summary: jiraIssue.summary,
          status: jiraIssue.status,
          commits: issuesInCodeMap.get(jiraIssue.key)?.commits || [],
          merge_requests: issuesInCodeMap.get(jiraIssue.key)?.merge_requests || []
      });

        const resolvedStatuses = ['Done', 'Resolved', 'Closed'];
        if (!resolvedStatuses.includes(jiraIssue.status)) {
            statusMismatches.push({
                key: jiraIssue.key,
            summary: jiraIssue.summary,
            status: jiraIssue.status
        });
        }
    } else {
        plannedNotInCode.push({
            key: jiraIssue.key,
          summary: jiraIssue.summary,
          status: jiraIssue.status
      });
      }
  }

    for (const jiraKey of allIssueKeysInCode) {
        if (!plannedIssueKeys.has(jiraKey)) {
            inCodeNotPlanned.push(jiraKey);
        }
    }

    return {
        totalPlannedIssues: jiraIssues.length,
        totalIssuesInCode: allIssueKeysInCode.size,
      plannedNotInCode,
      inCodeNotPlanned,
      statusMismatches,
      matchedIssues
  };
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('Jira-GitLab Release Overview extension installed/updated.');
});

console.log('Background script setup complete');
