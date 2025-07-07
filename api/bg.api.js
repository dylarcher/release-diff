"use strict";

import { handleAsyncBackgroundMessage } from './proxy.api.js';
import { loadApiConfigurationFromStorage } from './store.api.js';
import { generateContextKey, loadUserModifications } from '../utils/storage.util.js';
import { extractStoryKeysFromId } from '../utils/parser.util.js';
import { ACTIONS, CONSOLE_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../conf/constants.conf.js';
import JiraService from '../svc/jira.service.js';
import GitLabService from '../svc/gitlab.service.js';
import AnalysisService from '../svc/analyze.service.js';

export class BackgroundService {
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
            console.info(CONSOLE_MESSAGES.SIDE_PANEL_OPENED_TAB, tab.id);
        } catch (error) {
            console.error(ERROR_MESSAGES.OPENING_SIDE_PANEL, error.message);
            try {
                await sidePanelStrategies.windowLevel();
                console.info(CONSOLE_MESSAGES.SIDE_PANEL_OPENED_WINDOW, tab.windowId);
            } catch (windowError) {
                console.error(ERROR_MESSAGES.WINDOW_LEVEL_SIDE_PANEL_FAILED, windowError.message);
            }
        }
    }

    handleMessages() {
        return handleAsyncBackgroundMessage(async (request, sender) => {
            console.info(CONSOLE_MESSAGES.BACKGROUND_RECEIVED_MESSAGE, request);

            const handler = this.messageHandlers.get(request.action);
            return handler
                ? await handler(request.data)
                : { success: false, message: ERROR_MESSAGES.UNKNOWN_ACTION, error: ERROR_MESSAGES.UNKNOWN_ACTION };
        });
    }

    handleInstalled() {
        console.info(CONSOLE_MESSAGES.EXTENSION_INSTALLED_UPDATED);
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
            explicitJiraKeys: extractStoryKeysFromId(`${commit.title} ${commit.message || ''}`), // Store explicitly found keys
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

console.info(CONSOLE_MESSAGES.BACKGROUND_SCRIPT_LOADED);

export default new BackgroundService();
