// This is the background service worker script for the browser extension.
// It handles API calls to Jira and GitLab, processes data, and communicates with the popup UI.

// Regular expression to extract Jira issue keys (e.g., DDSTM-12345)
// This should match the format your organization uses.
const JIRA_ISSUE_KEY_REGEX = /([A-Z]{2,}-\d+)/g;

/**
 * Sends a request to an API endpoint.
 * @param {string} url The full URL for the API request.
 * @param {string} token The Personal Access Token (PAT) for authentication.
 * @param {string} tokenType 'Basic' for Jira PAT, 'Bearer' for GitLab PAT.
 * @returns {Promise<object>} The JSON response from the API.
 */
async function apiFetch(url, token, tokenType = 'Bearer') {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (tokenType === 'Basic') {
        // For Jira PAT, the PAT itself is the password for Basic Auth
        headers['Authorization'] = `Basic ${btoa(token + ':')}`; // Jira PAT uses "email:token" or "username:token"
    } else { // Default to Bearer for GitLab
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching from ${url}:`, error);
        throw error;
    }
}

/**
 * Fetches all Jira issues for a given project and fix version.
 * @param {string} jiraBaseUrl Base URL of the Jira instance.
 * @param {string} jiraPat Jira Personal Access Token.
 * @param {string} projectKey Jira project key (e.g., 'DDSTM').
 * @param {string} fixVersion Jira fix version name (e.g., 'Release v1.0.0').
 * @returns {Promise<Array<object>>} An array of Jira issue objects.
 */
async function getJiraIssues(jiraBaseUrl, jiraPat, projectKey, fixVersion) {
    let allIssues = [];
    let startAt = 0;
    const maxResults = 50; // Jira default max results per page

    // JQL query to get issues for a specific fixVersion
    const jql = encodeURIComponent(`project = "${projectKey}" AND fixVersion = "${fixVersion}"`);
    // Fields to retrieve for each issue
    const fields = encodeURIComponent('key,summary,status,resolution,fixVersions,updated');

    while (true) {
        const url = `${jiraBaseUrl}/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`;
        console.log("Fetching Jira issues from:", url);
        const data = await apiFetch(url, jiraPat, 'Basic');

        if (!data.issues || data.issues.length === 0) {
            break;
        }
        allIssues = allIssues.concat(data.issues);
        startAt += data.issues.length;

        if (startAt >= data.total) {
            break; // All issues fetched
        }
    }
    return allIssues;
}

/**
 * Gets a GitLab project by ID.
 * @param {string} gitlabBaseUrl Base URL of the GitLab instance.
 * @param {string} gitlabPat GitLab Personal Access Token.
 * @param {string} projectId GitLab project ID.
 * @returns {Promise<object>} GitLab project object.
 */
async function getGitLabProject(gitlabBaseUrl, gitlabPat, projectId) {
    const url = `${gitlabBaseUrl}/api/v4/projects/${projectId}`;
    console.log("Fetching GitLab project from:", url);
    return await apiFetch(url, gitlabPat, 'Bearer');
}

/**
 * Gets GitLab tags for a project.
 * @param {string} gitlabBaseUrl Base URL of the GitLab instance.
 * @param {string} gitlabPat GitLab Personal Access Token.
 * @param {string} projectId GitLab project ID.
 * @returns {Promise<Array<object>>} An array of GitLab tag objects.
 */
async function getGitLabTags(gitlabBaseUrl, gitlabPat, projectId) {
    const url = `${gitlabBaseUrl}/api/v4/projects/${projectId}/repository/tags?per_page=100`; // Fetch all tags up to 100
    console.log("Fetching GitLab tags from:", url);
    return await apiFetch(url, gitlabPat, 'Bearer');
}


/**
 * Fetches commits within a specific tag range from GitLab.
 * @param {string} gitlabBaseUrl Base URL of the GitLab instance.
 * @param {string} gitlabPat GitLab Personal Access Token.
 * @param {string} projectId GitLab project ID.
 * @param {string} currentTag The current release tag.
 * @param {string} previousTag The previous release tag.
 * @returns {Promise<Array<object>>} An array of GitLab commit objects.
 */
async function getGitLabCommits(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag) {
    let allCommits = [];
    let page = 1;
    const perPage = 100; // Max results per page

    // Get commit SHAs for the tags to define the range
    const tags = await getGitLabTags(gitlabBaseUrl, gitlabPat, projectId);
    const currentTagObj = tags.find(tag => tag.name === currentTag);
    const previousTagObj = tags.find(tag => tag.name === previousTag);

    if (!currentTagObj || !previousTagObj) {
        throw new Error(`Could not find GitLab tags: ${currentTag} or ${previousTag}. Ensure they exist and are correctly named.`);
    }

    const currentTagDate = currentTagObj.commit.committed_date;
    const previousTagDate = previousTagObj.commit.committed_date;

    // Use `since` and `until` for date range to simplify fetching between tags
    // This is generally more robust than `ref_name` with SHA ranges for the purpose of getting all commits between two points chronologically.
    const url = `${gitlabBaseUrl}/api/v4/projects/${projectId}/repository/commits?per_page=${perPage}&since=${previousTagDate}&until=${currentTagDate}`;

    // GitLab commit API does not return total headers, so we fetch iteratively until no more results.
    while (true) {
        const paginatedUrl = `${url}&page=${page}`;
        console.log("Fetching GitLab commits from:", paginatedUrl);
        const commits = await apiFetch(paginatedUrl, gitlabPat, 'Bearer');
        if (commits.length === 0) {
            break;
        }
        allCommits = allCommits.concat(commits);
        page++;
    }
    return allCommits;
}


/**
 * Parses Jira issue keys from a given text (commit message or MR title/description).
 * @param {string} text The text to parse.
 * @returns {Array<string>} An array of unique Jira issue keys found.
 */
function parseJiraIssueKeys(text) {
    const matches = text.match(JIRA_ISSUE_KEY_REGEX);
    return matches ? [...new Set(matches.map(key => key.toUpperCase()))] : []; // Ensure uppercase and unique
}

// Listener for messages from the popup script
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'generateReleaseSummary') {
        const { jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag } = request.data;

        try {
            // 1. Get API configuration from storage
            const config = await chrome.storage.local.get(['jiraBaseUrl', 'jiraPat', 'gitlabBaseUrl', 'gitlabPat']);
            const { jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat } = config;

            if (!jiraBaseUrl || !jiraPat || !gitlabBaseUrl || !gitlabPat) {
                sendResponse({ success: false, message: 'API configuration missing. Please go to options page to set up.', error: 'Missing API config' });
                return true; // Indicate that the response will be sent asynchronously
            }

            // 2. Fetch Jira Issues (Planned Set)
            const jiraIssues = await getJiraIssues(jiraBaseUrl, jiraPat, jiraProjectKey, jiraFixVersion);
            const plannedIssueKeys = new Set(jiraIssues.map(issue => issue.key));
            console.log("Planned Jira Issues:", jiraIssues.length);

            // 3. Fetch GitLab Commits
            const gitlabCommits = await getGitLabCommits(gitlabBaseUrl, gitlabPat, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag);
            console.log("GitLab Commits in range:", gitlabCommits.length);

            // 4. Identify GitLab Project Path for linking
            const gitlabProject = await getGitLabProject(gitlabBaseUrl, gitlabPat, gitlabProjectId);
            const gitlabProjectPath = gitlabProject.path_with_namespace;

            // 5. Correlate Data and Identify Discrepancies
            const issuesInCodeMap = new Map(); // Map to store Jira keys found in code, with associated commits/MRs
            const allIssueKeysInCode = new Set(); // Unique set of all Jira keys found in GitLab artifacts

            for (const commit of gitlabCommits) {
                const associatedMrIids = commit.web_url.match(/\/merge_requests\/(\d+)/g) ? commit.web_url.match(/\/merge_requests\/(\d+)/g).map(m => parseInt(m.split('/').pop())) : []; // This is a simplification; ideally, fetch MR details
                const commitJiraKeys = parseJiraIssueKeys(commit.title + ' ' + (commit.message || ''));
                
                commitJiraKeys.forEach(jiraKey => {
                    allIssueKeysInCode.add(jiraKey);
                    if (!issuesInCodeMap.has(jiraKey)) {
                        issuesInCodeMap.set(jiraKey, { commits: [], merge_requests: [] });
                    }
                    issuesInCodeMap.get(jiraKey).commits.push({ id: commit.id, short_id: commit.short_id });
                    // Simplified: Assuming MRs link to commit. In a real app, you'd fetch MRs directly
                    if (associatedMrIids.length > 0) {
                        associatedMrIids.forEach(mrIid => {
                            if (!issuesInCodeMap.get(jiraKey).merge_requests.some(mr => mr.iid === mrIid)) {
                                issuesInCodeMap.get(jiraKey).merge_requests.push({ iid: mrIid });
                            }
                        });
                    }
                });
            }

            const plannedNotInCode = [];
            const inCodeNotPlanned = [];
            const statusMismatches = [];
            const matchedIssues = [];

            // Identify Planned but Not in Code and Matched Issues
            for (const jiraIssue of jiraIssues) {
                if (allIssueKeysInCode.has(jiraIssue.key)) {
                    // Issue is planned and found in code
                    matchedIssues.push({
                        key: jiraIssue.key,
                        summary: jiraIssue.fields.summary,
                        status: jiraIssue.fields.status.name,
                        resolution: jiraIssue.fields.resolution ? jiraIssue.fields.resolution.name : 'Unresolved',
                        commits: issuesInCodeMap.get(jiraIssue.key)?.commits || [],
                        merge_requests: issuesInCodeMap.get(jiraIssue.key)?.merge_requests || []
                    });
                    // Check for status mismatches for matched issues
                    const resolvedStatuses = ['Done', 'Resolved', 'Closed']; // Customize based on your Jira workflow
                    if (!resolvedStatuses.includes(jiraIssue.fields.status.name)) {
                        statusMismatches.push({
                            key: jiraIssue.key,
                            summary: jiraIssue.fields.summary,
                            status: jiraIssue.fields.status.name
                        });
                    }
                } else {
                    // Issue is planned but NOT found in code
                    plannedNotInCode.push({
                        key: jiraIssue.key,
                        summary: jiraIssue.fields.summary,
                        status: jiraIssue.fields.status.name
                    });
                }
            }

            // Identify In Code but Not Planned
            for (const jiraKey of allIssueKeysInCode) {
                if (!plannedIssueKeys.has(jiraKey)) {
                    inCodeNotPlanned.push(jiraKey);
                }
            }

            const summary = {
                totalPlannedIssues: jiraIssues.length,
                totalIssuesInCode: allIssueKeysInCode.size,
                plannedNotInCode: plannedNotInCode,
                inCodeNotPlanned: inCodeNotPlanned,
                statusMismatches: statusMismatches,
                matchedIssues: matchedIssues,
                gitlabProjectPath: gitlabProjectPath // Pass project path for link construction in popup
            };

            sendResponse({ success: true, summary: summary });

        } catch (error) {
            console.error("Error in background script:", error);
            sendResponse({ success: false, message: error.message || 'Unknown error occurred.', error: error.toString() });
        }
        return true; // Indicate that the response will be sent asynchronously
    }
});

// Basic initial setup on extension install/update
chrome.runtime.onInstalled.addListener(() => {
    // You can set default values here if needed, or prompt the user via the options page.
    // For now, we rely on the user explicitly setting them in the options.
    console.log('Jira-GitLab Release Overview extension installed/updated.');
});
