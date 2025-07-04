import { displayStatusWithAutoHide } from './statusDisplayManager.js';
import { saveApiConfigurationToStorage, loadApiConfigurationFromStorage } from './chromeStorageManager.js';
import { sendMessageToBackgroundScript } from './chromeMessageHandler.js';
import { validateRequiredFields } from '../helpers/formValidationHelpers.js';
import { initializeI18n, getMessage } from '../helpers/internationalizationHelper.js';
import {
    ELEMENT_IDS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    STATUS_MESSAGES,
    USER_MESSAGES,
    BUTTON_TEXT,
    ACTIONS,
    STATUS_TYPES,
    CONSOLE_MESSAGES,
    STORAGE_KEYS
} from '../shared/presetConstants.js';

class SettingsManager {
    constructor() {
        this.initializeI18n();
        this.setupElementReferences();
        this.setupEventListeners();
        this.loadSavedSettingsIntoForm();
        this.loadConsoleTestSetting();
    }

    initializeI18n() {
        initializeI18n();
    }

    setupElementReferences() {
        this.elements = {
            jiraBaseUrlInput: document.getElementById(ELEMENT_IDS.JIRA_BASE_URL),
            jiraPatInput: document.getElementById(ELEMENT_IDS.JIRA_PAT),
            gitlabBaseUrlInput: document.getElementById(ELEMENT_IDS.GITLAB_BASE_URL),
            gitlabPatInput: document.getElementById(ELEMENT_IDS.GITLAB_PAT),
            saveButton: document.getElementById(ELEMENT_IDS.SAVE_BUTTON),
            statusDiv: document.getElementById(ELEMENT_IDS.STATUS),
            testBtn: document.getElementById(ELEMENT_IDS.TEST_BTN),
            testJiraBtn: document.getElementById(ELEMENT_IDS.TEST_JIRA_BTN),
            testGitLabBtn: document.getElementById(ELEMENT_IDS.TEST_GITLAB_BTN),
            enableConsoleTestsCheckbox: document.getElementById(ELEMENT_IDS.ENABLE_CONSOLE_TESTS)
        };
    }

    setupEventListeners() {
        const { saveButton, testBtn, testJiraBtn, testGitLabBtn } = this.elements;

        this.eventHandlers = new Map([
            ['save', this.handleSave.bind(this)],
            ['testGeneral', this.handleTestGeneral.bind(this)],
            ['testJira', this.handleTestJira.bind(this)],
            ['testGitLab', this.handleTestGitLab.bind(this)]
        ]);

        saveButton.addEventListener('click', this.eventHandlers.get('save'));
        testBtn.addEventListener('click', this.eventHandlers.get('testGeneral'));
        testJiraBtn.addEventListener('click', this.eventHandlers.get('testJira'));
        testGitLabBtn.addEventListener('click', this.eventHandlers.get('testGitLab'));
        this.elements.enableConsoleTestsCheckbox.addEventListener('change', this.handleSaveConsoleTestSetting.bind(this));
    }

    async handleSave() {
        const { jiraBaseUrlInput, jiraPatInput, gitlabBaseUrlInput, gitlabPatInput, statusDiv } = this.elements;

        const [jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat] = [
            jiraBaseUrlInput.value.trim(),
            jiraPatInput.value.trim(),
            gitlabBaseUrlInput.value.trim(),
            gitlabPatInput.value.trim()
        ];

        const validation = validateRequiredFields({
            jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat // Note: console test setting is not a "required" field for this validation
        });

        if (!validation.isValid) {
            displayStatusWithAutoHide(statusDiv, getMessage(USER_MESSAGES.ALL_FIELDS_REQUIRED), STATUS_TYPES.ERROR);
            return;
        }

        try {
            await saveApiConfigurationToStorage(jiraBaseUrl, jiraPat, gitlabBaseUrl, gitlabPat);
            // Console test setting is saved separately by its own handler, but we can give a general success message here.
            displayStatusWithAutoHide(statusDiv, getMessage(USER_MESSAGES.SETTINGS_SAVED), STATUS_TYPES.SUCCESS);
        } catch (error) {
            displayStatusWithAutoHide(statusDiv, getMessage(USER_MESSAGES.FAILED_TO_SAVE_SETTINGS), STATUS_TYPES.ERROR);
            console.error(CONSOLE_MESSAGES.SAVE_ERROR, error);
        }
    }

    async handleSaveConsoleTestSetting() {
        const { enableConsoleTestsCheckbox, statusDiv } = this.elements;
        const enabled = enableConsoleTestsCheckbox.checked;
        try {
            await chrome.storage.local.set({ [STORAGE_KEYS.ENABLE_CONSOLE_TESTS]: enabled });
            // Optionally, display a specific message for this change, or rely on the general "Save Settings" button
            // displayStatusWithAutoHide(statusDiv, `Console tests ${enabled ? 'enabled' : 'disabled'}.`, STATUS_TYPES.INFO);
        } catch (error) {
            displayStatusWithAutoHide(statusDiv, getMessage(USER_MESSAGES.FAILED_TO_SAVE_SETTINGS), STATUS_TYPES.ERROR);
            console.error(CONSOLE_MESSAGES.SAVE_ERROR, `Error saving console test setting: ${error}`);
        }
    }

    async loadConsoleTestSetting() {
        const { enableConsoleTestsCheckbox } = this.elements;
        try {
            const result = await chrome.storage.local.get(STORAGE_KEYS.ENABLE_CONSOLE_TESTS);
            enableConsoleTestsCheckbox.checked = !!result[STORAGE_KEYS.ENABLE_CONSOLE_TESTS];
        } catch (error) {
            console.error(CONSOLE_MESSAGES.ERROR_LOADING_SETTINGS, `Error loading console test setting: ${error}`);
        }
    }

    static async getConsoleTestSetting() {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEYS.ENABLE_CONSOLE_TESTS);
            return !!result[STORAGE_KEYS.ENABLE_CONSOLE_TESTS];
        } catch (error) {
            console.error(CONSOLE_MESSAGES.ERROR_LOADING_SETTINGS, `Error retrieving console test setting: ${error}`);
            return false; // Default to false in case of error
        }
    }

    async handleTestGeneral() {
        const { testBtn } = this.elements;
        await this.testConnectionWithFeedback(
            ACTIONS.TEST,
            getMessage(USER_MESSAGES.TESTING_CONNECTION),
            getMessage(USER_MESSAGES.BACKGROUND_SCRIPT_CONNECTION_SUCCESSFUL),
            testBtn,
            getMessage(BUTTON_TEXT.RE_TEST_CONNECTION)
        );
    }

    async handleTestJira() {
        const { testJiraBtn } = this.elements;
        await this.testConnectionWithFeedback(
            ACTIONS.TEST_JIRA,
            getMessage(USER_MESSAGES.TESTING_JIRA_API_CONNECTION),
            getMessage(USER_MESSAGES.JIRA_API_CONNECTION_SUCCESSFUL),
            testJiraBtn,
            getMessage(BUTTON_TEXT.RE_TEST_JIRA_API)
        );
    }

    async handleTestGitLab() {
        const { testGitLabBtn } = this.elements;
        await this.testConnectionWithFeedback(
            ACTIONS.TEST_GITLAB,
            getMessage(USER_MESSAGES.TESTING_GITLAB_API_CONNECTION),
            getMessage(USER_MESSAGES.GITLAB_API_CONNECTION_SUCCESSFUL),
            testGitLabBtn,
            getMessage(BUTTON_TEXT.RE_TEST_GITLAB_API)
        );
    }

    async testConnectionWithFeedback(action, loadingMessage, successMessage, button, successButtonText) {
        const { statusDiv } = this.elements;

        displayStatusWithAutoHide(statusDiv, loadingMessage, STATUS_TYPES.INFO, 0);

        try {
            const response = await sendMessageToBackgroundScript(action);

            const resultHandler = {
                true: () => {
                    displayStatusWithAutoHide(statusDiv, successMessage, STATUS_TYPES.SUCCESS);
                    button.textContent = successButtonText;
                    if (response.data) {
                        console.log(`${action} ${CONSOLE_MESSAGES.RESPONSE_DATA}`, response.data);
                    }
                },
                false: () => {
                    displayStatusWithAutoHide(statusDiv, `${getMessage('testFailedNotice', action)} ${response.message || getMessage('unknownSystemError')}`, STATUS_TYPES.ERROR, 10000);
                }
            }[Boolean(response.success)];

            resultHandler();
        } catch (error) {
            displayStatusWithAutoHide(statusDiv, getMessage('testFailedCheckConsoleNotice', action), STATUS_TYPES.ERROR);
            console.error(`${action} error:`, error);
        }
    }

    async loadSavedSettingsIntoForm() {
        const { jiraBaseUrlInput, jiraPatInput, gitlabBaseUrlInput, gitlabPatInput } = this.elements;

        try {
            const config = await loadApiConfigurationFromStorage();

            const configFields = new Map([
                ['jiraBaseUrl', jiraBaseUrlInput],
                ['jiraPat', jiraPatInput],
                ['gitlabBaseUrl', gitlabBaseUrlInput],
                ['gitlabPat', gitlabPatInput]
            ]);

            for (const [configKey, inputElement] of configFields) {
                inputElement.value = config[configKey] || '';
            }
        } catch (error) {
            console.error(CONSOLE_MESSAGES.ERROR_LOADING_SETTINGS, error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});

export const getConsoleTestSetting = SettingsManager.getConsoleTestSetting;
