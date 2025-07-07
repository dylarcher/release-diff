import { displayStatusMessage } from './statusDisplayManager.js';
import { saveFormDataToStorage, loadFormDataFromStorage, loadThemePreference } from './chromeStorageManager.js';
import { sendMessageToBackgroundScript } from './chromeMessageHandler.js';
import { clearElementContent, populateDatalistWithOptions, createDiscrepancyItemDiv, resetForm } from '../helpers/domManipulationHelpers.js';
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
    URL_TEMPLATES,
    ELEMENT_IDS as EXT_ELEMENT_IDS // Alias to avoid conflict if mock data has 'ELEMENT_IDS'
} from '../shared/presetConstants.js';

// Mocked data will be loaded dynamically using import()

class ExtensionUIManager {
    constructor() {
        this.initializeI18n();
        this.setupElementReferences();
        this.setupEventListeners();
        this.loadFormValuesFromStorage();
        this.loadAndApplyTheme(); // Added this line
    }

    async loadAndApplyTheme() {
        try {
            const theme = await loadThemePreference();
            if (theme) {
                document.body.dataset.theme = theme;
            } else {
                // If no theme is saved, default to light or try to use system preference
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.dataset.theme = prefersDark ? 'dark' : 'light';
            }
        }
        catch (error) {
            console.error(CONSOLE_MESSAGES.THEME_LOAD_ERROR, error);
            document.body.dataset.theme = 'light'; // Fallback to light theme
        }
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
            optionsLink: document.getElementById(ELEMENT_IDS.OPTIONS_LINK),
            viewDemoReportDetails: document.getElementById(ELEMENT_IDS.VIEW_DEMO_REPORT_DETAILS),
            exampleResultsDiv: document.getElementById(ELEMENT_IDS.EXAMPLE_RESULTS),
            jiraTicketsExampleDiv: document.getElementById(ELEMENT_IDS.JIRA_TICKETS_EXAMPLE),
            gitlabCommitsExampleDiv: document.getElementById(ELEMENT_IDS.GITLAB_COMMITS_EXAMPLE),
            gitlabTagsExampleDiv: document.getElementById(ELEMENT_IDS.GITLAB_TAGS_EXAMPLE),
            resetBtn: document.getElementById(ELEMENT_IDS.RESET_BTN)
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
            ['getVersions', this.handleGetVersions.bind(this)],
            ['viewDemoReportToggle', this.handleDemoReportToggle.bind(this)],
            ['reset', this.handleReset.bind(this)]
        ]);

        optionsLink.addEventListener('click', this.eventHandlers.get('optionsClick'));
        generateSummaryBtn.addEventListener('click', this.eventHandlers.get('generateSummary'));
        jiraFixVersionInput.addEventListener('input', this.eventHandlers.get('versionInput'));
        getVersionsBtn.addEventListener('click', this.eventHandlers.get('getVersions'));
        this.elements.viewDemoReportDetails.addEventListener('toggle', this.eventHandlers.get('viewDemoReportToggle'));
        this.elements.resetBtn.addEventListener('click', this.eventHandlers.get('reset'));
    }

    handleOptionsClick(e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    }

    async handleDemoReportToggle(event) {
        if (event.target.open) {
            console.log('View Demo Report details opened');
            // Populate input fields with demo values
            this.elements.jiraProjectKeyInput.value = 'DDSTM';
            this.elements.gitlabProjectIdInput.value = '82150';
            this.elements.jiraFixVersionInput.value = '57550'; // This is the ID
            this.elements.gitlabCurrentTagInput.value = 'v2.25.5';
            this.elements.gitlabPreviousTagInput.value = 'v2.25.4';

            // Save these populated values to storage
            await this.saveFormValuesToStorage();

            // Populate the #exampleResults div
            // This logic will be moved/adapted in the next step
            this.elements.exampleResultsDiv.classList.remove(CSS_CLASSES.HIDDEN); // Should be visible by details open
            // Call population methods here once they are integrated
            await this.populateExampleReport();


        } else {
            console.log('View Demo Report details closed');
            // Optionally clear the demo report content or fields if desired when closed
            // clearElementContent(this.elements.exampleResultsDiv);
        }
    }

    async populateExampleReport() {
        try {
            const [jiraData, gitlabCommitData, gitlabTagData] = await Promise.all([
                await this.getDemoJiraData(),
                await this.getDemoGitlabCommitData(),
                await this.getDemoGitlabTagData(),
            ]);
            this.populateExampleJiraTickets(jiraData);
            this.populateExampleGitlabCommits(gitlabCommitData);
            this.populateExampleGitlabTags(gitlabTagData);
        } catch (error) {
            console.error("Error populating example report sections:", error);
            const errorMessage = `<p>${getMessage('errorLoadingData')}</p>`;
            if (this.elements.jiraTicketsExampleDiv) this.elements.jiraTicketsExampleDiv.innerHTML = errorMessage;
            if (this.elements.gitlabCommitsExampleDiv) this.elements.gitlabCommitsExampleDiv.innerHTML = errorMessage;
            if (this.elements.gitlabTagsExampleDiv) this.elements.gitlabTagsExampleDiv.innerHTML = errorMessage;
        }
    }

    // --- Demo Data Fetching methods for the class ---
    async getDemoJiraData() {
        // Dynamically import the Jira mock data
        return (await import('../shared/release-dds-angular-v2.26.0/jiraReleaseUserStories.mock.json', { assert: { type: 'json' }, with: { type: 'json' } }))?.default || {};
    }

    async getDemoGitlabTagData() {
        // Dynamically import the GitLab tags mock data
        return (await import('../shared/release-dds-angular-v2.26.0/gitlabTagsFor2.25.5.mock.json', { assert: { type: 'json' }, with: { type: 'json' } }))?.default || [];
    }

    async getDemoGitlabCommitData() {
        // Dynamically import the GitLab commits mock data
        return (await import('../shared/release-dds-angular-v2.26.0/gitlabCommitsSince2.25.4.mock.json', { assert: { type: 'json' }, with: { type: 'json' } }))?.default || [];
    }

    populateExampleJiraTickets(jiraData) {
        clearElementContent(this.elements.jiraTicketsExampleDiv);
        if (jiraData && jiraData.issues && this.elements.jiraTicketsExampleDiv) {
            const ul = document.createElement('ul');
            ul.className = 'list-style-none p-0';
            jiraData.issues.forEach(issue => {
                const li = document.createElement('li');
                li.className = CSS_CLASSES.DISCREPANCY_ITEM; // Consider if a different class is needed or if this is okay
                const issueHtml = `<strong><a href="${URL_TEMPLATES.JIRA_ISSUE.replace('{key}', issue.key)}" target="_blank" rel="noopener noreferrer">${issue.key}</a></strong>: ${issue.fields.summary} <br> <small>${getMessage('statusLabel')}${issue.fields.status.name}</small>`;
                li.innerHTML = issueHtml;
                ul.appendChild(li);
            });
            this.elements.jiraTicketsExampleDiv.appendChild(ul);
        } else if (this.elements.jiraTicketsExampleDiv) {
            this.elements.jiraTicketsExampleDiv.innerHTML = `<p>${getMessage('noJiraTicketsFound')}</p>`;
        }
    }

    populateExampleGitlabCommits(commitData) {
        clearElementContent(this.elements.gitlabCommitsExampleDiv);
        if (commitData && commitData.length > 0 && this.elements.gitlabCommitsExampleDiv) {
            const ul = document.createElement('ul');
            ul.className = 'list-style-none p-0';
            const gitlabProjectPath = 'dao/dell-digital-design/design-language-system/systems/dds-angular'; // Example path from mock data context
            commitData.forEach(commit => {
                const li = document.createElement('li');
                li.className = CSS_CLASSES.DISCREPANCY_ITEM;
                let commitHtml = `<strong><a href="${URL_TEMPLATES.GITLAB_COMMIT.replace('{projectPath}', gitlabProjectPath).replace('{commitId}', commit.id)}" target="_blank" rel="noopener noreferrer">${commit.short_id}</a></strong>: ${commit.title}`;
                li.innerHTML = commitHtml;
                ul.appendChild(li);
            });
            this.elements.gitlabCommitsExampleDiv.appendChild(ul);
        } else if (this.elements.gitlabCommitsExampleDiv) {
            this.elements.gitlabCommitsExampleDiv.innerHTML = `<p>${getMessage('noGitLabCommitsFound')}</p>`;
        }
    }

    populateExampleGitlabTags(tagData) {
        clearElementContent(this.elements.gitlabTagsExampleDiv);
        if (tagData && tagData.length > 0 && this.elements.gitlabTagsExampleDiv) {
            const ul = document.createElement('ul');
            ul.className = 'list-style-none p-0';
            tagData.forEach(tag => {
                const li = document.createElement('li');
                li.className = CSS_CLASSES.DISCREPANCY_ITEM;
                let tagHtml = `<strong>${tag.name}</strong>`;
                if (tag.release && tag.release.description) {
                    const releaseDescription = tag.release.description
                        .replace(/\n/g, '<br>')
                        .replace(/### (.*?)\s/g, '<strong>$1</strong><br>')
                        .replace(/\* \*\*(.*?)\*\* (.*?)\((.*?)\)/g, '<li><strong>$1</strong> $2 (<a href="$3" target="_blank" rel="noopener noreferrer">link</a>)</li>')
                        .replace(/\* (.*?)\((.*?)\)/g, '<li>$1 (<a href="$2" target="_blank" rel="noopener noreferrer">link</a>)</li>');
                    tagHtml += `<br><small>Release Notes:</small><div class="release-notes">${releaseDescription}</div>`;
                }
                li.innerHTML = tagHtml;
                ul.appendChild(li);
            });
            this.elements.gitlabTagsExampleDiv.appendChild(ul);
        } else if (this.elements.gitlabTagsExampleDiv) {
            this.elements.gitlabTagsExampleDiv.innerHTML = `<p>${getMessage('noGitLabTagsFound')}</p>`;
        }
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
                    displayStatusMessage(statusMessageDiv, `${getMessage('errorPrefix')}${response.message || getMessage('unknownSystemError')}`, STATUS_TYPES.ERROR);
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
            const issueHtml = `<strong><a href="${URL_TEMPLATES.JIRA_ISSUE.replace('{key}', issue.key)}" target="_blank">${issue.key}</a></strong>: ${issue.summary} <br> <small>${getMessage('statusLabel')}${issue.status}</small>`;
            const issueEl = createDiscrepancyItemDiv(CSS_CLASSES.DISCREPANCY_ITEM, issueHtml);
            jiraTicketsDiv.appendChild(issueEl);
        }

        for (const commit of summary.allGitLabCommits) {
            let commitHtml = `<strong><a href="${URL_TEMPLATES.GITLAB_COMMIT.replace('{projectPath}', summary.gitlabProjectPath).replace('{commitId}', commit.id)}" target="_blank">${commit.short_id}</a></strong>: ${commit.title}`;

            if (commit.jira_keys && commit.jira_keys.length > 0) {
                commitHtml += `<br><small>${getMessage('relatedJiraLabel')}${commit.jira_keys.join(', ')}</small>`;
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

    handleReset() {
        resetForm(this.elements);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ExtensionUIManager();
});
