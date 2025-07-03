import { displayStatusMessage } from './statusDisplayManager.js';
import { saveFormDataToStorage, loadFormDataFromStorage } from './chromeStorageManager.js';
import { sendMessageToBackgroundScript } from './chromeMessageHandler.js';
import { clearElementContent, populateDatalistWithOptions, createDiscrepancyItemDiv } from '../helpers/domManipulationHelpers.js';
import { validateRequiredFields, extractFormFieldValues } from '../helpers/formValidationHelpers.js';
import { initializeI18n, getMessage } from '../helpers/internationalizationHelper.js';
import {
    ELEMENT_IDS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    STATUS_MESSAGES,
    USER_MESSAGES,
    ACTIONS,
    STATUS_TYPES,
    CSS_CLASSES,
    CONSOLE_MESSAGES,
    TIMEOUTS,
    URL_TEMPLATES
} from '../shared/presetConstants.js';

class ExtensionUIManager {
    constructor() {
        this.initializeI18n();
        this.setupElementReferences();
        this.setupEventListeners();
        this.loadFormValuesFromStorage();
    }

    initializeI18n() {
        initializeI18n();
    }

    setupElementReferences() {
        this.elements = {
            generateSummaryBtn: document.getElementById(ELEMENT_IDS.GENERATE_SUMMARY_BTN),
            getVersionsBtn: document.getElementById(ELEMENT_IDS.GET_VERSIONS_BTN),
            loadingSpinner: document.getElementById(ELEMENT_IDS.LOADING_SPINNER),
            statusMessageDiv: document.getElementById(ELEMENT_IDS.STATUS_MESSAGE),
            summaryResultsDiv: document.getElementById(ELEMENT_IDS.SUMMARY_RESULTS),
            versionsDatalist: document.getElementById(ELEMENT_IDS.VERSIONS_DATALIST),
            jiraProjectKeyInput: document.getElementById(ELEMENT_IDS.JIRA_PROJECT_KEY),
            jiraFixVersionInput: document.getElementById(ELEMENT_IDS.JIRA_FIX_VERSION),
            gitlabProjectIdInput: document.getElementById(ELEMENT_IDS.GITLAB_PROJECT_ID),
            gitlabCurrentTagInput: document.getElementById(ELEMENT_IDS.GITLAB_CURRENT_TAG),
            gitlabPreviousTagInput: document.getElementById(ELEMENT_IDS.GITLAB_PREVIOUS_TAG),
            jiraTicketsDiv: document.getElementById(ELEMENT_IDS.JIRA_TICKETS),
            gitlabHistoryDiv: document.getElementById(ELEMENT_IDS.GITLAB_HISTORY),
            optionsLink: document.getElementById(ELEMENT_IDS.OPTIONS_LINK)
        };

        this.fetchController = null;
        this.debounceTimeout = null;
    }

    setupEventListeners() {
        const { optionsLink, generateSummaryBtn, jiraFixVersionInput, getVersionsBtn } = this.elements;

        this.eventHandlers = new Map([
            ['optionsClick', this.handleOptionsClick.bind(this)],
            ['generateSummary', this.handleGenerateSummary.bind(this)],
            ['versionInput', this.handleVersionInput.bind(this)],
            ['getVersions', this.handleGetVersions.bind(this)]
        ]);

        optionsLink.addEventListener('click', this.eventHandlers.get('optionsClick'));
        generateSummaryBtn.addEventListener('click', this.eventHandlers.get('generateSummary'));
        jiraFixVersionInput.addEventListener('input', this.eventHandlers.get('versionInput'));
        getVersionsBtn.addEventListener('click', this.eventHandlers.get('getVersions'));
    }

    handleOptionsClick(e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    }

    async handleGenerateSummary() {
        const { jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput, statusMessageDiv } = this.elements;

        const [jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag] =
            extractFormFieldValues(jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput);

        const validation = validateRequiredFields({
            jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag
        });

        if (!validation.isValid) {
            displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FILL_ALL_INPUT_FIELDS), STATUS_TYPES.ERROR);
            return;
        }

        await this.saveFormValuesToStorage();
        this.showLoadingStateAndClearResults();
        displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FETCHING_AND_COMPARING_DATA), STATUS_TYPES.INFO);

        try {
            console.log(CONSOLE_MESSAGES.SENDING_MESSAGE_TO_BACKGROUND);

            const response = await sendMessageToBackgroundScript(ACTIONS.GENERATE_RELEASE_SUMMARY, {
                jiraProjectKey,
                jiraFixVersion,
                gitlabProjectId,
                gitlabCurrentTag,
                gitlabPreviousTag
            });

            console.log(CONSOLE_MESSAGES.RECEIVED_RESPONSE_FROM_BACKGROUND, response);
            this.elements.loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);

            const messageHandler = {
                true: () => {
                    displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.SUMMARY_GENERATED_SUCCESSFULLY), STATUS_TYPES.SUCCESS);
                    this.displaySummaryResults(response.summary);
                },
                false: () => {
                    displayStatusMessage(statusMessageDiv, `Error: ${response.message || ERROR_MESSAGES.UNKNOWN_ERROR}`, STATUS_TYPES.ERROR);
                }
            }[Boolean(response.success)];

            messageHandler();
        } catch (error) {
            this.elements.loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);
            displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.UNEXPECTED_ERROR_OCCURRED), STATUS_TYPES.ERROR);
            console.error(CONSOLE_MESSAGES.SIDE_PANEL_SCRIPT_ERROR, error);
        }
    }

    handleVersionInput() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.fetchAvailableFixVersions();
        }, TIMEOUTS.DEBOUNCE_DELAY);
    }

    handleGetVersions() {
        this.fetchAvailableFixVersions();
    }

    async fetchAvailableFixVersions() {
        const { jiraProjectKeyInput, statusMessageDiv, loadingSpinner, versionsDatalist } = this.elements;
        const jiraProjectKey = jiraProjectKeyInput.value.trim();

        if (!jiraProjectKey) {
            displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.ENTER_JIRA_PROJECT_KEY_FIRST), STATUS_TYPES.ERROR);
            return;
        }

        this.abortPreviousFetchIfExists();
        this.setupNewFetchController();

        displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FETCHING_AVAILABLE_FIX_VERSIONS), STATUS_TYPES.INFO);
        loadingSpinner.classList.remove(CSS_CLASSES.HIDDEN);

        try {
            const response = await sendMessageToBackgroundScript(ACTIONS.GET_FIX_VERSIONS, { jiraProjectKey });

            if (this.fetchController.signal.aborted) return;

            const resultHandler = {
                true: () => {
                    displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FIX_VERSIONS_RETRIEVED_SUCCESSFULLY), STATUS_TYPES.SUCCESS);
                    populateDatalistWithOptions(versionsDatalist, response.data);
                },
                false: () => {
                    displayStatusMessage(statusMessageDiv, `${ERROR_MESSAGES.FAILED_TO_GET_FIX_VERSIONS} ${response.message || ERROR_MESSAGES.UNKNOWN_ERROR}`, STATUS_TYPES.ERROR);
                    clearElementContent(versionsDatalist);
                }
            }[Boolean(response.success)];

            resultHandler();
        } catch (error) {
            if (error.name !== 'AbortError') {
                displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.ERROR_GETTING_FIX_VERSIONS), STATUS_TYPES.ERROR);
                console.error(CONSOLE_MESSAGES.GET_VERSIONS_ERROR, error);
                clearElementContent(versionsDatalist);
            }
        } finally {
            if (!this.fetchController.signal.aborted) {
                loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);
            }
        }
    }

    displaySummaryResults(summary) {
        const { summaryResultsDiv, jiraTicketsDiv, gitlabHistoryDiv } = this.elements;

        summaryResultsDiv.classList.remove(CSS_CLASSES.HIDDEN);
        clearElementContent(jiraTicketsDiv);
        clearElementContent(gitlabHistoryDiv);

        for (const issue of summary.allJiraIssues) {
            const issueHtml = `<strong><a href="${URL_TEMPLATES.JIRA_ISSUE.replace('{key}', issue.key)}" target="_blank">${issue.key}</a></strong>: ${issue.summary} <br> <small>Status: ${issue.status}</small>`;
            const issueEl = createDiscrepancyItemDiv(CSS_CLASSES.DISCREPANCY_ITEM, issueHtml);
            jiraTicketsDiv.appendChild(issueEl);
        }

        for (const commit of summary.allGitLabCommits) {
            let commitHtml = `<strong><a href="${URL_TEMPLATES.GITLAB_COMMIT.replace('{projectPath}', summary.gitlabProjectPath).replace('{commitId}', commit.id)}" target="_blank">${commit.short_id}</a></strong>: ${commit.title}`;

            if (commit.jira_keys && commit.jira_keys.length > 0) {
                commitHtml += `<br><small>Related Jira: ${commit.jira_keys.join(', ')}</small>`;
            }

            const commitEl = createDiscrepancyItemDiv(CSS_CLASSES.DISCREPANCY_ITEM, commitHtml);
            gitlabHistoryDiv.appendChild(commitEl);
        }
    }

    async saveFormValuesToStorage() {
        const { versionsDatalist, jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput } = this.elements;

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

    async loadFormValuesFromStorage() {
        const { jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput } = this.elements;

        const data = await loadFormDataFromStorage();

        const formFieldUpdaters = {
            jiraProjectKey: (value) => { if (value) jiraProjectKeyInput.value = value; },
            jiraFixVersion: (value) => { if (value) jiraFixVersionInput.value = value; },
            gitlabProjectId: (value) => { if (value) gitlabProjectIdInput.value = value; },
            gitlabCurrentTag: (value) => { if (value) gitlabCurrentTagInput.value = value; },
            gitlabPreviousTag: (value) => { if (value) gitlabPreviousTagInput.value = value; }
        };

        for (const [field, updater] of Object.entries(formFieldUpdaters)) {
            updater(data[field]);
        }
    }

    showLoadingStateAndClearResults() {
        const { loadingSpinner, summaryResultsDiv } = this.elements;
        loadingSpinner.classList.remove(CSS_CLASSES.HIDDEN);
        summaryResultsDiv.classList.add(CSS_CLASSES.HIDDEN);
    }

    abortPreviousFetchIfExists() {
        if (this.fetchController) {
            this.fetchController.abort();
        }
    }

    setupNewFetchController() {
        this.fetchController = new AbortController();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ExtensionUIManager();
});
