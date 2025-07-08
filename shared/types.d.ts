declare module "shared/constants" {
  export namespace ACTIONS {
    let GENERATE_RELEASE_SUMMARY: string;
    let GET_FIX_VERSIONS: string;
    let TEST: string;
    let TEST_JIRA: string;
    let TEST_GITLAB: string;
  }
  export namespace CONSOLE_MESSAGES {
    let BACKGROUND_SCRIPT_LOADED: string;
    let BACKGROUND_SCRIPT_SETUP_COMPLETE: string;
    let EXTENSION_INSTALLED_UPDATED: string;
    let SIDE_PANEL_OPENED_TAB: string;
    let SIDE_PANEL_OPENED_WINDOW: string;
    let BACKGROUND_RECEIVED_MESSAGE: string;
    let SUCCESSFULLY_USED_JIRA_API: string;
    let JIRA_API_FAILED: string;
    let SAVE_ERROR: string;
    let ERROR_LOADING_SETTINGS: string;
    let SENDING_MESSAGE_TO_BACKGROUND: string;
    let RECEIVED_RESPONSE_FROM_BACKGROUND: string;
    let SIDE_PANEL_SCRIPT_ERROR: string;
    let GET_VERSIONS_ERROR: string;
    let RESPONSE_DATA: string;
    let USING_BASIC_AUTH_FOR_JIRA: string;
    let MAKING_API_REQUEST_TO: string;
    let AUTH_TYPE: string;
    let API_RESPONSE_STATUS: string;
    let API_ERROR_RESPONSE: string;
    let ERROR_FETCHING_FROM: string;
    let FORM_VALUES_SAVED_TO_STORAGE: string;
    let BACKGROUND_MESSAGE_HANDLER_ERROR: string;
    let I18N_MESSAGE_FAILED: string;
    let ERROR_SENDING_MESSAGE_WITH_ACTION: string;
    let THEME_SAVED: string;
    let THEME_LOAD_ERROR: string;
    let THEME_SAVE_ERROR: string;
  }
  export namespace USER_MESSAGES {
    let ALL_FIELDS_REQUIRED: string;
    let FAILED_TO_SAVE_SETTINGS: string;
    let FILL_ALL_INPUT_FIELDS: string;
    let UNEXPECTED_ERROR_OCCURRED: string;
    let ENTER_JIRA_PROJECT_KEY_FIRST: string;
    let ERROR_GETTING_FIX_VERSIONS: string;
    let SETTINGS_SAVED: string;
    let BACKGROUND_SCRIPT_CONNECTION_SUCCESSFUL: string;
    let JIRA_API_CONNECTION_SUCCESSFUL: string;
    let GITLAB_API_CONNECTION_SUCCESSFUL: string;
    let SUMMARY_GENERATED_SUCCESSFULLY: string;
    let FIX_VERSIONS_RETRIEVED_SUCCESSFULLY: string;
    let TESTING_CONNECTION: string;
    let TESTING_JIRA_API_CONNECTION: string;
    let TESTING_GITLAB_API_CONNECTION: string;
    let FETCHING_AND_COMPARING_DATA: string;
    let FETCHING_AVAILABLE_FIX_VERSIONS: string;
    let GITLAB_CONFIG_MISSING: string;
    let GITLAB_AUTH_FAILED: string;
    let GITLAB_FORBIDDEN: string;
    let GITLAB_ENDPOINT_NOT_FOUND: string;
    let JIRA_API_UNREACHABLE: string;
    let GITLAB_API_UNREACHABLE: string;
    let BOTH_APIS_UNREACHABLE: string;
    let USE_MOCK_DATA: string;
    let DISMISS: string;
    let MOCK_DATA_LOADED: string;
    let POPULATE_MOCK_DATA: string;
    let ERROR_PREFIX: string;
    let STATUS_LABEL: string;
    let RELATED_JIRA_LABEL: string;
    let UNKNOWN_SYSTEM_ERROR: string;
    let TEST_FAILED_NOTICE: string;
    let TEST_FAILED_CHECK_CONSOLE_NOTICE: string;
    let RESET_FORM: string;
  }
  export namespace ERROR_MESSAGES {
    export let OPENING_SIDE_PANEL: string;
    export let WINDOW_LEVEL_SIDE_PANEL_FAILED: string;
    export let API_CONFIGURATION_MISSING: string;
    export let MISSING_CONFIGURATION: string;
    export let JIRA_CONFIGURATION_MISSING: string;
    export let ALL_JIRA_ENDPOINTS_FAILED: string;
    import GITLAB_CONFIGURATION_MISSING = USER_MESSAGES.GITLAB_CONFIG_MISSING;
    export { GITLAB_CONFIGURATION_MISSING };
    import GITLAB_AUTHENTICATION_FAILED = USER_MESSAGES.GITLAB_AUTH_FAILED;
    export { GITLAB_AUTHENTICATION_FAILED };
    import GITLAB_ACCESS_FORBIDDEN = USER_MESSAGES.GITLAB_FORBIDDEN;
    export { GITLAB_ACCESS_FORBIDDEN };
    import GITLAB_API_ENDPOINT_NOT_FOUND = USER_MESSAGES.GITLAB_ENDPOINT_NOT_FOUND;
    export { GITLAB_API_ENDPOINT_NOT_FOUND };
    export let ALL_JIRA_API_VERSIONS_FAILED: string;
    export let GITLAB_TAGS_NOT_FOUND: string;
    export let GITLAB_TAGS_ENSURE_EXISTS: string;
    export let FIX_VERSION_NOT_EXISTS: string;
    export let FIX_VERSION_CHECK_NAME: string;
    export let AUTHENTICATION_FAILED: string;
    export let ACCESS_FORBIDDEN: string;
    export let UNKNOWN_ACTION: string;
    export let FAILED_TO_GET_FIX_VERSIONS: string;
    export let UNKNOWN_ERROR: string;
    export let NO_BACKGROUND_SCRIPT_RESPONSE: string;
    export let UNKNOWN_ERROR_OCCURRED: string;
    export let API_CALL_FAILED: string;
  }
  export namespace SUCCESS_MESSAGES {
    let BACKGROUND_SCRIPT_WORKING: string;
    let JIRA_CONNECTION_SUCCESSFUL: string;
    let FOUND_FIX_VERSIONS: string;
  }
  export namespace STATUS_MESSAGES {
    let TEST_FAILED: string;
    let TEST_FAILED_CHECK_CONSOLE: string;
  }
  export namespace BUTTON_TEXT {
    let RE_TEST_CONNECTION: string;
    let RE_TEST_JIRA_API: string;
    let RE_TEST_GITLAB_API: string;
  }
  export namespace JIRA_ENDPOINTS {
    let SERVER_INFO_V2: string;
    let MYSELF_V2: string;
    let SERVER_INFO_V3: string;
    let MYSELF_V3: string;
    let SEARCH: string;
    let PROJECT_VERSIONS: string;
  }
  export namespace GITLAB_ENDPOINTS {
    let PROJECT_DETAILS: string;
    let PROJECT_TAGS: string;
    let PROJECT_COMMITS: string;
    let USER: string;
  }
  export namespace API_VERSIONS {
    let JIRA: string[];
  }
  export namespace AUTH_TYPES {
    let BASIC: string;
    let BEARER: string;
  }
  export namespace HTTP_STATUS {
    let UNAUTHORIZED: string;
    let FORBIDDEN: string;
    let NOT_FOUND: string;
  }
  export namespace PAGINATION {
    let MAX_RESULTS: number;
    let PER_PAGE: number;
  }
  export const JIRA_FIELDS: "key,summary,status,resolution,fixVersions,updated";
  export const JIRA_RESOLVED_STATUSES: string[];
  export namespace CSS_CLASSES {
    let HIDDEN: string;
    let DISCREPANCY_ITEM: string;
    let STATUS_MESSAGE: string;
    let STATUS_ERROR: string;
    let STATUS_SUCCESS: string;
    let STATUS_INFO: string;
    let VISIBLE: string;
    let JIRA_LINK: string;
    let TOAST_CONTAINER: string;
    let TOAST: string;
    let TOAST_ERROR: string;
    let TOAST_SUCCESS: string;
    let TOAST_INFO: string;
    let TOAST_WARNING: string;
    let TOAST_SHOW: string;
    let TOAST_CLOSE: string;
    let FALLBACK_PROMPT: string;
    let FALLBACK_PROMPT_MESSAGE: string;
    let FALLBACK_PROMPT_ACTIONS: string;
  }
  export namespace STATUS_TYPES {
    let ERROR: string;
    let SUCCESS: string;
    let INFO: string;
  }
  export namespace ELEMENT_IDS {
    export let JIRA_BASE_URL: string;
    export let JIRA_PAT: string;
    export let GITLAB_BASE_URL: string;
    export let GITLAB_PAT: string;
    export let SAVE_BUTTON: string;
    export let STATUS: string;
    export let TEST_BTN: string;
    export let TEST_JIRA_BTN: string;
    export let TEST_GITLAB_BTN: string;
    export let THEME_TOGGLE: string;
    export let GENERATE_SUMMARY_BTN: string;
    export let GET_VERSIONS_BTN: string;
    export let LOADING_SPINNER: string;
    let STATUS_MESSAGE_1: string;
    export { STATUS_MESSAGE_1 as STATUS_MESSAGE };
    export let SUMMARY_RESULTS: string;
    export let VERSIONS_DATALIST: string;
    export let JIRA_PROJECT_KEY: string;
    export let JIRA_FIX_VERSION: string;
    export let GITLAB_PROJECT_ID: string;
    export let GITLAB_CURRENT_TAG: string;
    export let GITLAB_PREVIOUS_TAG: string;
    export let JIRA_TICKETS: string;
    export let GITLAB_HISTORY: string;
    export let OPTIONS_LINK: string;
    export let VIEW_DEMO_REPORT_DETAILS: string;
    export let EXAMPLE_RESULTS: string;
    export let JIRA_TICKETS_EXAMPLE: string;
    export let GITLAB_COMMITS_EXAMPLE: string;
    export let GITLAB_TAGS_EXAMPLE: string;
    export let RESET_BTN: string;
  }
  export namespace TIMEOUTS {
    let DEBOUNCE_DELAY: number;
  }
  export namespace URL_TEMPLATES {
    let JIRA_ISSUE: string;
    let GITLAB_COMMIT: string;
  }
  export namespace JQL_TEMPLATES {
    let PROJECT_AND_FIX_VERSION: string;
  }
  export namespace HTTP_HEADERS {
    let CONTENT_TYPE: string;
    let AUTHORIZATION: string;
    let APPLICATION_JSON: string;
  }
  export namespace DOM_ELEMENTS {
    let ANCHOR: string;
    let LIST_ITEM: string;
    let OPTION: string;
    let DIV: string;
  }
  export namespace STORAGE_KEYS {
    export let FORM_DATA: string;
    let JIRA_BASE_URL_1: string;
    export { JIRA_BASE_URL_1 as JIRA_BASE_URL };
    let JIRA_PAT_1: string;
    export { JIRA_PAT_1 as JIRA_PAT };
    let GITLAB_BASE_URL_1: string;
    export { GITLAB_BASE_URL_1 as GITLAB_BASE_URL };
    let GITLAB_PAT_1: string;
    export { GITLAB_PAT_1 as GITLAB_PAT };
    export let THEME_PREFERENCE: string;
  }
  export namespace DEFAULT_VALUES {
    let DATALIST_VALUE_KEY: string;
    let DATALIST_DATA_KEY: string;
    let LINK_TARGET_BLANK: string;
    let URL_PATH_SEPARATOR: string;
    let COLON_SEPARATOR: string;
    let ERROR_TEXT_SUBSTRING_LENGTH: number;
    let ERROR_MESSAGE_SUBSTRING_LENGTH: number;
  }
  export namespace BOOLEAN_CONDITIONS {
    let TRUE: boolean;
    let FALSE: boolean;
  }
  export namespace VALIDATION {
    function isValidString(value: any): boolean;
    function isEmpty(value: any): boolean;
    function hasLength(array: any): boolean;
    function isAborted(controller: any): boolean;
  }
}
declare module "shared/tokens/tokenize" {
  export namespace design {
    let colors: {};
    let element: {};
    let motion: {};
    let fonts: {};
    let sizing: {};
    let depth: {};
    let _meta: {};
    let zindex: {};
    function generateToken(): Promise<{
      map: Map<
        string,
        (() => Promise<any>) | {} | {} | {} | {} | {} | {} | {} | {}
      >;
      obj: {
        colors: {};
        element: {};
        motion: {};
        fonts: {};
        sizing: {};
        depth: {};
        _meta: {};
        zindex: {};
        generateToken(): Promise<any>;
      };
      arr: [
        string,
        (() => Promise<any>) | {} | {} | {} | {} | {} | {} | {} | {},
      ][];
    }>;
  }
  export function generateStylesheet(tokens: any): string;
  export function DS(tokenSegments: any): Promise<void>;
  const _default: Promise<void | {
    map: Map<
      string,
      (() => Promise<any>) | {} | {} | {} | {} | {} | {} | {} | {}
    >;
    obj: {
      colors: {};
      element: {};
      motion: {};
      fonts: {};
      sizing: {};
      depth: {};
      _meta: {};
      zindex: {};
      generateToken(): Promise<any>;
    };
    arr: [
      string,
      (() => Promise<any>) | {} | {} | {} | {} | {} | {} | {} | {},
    ][];
  }>;
  export default _default;
}
declare module "utils/i18n.util" {
  export class InternationalizationHelper {
    static getMessage(messageName: any, substitutions?: null): any;
    static initializeI18n(): void;
    static updateElementText(
      elementId: any,
      messageKey: any,
      substitutions?: null
    ): void;
  }
  export function getMessage(messageName: any, substitutions?: null): any;
  export function initializeI18n(): void;
  export function updateElementText(
    elementId: any,
    messageKey: any,
    substitutions?: null
  ): void;
  const _default: InternationalizationHelper;
  export default _default;
}
declare module "services/notice.service" {
  export class StatusDisplayManager {
    static displayStatusMessage(
      messageElement: any,
      message: any,
      type: any
    ): void;
    static displayStatusWithAutoHide(
      messageElement: any,
      message: any,
      type: any,
      hideAfterMs?: number
    ): void;
  }
  export function displayStatusMessage(
    messageElement: any,
    message: any,
    type: any
  ): void;
  export function displayStatusWithAutoHide(
    messageElement: any,
    message: any,
    type: any,
    hideAfterMs?: number
  ): void;
  const _default: StatusDisplayManager;
  export default _default;
}
declare module "utils/dom.util" {
  export function clearElementContent(element: any): void;
  export function populateDatalistWithOptions(
    datalist: any,
    options: any
  ): void;
  export function createDiscrepancyItemDiv(
    className: any,
    innerHTML: any
  ): HTMLDivElement;
  export function resetForm(elements: any): void;
  namespace _default {
    export { clearElementContent };
    export { populateDatalistWithOptions };
    export { createDiscrepancyItemDiv };
    export { resetForm };
  }
  export default _default;
}
declare module "utils/fetch.util" {
  export class ApiRequestManager {
    static makeAuthenticatedApiRequest(
      url: any,
      token: any,
      tokenType?: string
    ): Promise<any>;
    static buildCleanApiUrl(baseUrl: any, endpoint: any): string;
  }
  export function makeAuthenticatedApiRequest(
    url: any,
    token: any,
    tokenType?: string
  ): Promise<any>;
  export function buildCleanApiUrl(baseUrl: any, endpoint: any): string;
  const _default: ApiRequestManager;
  export default _default;
}
declare module "utils/validation.util" {
  export class FormValidationHelpers {
    static validateRequiredFields(fields: any): {
      isValid: boolean;
      missingFields: string[];
    };
    static extractFormFieldValues(...inputs: any[]): any[];
  }
  export function validateRequiredFields(fields: any): {
    isValid: boolean;
    missingFields: string[];
  };
  export function extractFormFieldValues(...inputs: any[]): any[];
  const _default: FormValidationHelpers;
  export default _default;
}
declare module "services/comms.service" {
  export class ChromeMessageHandler {
    static sendMessageToBackgroundScript(action: any, data?: {}): Promise<any>;
    static handleAsyncBackgroundMessage(
      messageHandler: any
    ): (request: any, sender: any, sendResponse: any) => boolean;
  }
  export function sendMessageToBackgroundScript(
    action: any,
    data?: {}
  ): Promise<any>;
  export function handleAsyncBackgroundMessage(
    messageHandler: any
  ): (request: any, sender: any, sendResponse: any) => boolean;
  const _default: ChromeMessageHandler;
  export default _default;
}
declare module "services/storage.service" {
  export class ChromeStorageManager {
    static saveFormDataToStorage(formData: any): Promise<any>;
    static loadFormDataFromStorage(): Promise<any>;
    static saveApiConfigurationToStorage(
      jiraBaseUrl: any,
      jiraPat: any,
      gitlabBaseUrl: any,
      gitlabPat: any
    ): Promise<any>;
    static loadApiConfigurationFromStorage(): Promise<any>;
  }
  export function saveFormDataToStorage(formData: any): Promise<any>;
  export function loadFormDataFromStorage(): Promise<any>;
  export function saveApiConfigurationToStorage(
    jiraBaseUrl: any,
    jiraPat: any,
    gitlabBaseUrl: any,
    gitlabPat: any
  ): Promise<any>;
  export function loadApiConfigurationFromStorage(): Promise<any>;
  export function saveThemePreference(theme: any): Promise<void>;
  export function loadThemePreference(): Promise<any>;
  const _default: ChromeStorageManager;
  export default _default;
}
declare module "services/bg.service" {
  export class BackgroundService {
    setupEventListeners(): void;
    setupMessageHandlers(): void;
    messageHandlers:
      | Map<
          string,
          (data: any) => Promise<{
            success: boolean;
            summary: {
              totalPlannedIssues: any;
              totalIssuesInCode: number;
              plannedNotInCode: never[];
              inCodeNotPlanned: never[];
              statusMismatches: never[];
              matchedIssues: never[];
            };
          }>
        >
      | undefined;
    handleActionClick(tab: any): Promise<void>;
    handleMessages(): (request: any, sender: any, sendResponse: any) => boolean;
    handleInstalled(): void;
    testHandler(): Promise<{
      success: boolean;
      message: string;
    }>;
    generateReleaseSummaryHandler(data: any): Promise<{
      success: boolean;
      summary: {
        totalPlannedIssues: any;
        totalIssuesInCode: number;
        plannedNotInCode: never[];
        inCodeNotPlanned: never[];
        statusMismatches: never[];
        matchedIssues: never[];
      };
    }>;
    getFixVersionsHandler(data: any): Promise<{
      success: boolean;
      message: string;
      data: any;
    }>;
    testJiraConnectionHandler(): Promise<{
      success: boolean;
      message: string;
      data: any;
    }>;
    testGitLabConnectionHandler(): Promise<{
      success: boolean;
      message: any;
      data: any;
    }>;
  }
  const _default: BackgroundService;
  export default _default;
  export class JiraService {
    static extractJiraIssueKeysFromText(text: any): any[];
    static fetchIssuesForProjectAndVersion(
      jiraBaseUrl: any,
      jiraPat: any,
      projectKey: any,
      fixVersion: any
    ): Promise<any[]>;
    static fetchFixVersionsForProject(
      jiraBaseUrl: any,
      jiraPat: any,
      projectKey: any
    ): Promise<any>;
    static testConnection(
      jiraBaseUrl: any,
      jiraPat: any
    ): Promise<{
      success: boolean;
      message: string;
      data: any;
    }>;
  }
  export const Jira: JiraService;
  export class GitLabService {
    static fetchProjectDetails(
      gitlabBaseUrl: any,
      gitlabPat: any,
      projectId: any
    ): Promise<any>;
    static fetchTagsForProject(
      gitlabBaseUrl: any,
      gitlabPat: any,
      projectId: any
    ): Promise<any>;
    static fetchCommitsBetweenTagsGenerator(
      gitlabBaseUrl: any,
      gitlabPat: any,
      projectId: any,
      currentTag: any,
      previousTag: any
    ): AsyncGenerator<any, void, unknown>;
    static fetchCommitsBetweenTags(
      gitlabBaseUrl: any,
      gitlabPat: any,
      projectId: any,
      currentTag: any,
      previousTag: any
    ): Promise<any[]>;
    static testConnection(
      gitlabBaseUrl: any,
      gitlabPat: any
    ): Promise<{
      success: boolean;
      message: any;
      data: any;
    }>;
  }
  export const GitLab: GitLabService;
  export class AnalysisService {
    static analyzeIssueAndCommitCorrelation(
      jiraIssues: any,
      gitlabCommits: any,
      plannedIssueKeys: any,
      gitlabProjectPath: any
    ): {
      totalPlannedIssues: any;
      totalIssuesInCode: number;
      plannedNotInCode: never[];
      inCodeNotPlanned: never[];
      statusMismatches: never[];
      matchedIssues: never[];
    };
  }
  export const Analysis: AnalysisService;
}
declare module "services/toast.service" {
  export class ToastNotificationService {
    toastQueue: any[];
    maxToasts: number;
    createToastContainer(): void;
    showToast(
      message: string,
      type?: string,
      duration?: number,
      showCloseButton?: boolean
    ): string;
    createToastElement(
      id: any,
      message: any,
      type: any,
      showCloseButton: any
    ): HTMLDivElement;
    addToastToContainer(toast: any): any;
    hideToast(toastId: any): void;
    generateToastId(): string;
    showError(message: any, duration?: number): string;
    showSuccess(message: any, duration?: number): string;
    showInfo(message: any, duration?: number): string;
    showWarning(message: any, duration?: number): string;
    clearAllToasts(): void;
  }
  export const toast: ToastNotificationService;
  export default toast;
}
declare module "services/fallback.service" {
  export class FallbackDataService {
    mockDataAvailable: boolean;
    showFallbackPrompt(
      apiType: string,
      onUseMockData: Function,
      container: HTMLElement
    ): string;
    createFallbackPromptElement(
      id: any,
      apiType: any,
      onUseMockData: any
    ): HTMLDivElement;
    getFallbackMessage(apiType: any): any;
    hideFallbackPrompt(promptId: any): void;
    removeFallbackPrompts(container: any): void;
    loadMockData(dataType: string): Promise<Object>;
    populateMockData(elements: Object): Promise<{
      jiraData: Object;
      gitlabCommits: Object;
      gitlabTags: Object;
    }>;
    populateJiraTickets(container: any, jiraData: any): void;
    populateGitlabCommits(container: any, commitsData: any): void;
    populateVersions(datalist: any, versionsData: any): void;
    checkApiAvailability(
      jiraUrl: string,
      gitlabUrl: string,
      jiraPat: string,
      gitlabPat: string
    ): Promise<Object>;
  }
  export const fallbackService: FallbackDataService;
  export default fallbackService;
}
declare module "services/api/options.api" {
  export class SettingsManager {
    initializeI18n(): void;
    setupElementReferences(): void;
    elements:
      | {
          jiraBaseUrlInput: HTMLElement | null;
          jiraPatInput: HTMLElement | null;
          gitlabBaseUrlInput: HTMLElement | null;
          gitlabPatInput: HTMLElement | null;
          saveButton: HTMLElement | null;
          statusDiv: HTMLElement | null;
          themeToggle: HTMLElement | null;
          testBtn: HTMLElement | null;
          testJiraBtn: HTMLElement | null;
          testGitLabBtn: HTMLElement | null;
        }
      | undefined;
    setupEventListeners(): void;
    eventHandlers: Map<string, (event: any) => Promise<void>> | undefined;
    applyTheme(theme: any): void;
    handleSave(): Promise<void>;
    handleThemeChange(event: any): Promise<void>;
    handleTestGeneral(): Promise<void>;
    handleTestJira(): Promise<void>;
    handleTestGitLab(): Promise<void>;
    testConnectionWithFeedback(
      action: any,
      loadingMessage: any,
      successMessage: any,
      button: any,
      successButtonText: any
    ): Promise<void>;
    showFallbackOption(action: any): void;
    loadSavedSettingsIntoForm(): Promise<void>;
  }
  const _default: SettingsManager;
  export default _default;
}
declare module "services/api/sidepanel.api" {
  export class ExtensionUIManager {
    loadAndApplyTheme(): Promise<void>;
    initializeI18n(): void;
    setupElementReferences(): void;
    elements:
      | {
          generateSummaryBtn: HTMLElement | null;
          getVersionsBtn: HTMLElement | null;
          loadingSpinner: HTMLElement | null;
          statusMessageDiv: HTMLElement | null;
          summaryResultsDiv: HTMLElement | null;
          versionsDatalist: HTMLElement | null;
          jiraProjectKeyInput: HTMLElement | null;
          jiraFixVersionInput: HTMLElement | null;
          gitlabProjectIdInput: HTMLElement | null;
          gitlabCurrentTagInput: HTMLElement | null;
          gitlabPreviousTagInput: HTMLElement | null;
          jiraTicketsDiv: HTMLElement | null;
          gitlabHistoryDiv: HTMLElement | null;
          optionsLink: HTMLElement | null;
          viewDemoReportDetails: HTMLElement | null;
          exampleResultsDiv: HTMLElement | null;
          jiraTicketsExampleDiv: HTMLElement | null;
          gitlabCommitsExampleDiv: HTMLElement | null;
          gitlabTagsExampleDiv: HTMLElement | null;
          resetBtn: HTMLElement | null;
        }
      | undefined;
    fetchController: AbortController | null | undefined;
    debounceTimeout: NodeJS.Timeout | null | undefined;
    setupEventListeners(): void;
    eventHandlers: Map<string, (e: any) => void> | undefined;
    handleOptionsClick(e: any): void;
    handleDemoReportToggle(event: any): Promise<void>;
    populateExampleReport(): Promise<void>;
    extractJiraKeysFromCommit(commitTitle: any): any;
    getDemoJiraData(): Promise<any>;
    getDemoGitlabTagData(): Promise<any>;
    getDemoGitlabCommitData(): Promise<any>;
    populateExampleJiraTickets(jiraData: any): void;
    populateExampleGitlabCommits(commitData: any): void;
    populateExampleGitlabTags(tagData: any): void;
    handleGenerateSummary(): Promise<void>;
    showFallbackOption(): void;
    handleVersionInput(): void;
    handleGetVersions(): void;
    fetchAvailableFixVersions(): Promise<void>;
    showJiraFallbackOption(): void;
    displaySummaryResults(summary: any): void;
    connections: Map<any, any> | undefined;
    saveFormValuesToStorage(): Promise<void>;
    loadFormValuesFromStorage(): Promise<void>;
    showLoadingStateAndClearResults(): void;
    abortPreviousFetchIfExists(): void;
    setupNewFetchController(): void;
    handleReset(): void;
    createArrowMarker(svg: any): void;
    createStoryCard(issue: any, index: any): HTMLDivElement;
    createCommitCard(commit: any, index: any, projectPath: any): HTMLDivElement;
    populateGitlabReleases(summary: any, container: any): void;
    formatReleaseNotes(description: any): any;
    initializeDragAndDrop(): void;
    handleDragStart(e: any): void;
    handleDragEnd(e: any): void;
    handleDragOver(e: any): void;
    handleDragEnter(e: any): void;
    handleDragLeave(e: any): void;
    handleDrop(e: any): void;
    updateConnectionDisplay(storyId: any, commitId: any): void;
    drawConnectionLines(): void;
    createConnectionLine(storyCard: any, commitCard: any): SVGLineElement;
    addConnectionLineInteractions(): void;
    removeConnection(storyId: any, commitId: any): void;
    clearAllConnections(): void;
  }
  const _default: ExtensionUIManager;
  export default _default;
}
