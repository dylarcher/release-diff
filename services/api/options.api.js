import { displayStatusWithAutoHide } from '../notice.service.js';
import { saveApiConfigurationToStorage, loadApiConfigurationFromStorage, saveThemePreference, loadThemePreference } from '../storage.service.js';
import { sendMessageToBackgroundScript } from '../comms.service.js';
import { validateRequiredFields } from '../../utils/validation.util.js';
import { initializeI18n, getMessage } from '../../utils/i18n.util.js';
import { toast } from '../toast.service.js';
import { fallbackService } from '../fallback.service.js';
import {
  ELEMENT_IDS,
    USER_MESSAGES,
    BUTTON_TEXT,
    ACTIONS,
    STATUS_TYPES,
    CONSOLE_MESSAGES
} from '../../shared/constants.js';
import { DS } from '../../shared/design/tokens.js';

export class SettingsManager {
    constructor() {
        this.initializeI18n();
        this.setupElementReferences();
        this.setupEventListeners();
        this.loadSavedSettingsIntoForm();
        (async () => await DS(['colors', 'depth', 'element', 'fonts', 'layers', 'motion', 'sizing']))();
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
            themeToggle: document.getElementById(ELEMENT_IDS.THEME_TOGGLE)
        };
    }

    setupEventListeners() {
        const { saveButton, themeToggle } = this.elements;

        this.eventHandlers = new Map([
            ['save', this.handleSave.bind(this)],
            ['themeChange', this.handleThemeChange.bind(this)]
        ]);

        saveButton.addEventListener('click', this.eventHandlers.get('save'));

        if (themeToggle) {
            themeToggle.addEventListener('change', this.eventHandlers.get('themeChange'));
        }
    }

    applyTheme(theme) {
        document.body.dataset.theme = theme;
        const isDark = theme === 'dark';
        this.elements.themeToggle.checked = isDark;
        this.elements.themeToggle.setAttribute('aria-checked', isDark.toString());
    }

    async handleSave() {
        const { jiraBaseUrlInput, jiraPatInput, gitlabBaseUrlInput, gitlabPatInput, statusDiv } = this.elements;

        const requiredFields = [
            { element: jiraBaseUrlInput, name: getMessage('jiraUrl') },
            { element: jiraPatInput, name: getMessage('jiraPat') },
            { element: gitlabBaseUrlInput, name: getMessage('gitlabUrl') },
            { element: gitlabPatInput, name: getMessage('gitlabPat') }
        ];

        if (!validateRequiredFields(requiredFields, statusDiv)) {
            return;
        }

        const config = {
            jiraBaseUrl: jiraBaseUrlInput.value,
            jiraPat: jiraPatInput.value,
            gitlabBaseUrl: gitlabBaseUrlInput.value,
            gitlabPat: gitlabPatInput.value
        };

        try {
            await saveApiConfigurationToStorage(config);
            displayStatusWithAutoHide(statusDiv, getMessage(USER_MESSAGES.SETTINGS_SAVED_SUCCESSFULLY), STATUS_TYPES.SUCCESS);
        } catch (error) {
            displayStatusWithAutoHide(statusDiv, getMessage(USER_MESSAGES.ERROR_SAVING_SETTINGS), STATUS_TYPES.ERROR);
            console.error(CONSOLE_MESSAGES.ERROR_SAVING_SETTINGS, error);
        }
    }

    async handleThemeChange(event) {
        const newTheme = event.target.checked ? 'dark' : 'light';
        this.applyTheme(newTheme);
        try {
            await saveThemePreference(newTheme);
        } catch (error) {
            console.error(CONSOLE_MESSAGES.THEME_SAVE_ERROR, error);
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
        toast.showInfo(loadingMessage, 2000);

        try {
            const response = await sendMessageToBackgroundScript(action);

            const resultHandler = {
                true: () => {
                    displayStatusWithAutoHide(statusDiv, successMessage, STATUS_TYPES.SUCCESS);
                    toast.showSuccess(successMessage);
                    button.textContent = successButtonText;
                    if (response.data) {
                        console.log(`${action} ${CONSOLE_MESSAGES.RESPONSE_DATA}`, response.data);
                    }
                },
                false: () => {
                    const errorMessage = `${getMessage('testFailedNotice', action)} ${response.message || getMessage('unknownSystemError')}`;
                    displayStatusWithAutoHide(statusDiv, errorMessage, STATUS_TYPES.ERROR, 10000);
                    toast.showError(errorMessage, 8000);

                    // Check if this is a connection failure that might benefit from fallback
                    if (response.message && (response.message.includes('unreachable') || response.message.includes('timeout') || response.message.includes('network'))) {
                        this.showFallbackOption(action);
                    }
                }
            }[Boolean(response.success)];

            resultHandler();
        } catch (error) {
            const errorMessage = getMessage('testFailedCheckConsoleNotice', action);
            displayStatusWithAutoHide(statusDiv, errorMessage, STATUS_TYPES.ERROR);
            toast.showError(errorMessage, 8000);
            console.error(`${action} error:`, error);

            // Show fallback option for connection errors
            this.showFallbackOption(action);
        }
    }

    showFallbackOption(action) {
        const { statusDiv } = this.elements;
        const apiType = action.includes('JIRA') ? 'jira' : action.includes('GITLAB') ? 'gitlab' : 'both';

        fallbackService.showFallbackPrompt(
            apiType,
            () => {
                toast.showInfo(getMessage('mockDataLoaded'));
                console.log('Mock data fallback selected for', apiType);
            },
            statusDiv.parentElement
        );
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
            } let savedTheme;
            try {
                savedTheme = await loadThemePreference();
            } catch (error) {
                savedTheme = null;
            }

            if (savedTheme) {
                this.applyTheme(savedTheme);
            } else {
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const defaultTheme = prefersDark ? 'dark' : 'light';
                this.applyTheme(defaultTheme);
                try {
                    await saveThemePreference(defaultTheme);
                } catch (error) {
                }
            }
        } catch (error) {
            console.error(CONSOLE_MESSAGES.ERROR_LOADING_SETTINGS, error);
            this.applyTheme('light');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});

export default new SettingsManager();
