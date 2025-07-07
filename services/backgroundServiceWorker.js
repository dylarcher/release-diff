import { handleAsyncBackgroundMessage } from './chromeMessageHandler.js';
import {
    generateContextKey,
    loadUserModifications
} from './chromeStorageManager.js';
import { makeAuthenticatedApiRequest, buildCleanApiUrl } from './apiRequestManager.js';
import { extractJiraIssueKeysFromText } from '../helpers/jiraIssueKeyParser.js';
import {
    ACTIONS,
    CONSOLE_MESSAGES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    JIRA_ENDPOINTS,
    GITLAB_ENDPOINTS,
    API_VERSIONS,
    AUTH_TYPES,
    HTTP_STATUS,
    PAGINATION,
    JIRA_FIELDS,
    JIRA_RESOLVED_STATUSES,
    JQL_TEMPLATES
} from '../shared/presetConstants.js';

console.log(CONSOLE_MESSAGES.BACKGROUND_SCRIPT_LOADED);

class BackgroundService {
    constructor() {
        this.setupEventListeners();
        this.setupMessageHandlers();
    }

    setupEventListeners() {
        chrome.action.onClicked.addListener(this.handleActionClick.bind(this));
        chrome.runtime.onMessage.addListener(this.handleMessages());
        chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
    }

    setupMessageHandlers() {
        this.messageHandlers = new Map([
            [ACTIONS.GENERATE_RELEASE_SUMMARY, this.generateReleaseSummaryHandler.bind(this)],
            [ACTIONS.GET_FIX_VERSIONS, this.getFixVersionsHandler.bind(this)],
            [ACTIONS.TEST, this.testHandler.bind(this)],
            [ACTIONS.TEST_JIRA, this.testJiraConnectionHandler.bind(this)],
            [ACTIONS.TEST_GITLAB, this.testGitLabConnectionHandler.bind(this)]
        ]);
    }

    async handleActionClick(tab) {
        const sidePanelStrategies = {
            tabLevel: () => chrome.sidePanel.open({ tabId: tab.id }),
            windowLevel: () => chrome.sidePanel.open({ windowId: tab.windowId })
        };

        try {
            await sidePanelStrategies.tabLevel();
            console.log(CONSOLE_MESSAGES.SIDE_PANEL_OPENED_TAB, tab.id);
        } catch (error) {
            console.error(ERROR_MESSAGES.OPENING_SIDE_PANEL, error.message);
            try {
                await sidePanelStrategies.windowLevel();
                console.log(CONSOLE_MESSAGES.SIDE_PANEL_OPENED_WINDOW, tab.windowId);
            } catch (windowError) {
                console.error(ERROR_MESSAGES.WINDOW_LEVEL_SIDE_PANEL_FAILED, windowError.message);
            }
        }
    }

    handleMessages() {
        return handleAsyncBackgroundMessage(async (request, sender) => {
            console.log(CONSOLE_MESSAGES.BACKGROUND_RECEIVED_MESSAGE, request);

            const handler = this.messageHandlers.get(request.action);
            return handler
                ? await handler(request.data)
                : { success: false, message: ERROR_MESSAGES.UNKNOWN_ACTION, error: ERROR_MESSAGES.UNKNOWN_ACTION };
        });
    }

    handleInstalled() {
        console.log(CONSOLE_MESSAGES.EXTENSION_INSTALLED_UPDATED);
    }

    async testHandler() {
        return { success: true, message: SUCCESS_MESSAGES.BACKGROUND_SCRIPT_WORKING };
    }

    async generateReleaseSummaryHandler(data) {
        const { jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag } = data;

        const config = await loadApiConfigurationFromStorage();
        const { jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat } = config;

        if (!jiraBaseUrl || !jiraPat || !gitlabBaseUrl || !gitlabPat) {
            throw new Error(ERROR_MESSAGES.API_CONFIGURATION_MISSING);
        }

        const jiraIssues = await JiraService.fetchIssuesForProjectAndVersion(jiraBaseUrl, jiraPat, jiraProjectKey, jiraFixVersion);
        const plannedIssueKeys = new Set(jiraIssues.map(issue => issue.key));

        const rawJiraIssues = await JiraService.fetchIssuesForProjectAndVersion(jiraBaseUrl, jiraPat, jiraProjectKey, jiraFixVersion);
        const rawGitlabCommits = await GitLabService.fetchCommitsBetweenTags(gitlabBaseUrl, gitlabPat, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag);
        const gitlabProject = await GitLabService.fetchProjectDetails(gitlabBaseUrl, gitlabPat, gitlabProjectId);

        // Initialize Jira issues with new properties
        const allJiraIssues = rawJiraIssues.map(issue => ({
            id: issue.key, // Unique ID for Jira issues
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            associations: [], // To store associated commit IDs and match types
            needsAction: false, // Default needsAction state
            // description: issue.fields.description, // Consider fetching description if needed for matching
        }));

        // Initialize GitLab commits with new properties
        const allGitLabCommits = rawGitlabCommits.map(commit => ({
            id: commit.id, // Unique ID for commits
            short_id: commit.short_id,
            title: commit.title,
            message: commit.message || '',
            web_url: commit.web_url,
            author_name: commit.author_name,
            created_at: commit.created_at,
            explicitJiraKeys: extractJiraIssueKeysFromText(`${commit.title} ${commit.message || ''}`), // Store explicitly found keys
            associations: [], // To store associated Jira issue IDs and match types
            needsAction: false, // Default needsAction state
        }));

        const contextKey = generateContextKey(jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag);
        const userModifications = await loadUserModifications(contextKey);

        const analysisResults = AnalysisService.analyzeIssueAndCommitCorrelation(
            allJiraIssues,
            allGitLabCommits,
            userModifications,
            gitlabProject.path_with_namespace
        );

        return {
            success: true,
            summary: {
                allJiraIssues: analysisResults.jiraIssues,
                allGitLabCommits: analysisResults.gitlabCommits,
                gitlabProjectPath: gitlabProject.path_with_namespace,
                contextKey: contextKey, // Send contextKey to side panel for saving modifications
                loadedUserUnmatches: userModifications.userUnmatches, // Send loaded unmatches
                jiraBaseUrl: jiraBaseUrl, // Pass base URL for link construction
                gitlabBaseUrl: gitlabBaseUrl // Pass base URL for link construction
            }
        };
    }

    async getFixVersionsHandler(data) {
        const { jiraProjectKey } = data;
        const config = await loadApiConfigurationFromStorage();
        const { jiraBaseUrl, jiraPat } = config;

        if (!jiraBaseUrl || !jiraPat || !jiraProjectKey) {
            throw new Error(ERROR_MESSAGES.MISSING_CONFIGURATION);
        }

        const versions = await JiraService.fetchFixVersionsForProject(jiraBaseUrl, jiraPat, jiraProjectKey);
        return {
            success: true,
            message: SUCCESS_MESSAGES.FOUND_FIX_VERSIONS.replace('{count}', versions.length).replace('{project}', jiraProjectKey),
            data: versions
        };
    }

    async testJiraConnectionHandler() {
        const config = await loadApiConfigurationFromStorage();
        const { jiraBaseUrl, jiraPat } = config;

        if (!jiraBaseUrl || !jiraPat) {
            throw new Error(ERROR_MESSAGES.JIRA_CONFIGURATION_MISSING);
        }

        return await JiraService.testConnection(jiraBaseUrl, jiraPat);
    }

    async testGitLabConnectionHandler() {
        const config = await loadApiConfigurationFromStorage();
        const { gitlabBaseUrl, gitlabPat } = config;

        if (!gitlabBaseUrl || !gitlabPat) {
            throw new Error(ERROR_MESSAGES.GITLAB_CONFIGURATION_MISSING);
        }
        return await GitLabService.testConnection(gitlabBaseUrl, gitlabPat);
    }
}

class JiraService {
    static async fetchIssuesForProjectAndVersion(jiraBaseUrl, jiraPat, projectKey, fixVersion) {
        let allIssues = [];
        let startAt = 0;
        const maxResults = PAGINATION.MAX_RESULTS;

        const jql = encodeURIComponent(JQL_TEMPLATES.PROJECT_AND_FIX_VERSION.replace('{projectKey}', projectKey).replace('{fixVersion}', fixVersion));
        const fields = encodeURIComponent(JIRA_FIELDS);

        const apiVersions = API_VERSIONS.JIRA;
        let lastError = null;

        for (const version of apiVersions) {
            try {
                while (true) {
                    const endpoint = `${JIRA_ENDPOINTS.SEARCH.replace('{version}', version)}?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`;
                    const url = buildCleanApiUrl(jiraBaseUrl, endpoint);

                    const data = await makeAuthenticatedApiRequest(url, jiraPat, AUTH_TYPES.BASIC);

                    if (!data.issues || data.issues.length === 0) break;

                    allIssues = allIssues.concat(data.issues);
                    startAt += data.issues.length;

                    if (startAt >= data.total) break;
                }

                console.log(`${CONSOLE_MESSAGES.SUCCESSFULLY_USED_JIRA_API} ${version}, found ${allIssues.length} issues`);
                return allIssues;

            } catch (error) {
                console.log(`${CONSOLE_MESSAGES.JIRA_API_FAILED} ${version} failed:`, error.message);
                lastError = error;
                allIssues = [];
                startAt = 0;

                if (error.message.includes(ERROR_MESSAGES.FIX_VERSION_NOT_EXISTS)) {
                    throw new Error(ERROR_MESSAGES.FIX_VERSION_CHECK_NAME.replace('{version}', fixVersion).replace('{project}', projectKey));
                }
            }
        }

        throw new Error(`${ERROR_MESSAGES.ALL_JIRA_API_VERSIONS_FAILED} ${lastError.message}`);
    }

    static async fetchFixVersionsForProject(jiraBaseUrl, jiraPat, projectKey) {
        const apiVersions = API_VERSIONS.JIRA;

        for (const version of apiVersions) {
            try {
                const endpoint = JIRA_ENDPOINTS.PROJECT_VERSIONS.replace('{version}', version).replace('{projectKey}', projectKey);
                const url = buildCleanApiUrl(jiraBaseUrl, endpoint);
                const versions = await makeAuthenticatedApiRequest(url, jiraPat, AUTH_TYPES.BASIC);
                return versions.filter(v => !v.archived);
            } catch (error) {
                if (version === '3') {
                    throw error;
                }
            }
        }
    }

    static async testConnection(jiraBaseUrl, jiraPat) {
        const testEndpoints = [
            JIRA_ENDPOINTS.SERVER_INFO_V2,
            JIRA_ENDPOINTS.MYSELF_V2,
            JIRA_ENDPOINTS.SERVER_INFO_V3,
            JIRA_ENDPOINTS.MYSELF_V3
        ];

        for (const endpoint of testEndpoints) {
            try {
                const url = buildCleanApiUrl(jiraBaseUrl, endpoint);
                const result = await makeAuthenticatedApiRequest(url, jiraPat, AUTH_TYPES.BASIC);
                return {
                    success: true,
                    message: `${SUCCESS_MESSAGES.JIRA_CONNECTION_SUCCESSFUL} ${endpoint}`,
                    data: result
                };
            } catch (error) {
                if (error.message.includes(HTTP_STATUS.UNAUTHORIZED)) {
                    throw new Error(ERROR_MESSAGES.AUTHENTICATION_FAILED);
                } else if (error.message.includes(HTTP_STATUS.FORBIDDEN)) {
                    throw new Error(ERROR_MESSAGES.ACCESS_FORBIDDEN);
                } else if (error.message.includes(HTTP_STATUS.NOT_FOUND)) {
                    continue;
                }
            }
        }

        throw new Error(ERROR_MESSAGES.ALL_JIRA_ENDPOINTS_FAILED);
    }
}

class GitLabService {
    static async fetchProjectDetails(gitlabBaseUrl, gitlabPat, projectId) {
        const url = buildCleanApiUrl(gitlabBaseUrl, GITLAB_ENDPOINTS.PROJECT_DETAILS.replace('{projectId}', projectId));
        return await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
    }

    static async fetchTagsForProject(gitlabBaseUrl, gitlabPat, projectId) {
        const url = buildCleanApiUrl(gitlabBaseUrl, `${GITLAB_ENDPOINTS.PROJECT_TAGS.replace('{projectId}', projectId)}?per_page=${PAGINATION.PER_PAGE}`);
        return await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
    }

    static async *fetchCommitsBetweenTagsGenerator(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag) {
        const tags = await this.fetchTagsForProject(gitlabBaseUrl, gitlabPat, projectId);
        const currentTagObj = tags.find(tag => tag.name === currentTag);
        const previousTagObj = tags.find(tag => tag.name === previousTag);

        if (!currentTagObj || !previousTagObj) {
            throw new Error(`${ERROR_MESSAGES.GITLAB_TAGS_NOT_FOUND} ${currentTag} or ${previousTag}. ${ERROR_MESSAGES.GITLAB_TAGS_ENSURE_EXISTS}`);
        }

        const { committed_date: currentTagDate } = currentTagObj.commit;
        const { committed_date: previousTagDate } = previousTagObj.commit;

        let page = 1;
        const perPage = PAGINATION.PER_PAGE;

        while (true) {
            const endpoint = `${GITLAB_ENDPOINTS.PROJECT_COMMITS.replace('{projectId}', projectId)}?per_page=${perPage}&since=${previousTagDate}&until=${currentTagDate}&page=${page}`;
            const url = buildCleanApiUrl(gitlabBaseUrl, endpoint);

            const commits = await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
            if (commits.length === 0) break;

            for (const commit of commits) {
                yield commit;
            }

            page++;
        }
    }

    static async fetchCommitsBetweenTags(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag) {
        const commits = [];
        for await (const commit of this.fetchCommitsBetweenTagsGenerator(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag)) {
            commits.push(commit);
        }
        return commits;
    }

    static async testConnection(gitlabBaseUrl, gitlabPat) {
        try {
            const url = buildCleanApiUrl(gitlabBaseUrl, GITLAB_ENDPOINTS.USER);
            const result = await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
            return {
                success: true,
                message: SUCCESS_MESSAGES.GITLAB_API_CONNECTION_SUCCESSFUL, // This is a user message key
                data: result
            };
        } catch (error) {
            if (error.message.includes(HTTP_STATUS.UNAUTHORIZED)) {
                throw new Error(ERROR_MESSAGES.GITLAB_AUTHENTICATION_FAILED);
            } else if (error.message.includes(HTTP_STATUS.FORBIDDEN)) {
                throw new Error(ERROR_MESSAGES.GITLAB_ACCESS_FORBIDDEN);
            } else if (error.message.includes(HTTP_STATUS.NOT_FOUND)) {
                throw new Error(ERROR_MESSAGES.GITLAB_API_ENDPOINT_NOT_FOUND);
            }
            // Generic fallback
            throw error;
        }
    }
}

class AnalysisService {
    // Helper for tokenizing and cleaning text for loose matching
    static _getTokensForMatching(text) {
        if (!text || typeof text !== 'string') return [];
        // Simple stop words list, can be expanded
        const stopWords = new Set(['a', 'an', 'the', 'is', 'in', 'it', 'of', 'for', 'on', 'with', 'to', 'and', 'or', 'ddstm']);
        return text.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
    }

    // Helper for calculating keyword overlap score
    static _calculateOverlapScore(tokens1, tokens2) {
        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);
        let overlap = 0;
        for (const token of set1) {
            if (set2.has(token)) {
                overlap++;
            }
        }
        return overlap;
    }

    static analyzeIssueAndCommitCorrelation(jiraIssues, gitlabCommits, userModifications, gitlabProjectPath) {
        const { manualMatches = [], userUnmatches = [], flaggedItems = {} } = userModifications;

        // Phase 0: Apply user-defined flags
        jiraIssues.forEach(issue => {
            if (flaggedItems[issue.id]) {
                issue.needsAction = true;
            }
        });
        gitlabCommits.forEach(commit => {
            if (flaggedItems[commit.id]) {
                commit.needsAction = true;
            }
        });

        // Phase 1: Apply Manual Matches (these take highest precedence)
        for (const match of manualMatches) {
            const jiraIssue = jiraIssues.find(issue => issue.id === match.jiraId);
            const gitlabCommit = gitlabCommits.find(commit => commit.id === match.commitId);

            if (jiraIssue && gitlabCommit) {
                // Clear any existing associations first if we are forcing a manual one
                jiraIssue.associations = [];
                gitlabCommit.associations = [];

                jiraIssue.associations.push({ id: gitlabCommit.id, type: 'manual' });
                gitlabCommit.associations.push({ id: jiraIssue.id, type: 'manual' });
            }
        }

        // Phase 2: Explicit Matching (based on Jira keys in commit messages)
        // Only apply if not already part of a manual match
        for (const commit of gitlabCommits) {
            // If commit is already manually matched, skip its explicit key processing for matches
            if (commit.associations.some(a => a.type === 'manual')) continue;

            if (commit.explicitJiraKeys && commit.explicitJiraKeys.length > 0) {
                for (const jiraKey of commit.explicitJiraKeys) {
                    const jiraIssue = jiraIssues.find(issue => issue.id === jiraKey);
                    if (jiraIssue) {
                        // Add association to Jira issue
                        if (!jiraIssue.associations.some(assoc => assoc.id === commit.id)) {
                            jiraIssue.associations.push({ id: commit.id, type: 'explicit' });
                        }
                        // Add association to commit
                        if (!commit.associations.some(assoc => assoc.id === jiraIssue.id)) {
                            commit.associations.push({ id: jiraIssue.id, type: 'explicit' });
                        }
                    }
                }
            }
        }

        // Phase 2: Loose Matching (based on content similarity)
        const LOOSE_MATCH_THRESHOLD = 2; // Min number of overlapping keywords to be considered a loose match

        for (const issue of jiraIssues) {
            // Only attempt to loosely match issues that don't have an explicit or manual match yet
            if (issue.associations.some(a => a.type === 'explicit' || a.type === 'manual')) continue;

            const issueTokens = this._getTokensForMatching(issue.summary);
            if (issueTokens.length === 0) continue;

            let bestLooseMatch = null;
            let maxScore = 0;

            for (const commit of gitlabCommits) {
                // Only attempt to loosely match commits that don't have an explicit or manual match with this issue
                // and are not already explicitly or manually matched with *any* issue.
                if (commit.associations.some(a => a.id === issue.id || a.type === 'explicit' || a.type === 'manual')) continue;

                // Check if this pair was explicitly unmatched by the user
                const isUnmatchedByUser = userUnmatches.some(unmatch =>
                    (unmatch.item1Id === issue.id && unmatch.item2Id === commit.id) ||
                    (unmatch.item1Id === commit.id && unmatch.item2Id === issue.id)
                );
                if (isUnmatchedByUser) continue; // Skip if user explicitly unmatched this pair

                const commitText = `${commit.title} ${commit.message}`;
                const commitTokens = this._getTokensForMatching(commitText);
                if (commitTokens.length === 0) continue;

                const score = this._calculateOverlapScore(issueTokens, commitTokens);

                if (score >= LOOSE_MATCH_THRESHOLD && score > maxScore) {
                    maxScore = score;
                    bestLooseMatch = commit;
                }
            }

            if (bestLooseMatch) {
                // Add loose association to Jira issue
                if (!issue.associations.some(assoc => assoc.id === bestLooseMatch.id)) {
                    issue.associations.push({ id: bestLooseMatch.id, type: 'loose' });
                }
                // Add loose association to commit
                if (!bestLooseMatch.associations.some(assoc => assoc.id === issue.id)) {
                    bestLooseMatch.associations.push({ id: issue.id, type: 'loose' });
                }
            }
        }
        return {
            jiraIssues, // These lists are now modified directly
            gitlabCommits
        };
    }
}

// Initialize the background service
new BackgroundService();
