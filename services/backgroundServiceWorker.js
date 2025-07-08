import { handleAsyncBackgroundMessage } from './chromeMessageHandler.js';
import { loadApiConfigurationFromStorage } from './chromeStorageManager.js';
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

        const gitlabCommits = await GitLabService.fetchCommitsBetweenTags(gitlabBaseUrl, gitlabPat, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag);
        const gitlabProject = await GitLabService.fetchProjectDetails(gitlabBaseUrl, gitlabPat, gitlabProjectId);

        const allGitLabCommits = gitlabCommits.map(commit => ({
            ...commit,
            jira_keys: extractJiraIssueKeysFromText(`${commit.title} ${commit.message || ''}`)
        }));

        const allJiraIssues = jiraIssues.map(issue => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name
        }));

        const summary = AnalysisService.analyzeIssueAndCommitCorrelation(allJiraIssues, allGitLabCommits, plannedIssueKeys, gitlabProject.path_with_namespace);
        summary.allJiraIssues = allJiraIssues;
        summary.allGitLabCommits = allGitLabCommits;
        summary.gitlabProjectPath = gitlabProject.path_with_namespace;

        return { success: true, summary };
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
                message: SUCCESS_MESSAGES.GITLAB_API_CONNECTION_SUCCESSFUL,
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
            throw error;
        }
    }
}

class AnalysisService {
    static analyzeIssueAndCommitCorrelation(jiraIssues, gitlabCommits, plannedIssueKeys, gitlabProjectPath) {
        const issuesInCodeMap = new Map();
        const allIssueKeysInCode = new Set();

        for (const commit of gitlabCommits) {
            const commitJiraKeys = commit.jira_keys || [];

            for (const jiraKey of commitJiraKeys) {
                allIssueKeysInCode.add(jiraKey);
                if (!issuesInCodeMap.has(jiraKey)) {
                    issuesInCodeMap.set(jiraKey, { commits: [], merge_requests: [] });
                }
                issuesInCodeMap.get(jiraKey).commits.push({
                    id: commit.id,
                    short_id: commit.short_id
                });
            }
        }

        const [plannedNotInCode, inCodeNotPlanned, statusMismatches, matchedIssues] = [[], [], [], []];

        for (const jiraIssue of jiraIssues) {
            const isInCode = allIssueKeysInCode.has(jiraIssue.key);
            const isResolved = JIRA_RESOLVED_STATUSES.includes(jiraIssue.status);

            if (isInCode) {
                matchedIssues.push({
                    key: jiraIssue.key,
                    summary: jiraIssue.summary,
                    status: jiraIssue.status,
                    commits: issuesInCodeMap.get(jiraIssue.key)?.commits || [],
                    merge_requests: issuesInCodeMap.get(jiraIssue.key)?.merge_requests || []
                });

                if (!isResolved) {
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
}
new BackgroundService();
