import { displayStatusMessage } from './statusDisplayManager.js';
import {
    saveFormDataToStorage,
    loadFormDataFromStorage,
    loadThemePreference,
    saveUserModifications // Import the new function
} from './chromeStorageManager.js';
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
        this.currentSummaryData = null; // To store the data from background script (issues, commits, projectPath)
        this.currentContextKey = null; // To store the context key for user modifications
        this.itemToMatch = null; // For two-step manual matching
        this.apiBaseUrls = { jira: '', gitlab: '' }; // To store API base URLs

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
            jiraItemsContainer: document.getElementById(ELEMENT_IDS.JIRA_ITEMS_CONTAINER),
            gitlabItemsContainer: document.getElementById(ELEMENT_IDS.GITLAB_ITEMS_CONTAINER),
            unpairedItemsSection: document.getElementById(ELEMENT_IDS.UNPAIRED_ITEMS_SECTION),
            unpairedJiraItemsContainer: document.getElementById(ELEMENT_IDS.UNPAIRED_JIRA_ITEMS_CONTAINER),
            unpairedGitlabItemsContainer: document.getElementById(ELEMENT_IDS.UNPAIRED_GITLAB_ITEMS_CONTAINER),
            optionsLink: document.getElementById(ELEMENT_IDS.OPTIONS_LINK),
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

    _createItemCard(item, itemType, gitlabProjectPath = '') {
        const card = document.createElement('div');
        card.className = `item-card ${itemType}-card ${item.needsAction ? 'needs-action' : ''}`;
        card.dataset.itemId = item.id;
        card.dataset.itemType = itemType;

        let titleHtml = '';
        if (itemType === 'jira') {
            // TODO: The URL_TEMPLATES.JIRA_ISSUE might need dynamic org name
            const jiraUrl = URL_TEMPLATES.JIRA_ISSUE.replace('{key}', item.key).replace('{ORG_NAME}', 'example'); // Placeholder for ORG_NAME
            titleHtml = `<strong><a href="${jiraUrl}" target="_blank">${item.key}</a></strong>: ${item.summary}<br><small>${getMessage('statusLabel')}${item.status}</small>`;
        } else { // gitlab
            // TODO: The URL_TEMPLATES.GITLAB_COMMIT might need dynamic org name
            const commitUrl = URL_TEMPLATES.GITLAB_COMMIT.replace('{projectPath}', gitlabProjectPath).replace('{commitId}', item.id).replace('{ORG_NAME}', 'example'); // Placeholder for ORG_NAME
            titleHtml = `<strong><a href="${commitUrl}" target="_blank">${item.short_id}</a></strong>: ${item.title}`;
        }

        let associationsHtml = `<small>${getMessage('associatedItemsLabel')}`;
        if (item.associations && item.associations.length > 0) {
            associationsHtml += item.associations.map(assoc => `${assoc.id} (${getMessage('matchTypeLabel')}${assoc.type})`).join(', ');
        } else {
            associationsHtml += getMessage('noAssociatedItems');
        }
        associationsHtml += '</small>';

        const actionsHtml = `
            <div class="item-actions">
                <button class="btn btn-sm btn-secondary flag-btn" data-item-id="${item.id}" data-item-type="${itemType}">
                    ${item.needsAction ? getMessage('unflagItemAction') : getMessage('flagItemAction')}
                </button>
                ${item.associations && item.associations.length > 0 ?
                `<button class="btn btn-sm btn-warning unmatch-btn" data-item-id="${item.id}" data-item-type="${itemType}">${getMessage('unmatchItemAction')}</button>` :
                `<button class="btn btn-sm btn-success match-btn" data-item-id="${item.id}" data-item-type="${itemType}">${getMessage('matchItemAction')}</button>`
            }
            </div>
        `;

        card.innerHTML = `
            <div class="item-title">${titleHtml}</div>
            <div class="item-associations">${associationsHtml}</div>
            ${actionsHtml}
        `;
        return card;
    }

    displaySummaryResults(summary) {
        const {
            summaryResultsDiv,
            jiraTicketsDiv, // Now jira-items-container
            gitlabHistoryDiv, // Now gitlab-items-container
            unpairedItemsSection,
            unpairedJiraItemsContainer,
            unpairedGitlabItemsContainer
        } = this.elements;

        summaryResultsDiv.classList.remove(CSS_CLASSES.HIDDEN);
        clearElementContent(jiraTicketsDiv);
        clearElementContent(gitlabHistoryDiv);
        clearElementContent(unpairedJiraItemsContainer);
        clearElementContent(unpairedGitlabItemsContainer);
        unpairedItemsSection.classList.add(CSS_CLASSES.HIDDEN); // Hide by default

        let hasUnpairedItems = false;

        for (const issue of summary.allJiraIssues) {
            const issueCard = this._createItemCard(issue, 'jira', summary.gitlabProjectPath);
            if (issue.associations && issue.associations.length > 0) {
                jiraTicketsDiv.appendChild(issueCard);
                // If this issue is paired, find its counterpart commits and render them in the GitLab column if not already there
                issue.associations.forEach(assoc => {
                    const matchedCommit = summary.allGitLabCommits.find(c => c.id === assoc.id);
                    // Basic check to avoid duplicate rendering if a commit is already explicitly in gitlabHistoryDiv
                    if (matchedCommit && !gitlabHistoryDiv.querySelector(`.item-card[data-item-id="${matchedCommit.id}"]`)) {
                        const commitCard = this._createItemCard(matchedCommit, 'gitlab', summary.gitlabProjectPath);
                        gitlabHistoryDiv.appendChild(commitCard);
                    }
                });
            } else {
                unpairedJiraItemsContainer.appendChild(issueCard);
                hasUnpairedItems = true;
            }
        }

        for (const commit of summary.allGitLabCommits) {
            // Only render commits here if they haven't been rendered as part of a Jira pair
            // or if they are themselves unpaired.
            const isRendered = !!gitlabHistoryDiv.querySelector(`.item-card[data-item-id="${commit.id}"]`);
            if (!isRendered) {
                const commitCard = this._createItemCard(commit, 'gitlab', summary.gitlabProjectPath);
                if (commit.associations && commit.associations.length > 0) {
                    // This commit is paired, but its Jira counterpart might have been listed as unpaired if the commit was processed first.
                    // This logic is a bit tricky; might need refinement for perfect column placement.
                    // For now, if it's paired and not rendered, put it in the main gitlab column.
                    gitlabHistoryDiv.appendChild(commitCard);
                    commit.associations.forEach(assoc => {
                        const matchedJira = summary.allJiraIssues.find(j => j.id === assoc.id);
                        if (matchedJira && !jiraTicketsDiv.querySelector(`.item-card[data-item-id="${matchedJira.id}"]`)) {
                            const jiraCard = this._createItemCard(matchedJira, 'jira', summary.gitlabProjectPath);
                            jiraTicketsDiv.appendChild(jiraCard);
                        }
                    });
                } else {
                    unpairedGitlabItemsContainer.appendChild(commitCard);
                    hasUnpairedItems = true;
                }
            }
        }
        if (hasUnpairedItems) {
            unpairedItemsSection.classList.remove(CSS_CLASSES.HIDDEN);
        }

        // Store the data locally for manipulation
        // Store the data locally for manipulation
        this.currentSummaryData = {
            allJiraIssues: summary.allJiraIssues,
            allGitLabCommits: summary.allGitLabCommits,
            gitlabProjectPath: summary.gitlabProjectPath
            // contextKey is now part of the summary object from background script
        };
        this.currentContextKey = summary.contextKey; // Store the context key
        this.currentUserUnmatches = summary.loadedUserUnmatches || []; // Initialize with unmatches from storage
        this.apiBaseUrls.jira = summary.jiraBaseUrl;
        this.apiBaseUrls.gitlab = summary.gitlabBaseUrl;

        this._setupItemActionListeners();
        this._initializeDragAndDrop(); // Initialize drag and drop functionality
    }

    _initializeDragAndDrop() {
        if (!this.currentSummaryData) return;

        const mainGitlabContainers = [
            this.elements.gitlabItemsContainer,
            this.elements.unpairedGitlabItemsContainer
        ].filter(el => el);

        mainGitlabContainers.forEach(container => {
            if (container.children.length > 0) {
                new Sortable(container, {
                    group: {
                        name: 'gitlab-commits',
                        pull: 'clone',
                        put: false
                    },
                    animation: 150,
                    sort: false,
                    fallbackOnBody: true,
                    store: null,
                });
            }
        });

        const jiraCards = document.querySelectorAll('.jira-dropzone-card');
        jiraCards.forEach(jiraCard => {
            const associatedCommitsContainer = jiraCard.querySelector('.associated-commits-container');
            const jiraItemId = jiraCard.dataset.itemId;

            if (associatedCommitsContainer) {
                new Sortable(associatedCommitsContainer, {
                    group: {
                        name: 'gitlab-commits',
                        pull: true,
                        put: true
                    },
                    animation: 150,
                    fallbackOnBody: true,
                    store: null,
                    onAdd: async (evt) => {
                        const droppedItem = evt.item;
                        const gitlabCommitId = droppedItem.dataset.itemId;
                        const sourceListSortable = evt.from;
                        const originalSourceContainer = sourceListSortable.el;

                        console.log(`GitLab commit ${gitlabCommitId} dropped onto Jira ${jiraItemId}. Source: ${originalSourceContainer.id}`);

                        const jiraItem = this._findItem(jiraItemId, 'jira');
                        const gitlabCommit = this._findItem(gitlabCommitId, 'gitlab');

                        if (jiraItem && gitlabCommit) {
                            let alreadyAssociated = jiraItem.associations.some(assoc => assoc.id === gitlabCommitId);

                            if (!alreadyAssociated) {
                                jiraItem.associations.push({ id: gitlabCommitId, type: 'manual-dnd' });
                                if (!gitlabCommit.associations) gitlabCommit.associations = [];
                                gitlabCommit.associations.push({ id: jiraItemId, type: 'manual-dnd' });
                            }

                            // If the item was moved from another Jira card's associated list
                            if (originalSourceContainer.classList.contains('associated-commits-container') && originalSourceContainer !== associatedCommitsContainer) {
                                const sourceJiraCard = originalSourceContainer.closest('.jira-dropzone-card');
                                if (sourceJiraCard) {
                                    const sourceJiraId = sourceJiraCard.dataset.itemId;
                                    const sourceJiraItem = this._findItem(sourceJiraId, 'jira');
                                    if (sourceJiraItem && sourceJiraId !== jiraItemId) { // Ensure it's not the same card
                                        sourceJiraItem.associations = sourceJiraItem.associations.filter(assoc => assoc.id !== gitlabCommitId);
                                        // Also update the commit's association to the old Jira item
                                        if (gitlabCommit.associations) {
                                            gitlabCommit.associations = gitlabCommit.associations.filter(assoc => assoc.id !== sourceJiraId);
                                        }
                                        console.log(`Removed commit ${gitlabCommitId} from source Jira ${sourceJiraId}`);
                                    }
                                }
                            }

                            // If a cloned item is dropped, the original DOM element (evt.item) is the clone.
                            // We should remove it if it was a clone, because displaySummaryResults will recreate it.
                            if (evt.pullMode === 'clone') {
                                evt.item.remove(); // Remove the clone, data will drive the re-render.
                            }

                            await this._saveCurrentUserModifications();
                            this.displaySummaryResults(this.currentSummaryData);
                            displayStatusMessage(this.elements.statusMessageDiv, getMessage(SUCCESS_MESSAGES.ASSOCIATION_CREATED, { commitId: gitlabCommit.short_id, jiraKey: jiraItem.key }), STATUS_TYPES.SUCCESS);
                        } else {
                            console.error('Could not find Jira item or GitLab commit for association.');
                            evt.item.remove();
                            displayStatusMessage(this.elements.statusMessageDiv, getMessage(ERROR_MESSAGES.ASSOCIATION_ERROR), STATUS_TYPES.ERROR);
                        }
                    },
                    onRemove: async (evt) => {
                        const removedItem = evt.item;
                        const gitlabCommitId = removedItem.dataset.itemId;
                        // const targetListSortable = evt.to;

                        console.log(`GitLab commit ${gitlabCommitId} removed from Jira ${jiraItemId}`);

                        const jiraItem = this._findItem(jiraItemId, 'jira');
                        const gitlabCommit = this._findItem(gitlabCommitId, 'gitlab');

                        if (jiraItem && gitlabCommit) {
                            jiraItem.associations = jiraItem.associations.filter(assoc => assoc.id !== gitlabCommitId);
                            if (gitlabCommit.associations) {
                                gitlabCommit.associations = gitlabCommit.associations.filter(assoc => assoc.id !== jiraItemId);
                            }

                            await this._saveCurrentUserModifications();
                            // If item is dropped outside any valid sortable, it might be removed by Sortable.
                            // Re-rendering will place it in unpaired if it has no other associations.
                            this.displaySummaryResults(this.currentSummaryData);
                            displayStatusMessage(this.elements.statusMessageDiv, getMessage(SUCCESS_MESSAGES.ASSOCIATION_REMOVED, { commitId: gitlabCommit.short_id, jiraKey: jiraItem.key }), STATUS_TYPES.INFO);
                        } else {
                            console.error('Could not find Jira item or GitLab commit for de-association.');
                            displayStatusMessage(this.elements.statusMessageDiv, getMessage(ERROR_MESSAGES.ASSOCIATION_ERROR), STATUS_TYPES.ERROR);
                        }
                    }
                });
            }
        });
    }

    _buildCleanApiUrl(baseUrl, endpoint) { // Helper similar to one in apiRequestManager
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${cleanBase}${cleanEndpoint}`;
    }

    _createItemCard(item, itemType, gitlabProjectPath = '') {
        const card = document.createElement('div');
        // Common classes and data attributes
        card.className = `item-card ${itemType}-card ${item.needsAction ? 'needs-action' : ''}`;
        card.dataset.itemId = item.id;
        card.dataset.itemType = itemType;

        let titleHtml = '';
        let associatedCommitsContainerHtml = '';

        if (itemType === 'jira') {
            card.classList.add('jira-dropzone-card'); // Add class for dropzone
            const jiraBase = this.apiBaseUrls.jira || URL_TEMPLATES.JIRA_ISSUE.split('/browse/')[0];
            const issuePath = `/browse/${item.key}`;
            const jiraUrl = this._buildCleanApiUrl(jiraBase, issuePath);
            titleHtml = `<strong><a href="${jiraUrl}" target="_blank">${item.key}</a></strong>: ${item.summary}<br><small>${getMessage('statusLabel')}${item.status}</small>`;

            // Container for associated GitLab commits
            associatedCommitsContainerHtml = '<div class="associated-commits-container">';
            if (item.associations && item.associations.length > 0) {
                // Find the actual commit objects from this.currentSummaryData.allGitLabCommits
                // This part will be enhanced when rendering the actual associated items
                const associatedCommitDetails = item.associations.map(assoc => {
                    const commit = this.currentSummaryData && this.currentSummaryData.allGitLabCommits
                        ? this.currentSummaryData.allGitLabCommits.find(c => c.id === assoc.id)
                        : null;
                    if (commit) {
                        // Render associated commits as draggable items themselves.
                        // These are actual items when inside a Jira card, not clones.
                        return `<div class="item-card gitlab-card gitlab-draggable-card associated-commit-item" data-item-id="${commit.id}" data-item-type="gitlab" draggable="true">
                                  <div class="item-title"><small><strong>${commit.short_id}</strong>: ${commit.title}</small></div>
                                  <button class="remove-association-btn icon-btn" data-commit-id="${commit.id}" data-jira-id="${item.id}" title="${getMessage('removeAssociationTooltip')}">&times;</button>
                                </div>`;
                    }
                    return ''; // Return empty string if commit not found to avoid rendering placeholders
                }).join('');
                associatedCommitsContainerHtml += associatedCommitDetails;
            } else {
                associatedCommitsContainerHtml += `<small>${getMessage('noAssociatedItemsPlaceHolder')}</small>`; // Placeholder text
            }
            associatedCommitsContainerHtml += '</div>';

        } else { // gitlab
            card.classList.add('gitlab-draggable-card'); // Add class for draggable
            card.setAttribute('draggable', 'true'); // Make it draggable
            const gitlabBase = this.apiBaseUrls.gitlab || URL_TEMPLATES.GITLAB_COMMIT.split('/-/commit/')[0].replace('{projectPath}', gitlabProjectPath);
            const commitPath = `/${gitlabProjectPath}/-/commit/${item.id}`;
            const commitUrl = this._buildCleanApiUrl(gitlabBase, commitPath);
            titleHtml = `<strong><a href="${commitUrl}" target="_blank">${item.short_id}</a></strong>: ${item.title}`;
            // GitLab cards don't show "associations" in the same way, they are either in a Jira card or in the GitLab list.
        }

        // Original associations display for Jira (can be removed or kept for debug)
        // let associationsDisplayHtml = '';
        // if (itemType === 'jira') {
        //     associationsDisplayHtml = `<small>${getMessage('associatedItemsLabel')}`;
        //     if (item.associations && item.associations.length > 0) {
        //         associationsDisplayHtml += item.associations.map(assoc => `${assoc.id} (${getMessage('matchTypeLabel')}${assoc.type})`).join(', ');
        //     } else {
        //         associationsDisplayHtml += getMessage('noAssociatedItems');
        //     }
        //     associationsDisplayHtml += '</small>';
        // }


        const actionsHtml = `
            <div class="item-actions">
                <button class="btn btn-sm btn-secondary flag-btn" data-item-id="${item.id}" data-item-type="${itemType}">
                    ${item.needsAction ? getMessage('unflagItemAction') : getMessage('flagItemAction')}
                </button>
                ${itemType === 'jira' && item.associations && item.associations.length > 0 ? // Unmatch button mainly for Jira if it has any associations listed
                `<button class="btn btn-sm btn-warning unmatch-btn" data-item-id="${item.id}" data-item-type="${itemType}">${getMessage('unmatchItemAction')}</button>` :
                (itemType === 'gitlab' && (!item.associations || item.associations.length === 0) ? // Match button for GitLab if it's not associated
                    `<button class="btn btn-sm btn-success match-btn" data-item-id="${item.id}" data-item-type="${itemType}">${getMessage('matchItemAction')}</button>` : '')
            // Match button for Jira could also be added if it has no associations
            }
                 ${itemType === 'jira' && (!item.associations || item.associations.length === 0) ?
                `<button class="btn btn-sm btn-success match-btn" data-item-id="${item.id}" data-item-type="${itemType}">${getMessage('matchItemAction')}</button>` : ''
                }
            </div>
        `;

        card.innerHTML = `
            <div class="item-title">${titleHtml}</div>
            ${itemType === 'jira' ? associatedCommitsContainerHtml : ''}
            ${actionsHtml}
        `;
        // Removed the old general "item-associations" div as it's now handled by associatedCommitsContainerHtml for Jira cards
        return card;
    }

    _setupItemActionListeners() {
        const resultsContainers = [
            this.elements.jiraItemsContainer,
            this.elements.gitlabItemsContainer,
            this.elements.unpairedJiraItemsContainer,
            this.elements.unpairedGitlabItemsContainer
        ];

        resultsContainers.forEach(container => {
            // Remove previous listeners to avoid duplication if this is called multiple times
            // A more robust way would be to store and remove specific listeners, or use AbortController
            // For now, simple re-creation of container content or this should be okay.
            // Or, ensure this is only called once after full clear and re-render.
            // Let's assume clearElementContent in displaySummaryResults handles old nodes and their listeners.

            container.addEventListener('click', (event) => {
                const target = event.target;
                const button = target.closest('button'); // Get the button if click was on icon/text inside
                if (!button) return;

                const itemId = button.dataset.itemId;
                const itemType = button.dataset.itemType;

                if (button.classList.contains('flag-btn')) {
                    this._handleFlagItemClick(itemId, itemType);
                } else if (button.classList.contains('unmatch-btn')) {
                    this._handleUnmatchItemClick(itemId, itemType);
                } else if (button.classList.contains('match-btn')) {
                    this._handleMatchItemClick(itemId, itemType);
                } else if (button.classList.contains('remove-association-btn')) {
                    const commitId = button.dataset.commitId;
                    const jiraId = button.dataset.jiraId;
                    this._handleRemoveAssociationClick(commitId, jiraId);
                }
            });
        });
    }

    _handleRemoveAssociationClick(commitId, jiraId) {
        const jiraItem = this._findItem(jiraId, 'jira');
        const gitlabCommit = this._findItem(commitId, 'gitlab');

        if (jiraItem && gitlabCommit) {
            // Remove association from Jira item
            if (jiraItem.associations) {
                jiraItem.associations = jiraItem.associations.filter(assoc => assoc.id !== commitId);
            }
            // Remove association from GitLab commit
            if (gitlabCommit.associations) {
                gitlabCommit.associations = gitlabCommit.associations.filter(assoc => assoc.id !== jiraId);
            }

            console.log(`Removed association between Jira ${jiraId} and Commit ${commitId} by click.`);
            this._saveCurrentUserModifications();
            this.displaySummaryResults(this.currentSummaryData); // Re-render
            displayStatusMessage(this.elements.statusMessageDiv, getMessage(SUCCESS_MESSAGES.ASSOCIATION_REMOVED, { commitId: gitlabCommit.short_id, jiraKey: jiraItem.key }), STATUS_TYPES.INFO);
        } else {
            console.error(`Could not find Jira item (${jiraId}) or GitLab commit (${commitId}) for unlinking.`);
            displayStatusMessage(this.elements.statusMessageDiv, getMessage(ERROR_MESSAGES.ASSOCIATION_ERROR), STATUS_TYPES.ERROR);
        }
    }

    _findItem(itemId, itemType) {
        if (!this.currentSummaryData) return null;
        const sourceList = itemType === 'jira' ? this.currentSummaryData.allJiraIssues : this.currentSummaryData.allGitLabCommits;
        return sourceList.find(item => item.id === itemId);
    }

    _handleFlagItemClick(itemId, itemType) {
        const item = this._findItem(itemId, itemType);
        if (!item) return;

        item.needsAction = !item.needsAction;
        this._saveCurrentUserModifications(); // Persist change
        // Re-render the whole summary to reflect change; could be optimized to update only the card
        this.displaySummaryResults(this.currentSummaryData);
        console.log(`Flag toggled for ${itemType} ${itemId} to ${item.needsAction}`);
    }

    _handleUnmatchItemClick(itemId, itemType) {
        const item = this._findItem(itemId, itemType);
        if (!item || !item.associations) return;

        const unmatchesToAdd = [];

        item.associations.forEach(assoc => {
            const associatedItemType = itemType === 'jira' ? 'gitlab' : 'jira';
            const associatedItem = this._findItem(assoc.id, associatedItemType);
            if (associatedItem && associatedItem.associations) {
                associatedItem.associations = associatedItem.associations.filter(a => a.id !== itemId);
            }
            // Record the unmatch for persistence
            unmatchesToAdd.push({ item1Id: item.id, item2Id: assoc.id });
        });
        item.associations = [];

        this._addUserUnmatches(unmatchesToAdd); // Persist change (this will call _saveCurrentUserModifications)
        // Re-render
        this.displaySummaryResults(this.currentSummaryData);
        console.log(`Unmatched for ${itemType} ${itemId}`);
    }

    _handleMatchItemClick(itemId, itemType) {
        const clickedItem = this._findItem(itemId, itemType);
        if (!clickedItem) return;

        if (!this.itemToMatch) {
            // This is the first item selected for matching
            this.itemToMatch = { id: itemId, type: itemType };
            // Visually indicate selection (e.g., add a class to the card)
            const card = document.querySelector(`.item-card[data-item-id="${itemId}"][data-item-type="${itemType}"]`);
            if (card) card.classList.add('selected-for-match');
            displayStatusMessage(this.elements.statusMessageDiv, `Selected ${itemType} ${itemId}. Select an item of the other type to match.`, STATUS_TYPES.INFO);
            console.log(`Selected ${itemType} ${itemId} for matching. Waiting for second item.`);
        } else {
            // This is the second item
            if (this.itemToMatch.type === itemType) {
                displayStatusMessage(this.elements.statusMessageDiv, 'Cannot match two items of the same type. Select an item of the different type.', STATUS_TYPES.ERROR);
                // Clear selection
                const prevCard = document.querySelector(`.item-card[data-item-id="${this.itemToMatch.id}"][data-item-type="${this.itemToMatch.type}"]`);
                if (prevCard) prevCard.classList.remove('selected-for-match');
                this.itemToMatch = null;
                return;
            }

            const firstItem = this._findItem(this.itemToMatch.id, this.itemToMatch.type);
            const secondItem = clickedItem; // which is (itemId, itemType)

            if (firstItem && secondItem) {
                // Add association to both items
                if (!firstItem.associations) firstItem.associations = [];
                if (!secondItem.associations) secondItem.associations = [];

                // Prevent duplicate matching if somehow one is already associated
                if (!firstItem.associations.some(a => a.id === secondItem.id)) {
                    firstItem.associations.push({ id: secondItem.id, type: 'manual' });
                }
                if (!secondItem.associations.some(a => a.id === firstItem.id)) {
                    secondItem.associations.push({ id: firstItem.id, type: 'manual' });
                }

                displayStatusMessage(this.elements.statusMessageDiv, `Matched ${firstItem.id} with ${secondItem.id}.`, STATUS_TYPES.SUCCESS);
                console.log(`Manually matched ${firstItem.type} ${firstItem.id} with ${secondItem.type} ${secondItem.id}`);
            }

            // Clear selection state
            const prevCard = document.querySelector(`.item-card[data-item-id="${this.itemToMatch.id}"][data-item-type="${this.itemToMatch.type}"]`);
            if (prevCard) prevCard.classList.remove('selected-for-match');
            this.itemToMatch = null;

            // Re-render
            this.displaySummaryResults(this.currentSummaryData);
            this._addManualMatch(firstItem, secondItem); // Persist change
        }
    }

    // ===== Methods for preparing and saving user modifications =====
    _collectUserModifications() {
        if (!this.currentSummaryData) return { manualMatches: [], userUnmatches: [], flaggedItems: {} };

        const flaggedItems = {};
        this.currentSummaryData.allJiraIssues.forEach(issue => {
            if (issue.needsAction) flaggedItems[issue.id] = true;
        });
        this.currentSummaryData.allGitLabCommits.forEach(commit => {
            if (commit.needsAction) flaggedItems[commit.id] = true;
        });

        const manualMatches = [];
        // Iterate through issues to find manual matches (to avoid duplication)
        this.currentSummaryData.allJiraIssues.forEach(issue => {
            issue.associations.forEach(assoc => {
                // Include both 'manual' (from button clicks) and 'manual-dnd' (from drag and drop)
                if (assoc.type === 'manual' || assoc.type === 'manual-dnd') {
                // Save them with a consistent type, e.g., 'manual', so background processing is simpler
                    manualMatches.push({ jiraId: issue.id, commitId: assoc.id, type: 'manual' });
                }
            });
        });

        // userUnmatches are added via _addUserUnmatches, so we retrieve them from storage or an internal cache if needed.
        // For simplicity, let's assume we reload them if we need the full list, or manage them transiently.
        // For now, _saveCurrentUserModifications will save based on current data.
        // A more robust solution for userUnmatches might involve storing them in this.currentSummaryData.userUnmatches directly.
        // Let's keep it simple: when saving, we save flags and manualMatches derived from current state.
        // UserUnmatches are trickier as they are "negative" information. We'll add them explicitly.

        return {
            manualMatches,
            flaggedItems,
            userUnmatches: this.currentUserUnmatches || [] // Will be populated by _addUserUnmatches
        };
    }

    async _saveCurrentUserModifications() {
        if (!this.currentContextKey) {
            console.error("Cannot save modifications: contextKey is missing.");
            return;
        }
        const modificationsToSave = this._collectUserModifications();
        try {
            await saveUserModifications(this.currentContextKey, modificationsToSave);
            console.log("User modifications saved successfully for context:", this.currentContextKey);
        } catch (error) {
            console.error("Error saving user modifications:", error);
            displayStatusMessage(this.elements.statusMessageDiv, "Error saving your changes.", STATUS_TYPES.ERROR);
        }
    }

    _addManualMatch(item1, item2) {
        // This method assumes item1 and item2 are already updated locally.
        // It just triggers a save.
        // The actual collection of manual matches for saving happens in _collectUserModifications.
        this._saveCurrentUserModifications();
    }

    _addUserUnmatches(unmatchPairs) { // unmatchPairs is an array of {item1Id, item2Id}
        if (!this.currentUserUnmatches) {
            this.currentUserUnmatches = [];
        }
        unmatchPairs.forEach(pair => {
            // Avoid duplicates
            if (!this.currentUserUnmatches.some(u => (u.item1Id === pair.item1Id && u.item2Id === pair.item2Id) || (u.item1Id === pair.item2Id && u.item2Id === pair.item1Id))) {
                this.currentUserUnmatches.push(pair);
            }
        });
        this._saveCurrentUserModifications();
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
