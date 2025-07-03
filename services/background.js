// This is the background service worker script for the browser extension.
// It handles API calls to Jira and GitLab, processes data, and communicates with the popup UI.

console.log('Background script loaded successfully');

// Handle action click to open side panel (simpler approach)
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Simply open the side panel - Chrome will handle the rest
        await chrome.sidePanel.open({ tabId: tab.id });
        console.log('Side panel opened for tab:', tab.id);
    } catch (error) {
        console.error('Error opening side panel:', error.message);
        // If tab-specific opening fails, try window-level opening
        try {
            await chrome.sidePanel.open({ windowId: tab.windowId });
            console.log('Side panel opened for window:', tab.windowId);
        } catch (windowError) {
            console.error('Window-level side panel open also failed:', windowError.message);
        }
    }
});

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
        // For Jira PAT, we need to check if it's already base64 encoded or if we need to encode it
        // Most Jira Server/Data Center instances expect email:token or username:token format
        console.log('Using Basic authentication for Jira');
        if (token.includes(':')) {
            // Token already includes username/email, just encode it
            headers['Authorization'] = `Basic ${btoa(token)}`;
        } else {
            // Token is just the PAT, append colon for password-only format
            headers['Authorization'] = `Basic ${btoa(token + ':')}`;
        }
    } else { // Default to Bearer for GitLab
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Making API request to:', url);
    console.log('Auth type:', tokenType);

    try {
        const response = await fetch(url, { headers });
        console.log('API response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText.substring(0, 500) + '...');
            throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
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

    // Try API v2 first (more widely supported), then v3
    const apiVersions = ['2', '3'];
    let lastError = null;

    for (const version of apiVersions) {
        try {
            console.log(`Trying Jira API version ${version}...`);

            while (true) {
                // Ensure no double slashes in URL construction
                const baseUrl = jiraBaseUrl.endsWith('/') ? jiraBaseUrl.slice(0, -1) : jiraBaseUrl;
                const url = `${baseUrl}/rest/api/${version}/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`;
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

            // If we got here without throwing, the API version worked
            console.log(`Successfully used Jira API version ${version}, found ${allIssues.length} issues`);
            return allIssues;

        } catch (error) {
            console.log(`Jira API version ${version} failed:`, error.message);
            lastError = error;
            // Reset for next attempt
            allIssues = [];
            startAt = 0;

            // If this is a 400 error about fixVersion not existing, provide better error message
            if (error.message.includes('does not exist for the field \'fixVersion\'')) {
                throw new Error(`Fix version "${fixVersion}" does not exist in project "${projectKey}". Please check the exact name in your Jira project settings.`);
            }
        }
    }

    // If we get here, both API versions failed
    throw new Error(`All Jira API versions failed. Last error: ${lastError.message}`);
}

/**
 * Gets a GitLab project by ID.
 * @param {string} gitlabBaseUrl Base URL of the GitLab instance.
 * @param {string} gitlabPat GitLab Personal Access Token.
 * @param {string} projectId GitLab project ID.
 * @returns {Promise<object>} GitLab project object.
 */
async function getGitLabProject(gitlabBaseUrl, gitlabPat, projectId) {
    // Ensure no double slashes in URL construction
    const baseUrl = gitlabBaseUrl.endsWith('/') ? gitlabBaseUrl.slice(0, -1) : gitlabBaseUrl;
    const url = `${baseUrl}/api/v4/projects/${projectId}`;
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
    // Ensure no double slashes in URL construction
    const baseUrl = gitlabBaseUrl.endsWith('/') ? gitlabBaseUrl.slice(0, -1) : gitlabBaseUrl;
    const url = `${baseUrl}/api/v4/projects/${projectId}/repository/tags?per_page=100`; // Fetch all tags up to 100
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
    const baseUrl = gitlabBaseUrl.endsWith('/') ? gitlabBaseUrl.slice(0, -1) : gitlabBaseUrl;
    const url = `${baseUrl}/api/v4/projects/${projectId}/repository/commits?per_page=${perPage}&since=${previousTagDate}&until=${currentTagDate}`;

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
console.log('Setting up message listener...');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);

    if (request.action === 'generateReleaseSummary') {
        console.log('Processing generateReleaseSummary request...');
        const { jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag } = request.data;

        // Handle async operation properly
        (async () => {
            try {
                // 1. Get API configuration from storage
                console.log('Getting API configuration from storage...');
                const config = await chrome.storage.local.get(['jiraBaseUrl', 'jiraPat', 'gitlabBaseUrl', 'gitlabPat']);
                const { jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat } = config;

                if (!jiraBaseUrl || !jiraPat || !gitlabBaseUrl || !gitlabPat) {
                    console.error('Missing API configuration:', { jiraBaseUrl: !!jiraBaseUrl, jiraPat: !!jiraPat, gitlabBaseUrl: !!gitlabBaseUrl, gitlabPat: !!gitlabPat });
                    sendResponse({ success: false, message: 'API configuration missing. Please go to options page to set up.', error: 'Missing API config' });
                    return;
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

                console.log('Sending successful response with summary...');
                sendResponse({ success: true, summary: summary });

            } catch (error) {
                console.error("Error in background script:", error);
                sendResponse({ success: false, message: error.message || 'Unknown error occurred.', error: error.toString() });
            }
        })();

        return true; // Indicate that the response will be sent asynchronously
    }

    // Test action for debugging
    if (request.action === 'test') {
        console.log('Test action received successfully');
        sendResponse({ success: true, message: 'Background script is working!' });
        return true;
    }

    // Test Jira connection specifically
    if (request.action === 'testJira') {
        console.log('Testing Jira connection...');
        (async () => {
            try {
                const config = await chrome.storage.local.get(['jiraBaseUrl', 'jiraPat']);
                const { jiraBaseUrl, jiraPat } = config;

                if (!jiraBaseUrl || !jiraPat) {
                    sendResponse({ success: false, message: 'Jira configuration missing. Please set up your Jira URL and PAT in the options page.' });
                    return;
                }

                // Test with a simple API call to get server info
                const baseUrl = jiraBaseUrl.endsWith('/') ? jiraBaseUrl.slice(0, -1) : jiraBaseUrl;

                // Try different endpoints for different Jira versions (v2 first as it's more widely supported)
                const testEndpoints = [
                    `${baseUrl}/rest/api/2/serverInfo`,
                    `${baseUrl}/rest/api/2/myself`,
                    `${baseUrl}/rest/api/3/serverInfo`,
                    `${baseUrl}/rest/api/3/myself`
                ];

                let lastError = null;
                for (const endpoint of testEndpoints) {
                    try {
                        console.log('Testing endpoint:', endpoint);
                        const result = await apiFetch(endpoint, jiraPat, 'Basic');
                        sendResponse({
                            success: true,
                            message: `✓ Jira connection successful! Using endpoint: ${endpoint}`,
                            data: result
                        });
                        return;
                    } catch (error) {
                        console.log(`Endpoint ${endpoint} failed:`, error.message);
                        lastError = error;

                        // Provide specific guidance for common errors
                        if (error.message.includes('401')) {
                            sendResponse({
                                success: false,
                                message: 'Authentication failed. Please check your Jira PAT and ensure it has the correct permissions.'
                            });
                            return;
                        } else if (error.message.includes('403')) {
                            sendResponse({
                                success: false,
                                message: 'Access forbidden. Your PAT may not have sufficient permissions to access Jira.'
                            });
                            return;
                        } else if (error.message.includes('404')) {
                            // Continue trying other endpoints for 404s
                            continue;
                        }
                    }
                }

                sendResponse({
                    success: false,
                    message: `All Jira test endpoints failed. This might be a Jira Server/Data Center instance with different API paths. Last error: ${lastError?.message || 'Unknown error'}`
                });

            } catch (error) {
                console.error('Error testing Jira connection:', error);
                sendResponse({
                    success: false,
                    message: `Jira connection test failed: ${error.message}`
                });
            }
        })();
        return true;
    }

    // Get available fix versions for a project
    if (request.action === 'getFixVersions') {
        console.log('Getting fix versions for project...');
        const { jiraProjectKey } = request.data;

        (async () => {
            try {
                const config = await chrome.storage.local.get(['jiraBaseUrl', 'jiraPat']);
                const { jiraBaseUrl, jiraPat } = config;

                if (!jiraBaseUrl || !jiraPat || !jiraProjectKey) {
                    sendResponse({
                        success: false,
                        message: 'Missing configuration. Please ensure Jira URL, PAT, and project key are provided.'
                    });
                    return;
                }

                const versions = await getJiraFixVersions(jiraBaseUrl, jiraPat, jiraProjectKey);
                sendResponse({
                    success: true,
                    message: `Found ${versions.length} fix versions for project ${jiraProjectKey}`,
                    data: versions
                });

            } catch (error) {
                console.error('Error getting fix versions:', error);
                sendResponse({
                    success: false,
                    message: `Failed to get fix versions: ${error.message}`
                });
            }
        })();
        return true;
    }

    // Handle unknown actions
    console.log('Unknown action received:', request.action);
    sendResponse({ success: false, message: 'Unknown action', error: 'Unknown action' });
    return true;
});

// Basic initial setup on extension install/update
chrome.runtime.onInstalled.addListener(() => {
    // You can set default values here if needed, or prompt the user via the options page.
    // For now, we rely on the user explicitly setting them in the options.
    console.log('Jira-GitLab Release Overview extension installed/updated.');
});

/**
 * Gets available fix versions for a Jira project to help users find the correct version name.
 * @param {string} jiraBaseUrl Base URL of the Jira instance.
 * @param {string} jiraPat Jira Personal Access Token.
 * @param {string} projectKey Jira project key (e.g., 'DDSTM').
 * @returns {Promise<Array<object>>} An array of available fix versions.
 */
async function getJiraFixVersions(jiraBaseUrl, jiraPat, projectKey) {
    const baseUrl = jiraBaseUrl.endsWith('/') ? jiraBaseUrl.slice(0, -1) : jiraBaseUrl;

    // Try both API versions
    const apiVersions = ['2', '3'];
    for (const version of apiVersions) {
        try {
            const url = `${baseUrl}/rest/api/${version}/project/${projectKey}/versions`;
            console.log("Fetching fix versions from:", url);
            const versions = await apiFetch(url, jiraPat, 'Basic');
            return versions.filter(v => !v.archived); // Only return non-archived versions
        } catch (error) {
            console.log(`Failed to get versions with API v${version}:`, error.message);
            if (version === '3') {
                // If v3 fails, try v2, if v2 also fails, throw error
                continue;
            } else {
                throw error;
            }
        }
    }
}

console.log('Background script setup complete');
