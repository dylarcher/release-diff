export const ACTIONS = {
  GENERATE_RELEASE_SUMMARY: "generateReleaseSummary",
  GET_FIX_VERSIONS: "getFixVersions",
  TEST: "test",
  TEST_JIRA: "testJira",
  TEST_GITLAB: "testGitLab",
};

export const CONSOLE_MESSAGES = {
  BACKGROUND_SCRIPT_LOADED: "Background script loaded successfully",
  BACKGROUND_SCRIPT_SETUP_COMPLETE: "Background script setup complete",
  EXTENSION_INSTALLED_UPDATED:
    "Jira-GitLab Release Overview extension installed/updated.",
  SIDE_PANEL_OPENED_TAB: "Side panel opened for tab:",
  SIDE_PANEL_OPENED_WINDOW: "Side panel opened for window:",
  BACKGROUND_RECEIVED_MESSAGE: "Background script received message:",
  SUCCESSFULLY_USED_JIRA_API: "Successfully used Jira API version",
  JIRA_API_FAILED: "Jira API version",
  SAVE_ERROR: "Save error:",
  ERROR_LOADING_SETTINGS: "Error loading settings:",
  SENDING_MESSAGE_TO_BACKGROUND: "Sending message to background script...",
  RECEIVED_RESPONSE_FROM_BACKGROUND:
    "Received response from background script:",
  SIDE_PANEL_SCRIPT_ERROR: "Side panel script error:",
  GET_VERSIONS_ERROR: "Get versions error:",
  RESPONSE_DATA: "response data:",
  USING_BASIC_AUTH_FOR_JIRA: "Using Basic authentication for Jira",
  MAKING_API_REQUEST_TO: "Making API request to:",
  AUTH_TYPE: "Auth type:",
  API_RESPONSE_STATUS: "API response status:",
  API_ERROR_RESPONSE: "API Error Response:",
  ERROR_FETCHING_FROM: "Error fetching from",
  FORM_VALUES_SAVED_TO_STORAGE: "Form values saved to storage",
  BACKGROUND_MESSAGE_HANDLER_ERROR: "Background message handler error:",
  I18N_MESSAGE_FAILED: "Failed to get i18n message for",
  ERROR_SENDING_MESSAGE_WITH_ACTION: "Error sending message with action",
  THEME_SAVED: "Theme preference saved:",
  THEME_LOAD_ERROR: "Error loading theme preference:",
  THEME_SAVE_ERROR: "Error saving theme preference:",
};

export const USER_MESSAGES = {
  ALL_FIELDS_REQUIRED: "allFieldsRequired",
  FAILED_TO_SAVE_SETTINGS: "failedToSaveSettings",
  FILL_ALL_INPUT_FIELDS: "fillAllInputFields",
  UNEXPECTED_ERROR_OCCURRED: "unexpectedErrorOccurred",
  ENTER_JIRA_PROJECT_KEY_FIRST: "enterJiraProjectKeyFirst",
  ERROR_GETTING_FIX_VERSIONS: "errorGettingFixVersions",

  SETTINGS_SAVED: "settingsSaved",
  BACKGROUND_SCRIPT_CONNECTION_SUCCESSFUL:
    "backgroundScriptConnectionSuccessful",
  JIRA_API_CONNECTION_SUCCESSFUL: "jiraApiConnectionSuccessful",
  GITLAB_API_CONNECTION_SUCCESSFUL: "gitlabApiConnectionSuccessful",
  SUMMARY_GENERATED_SUCCESSFULLY: "summaryGeneratedSuccessfully",
  FIX_VERSIONS_RETRIEVED_SUCCESSFULLY: "fixVersionsRetrievedSuccessfully",

  TESTING_CONNECTION: "testingConnection",
  TESTING_JIRA_API_CONNECTION: "testingJiraApiConnection",
  TESTING_GITLAB_API_CONNECTION: "testingGitlabApiConnection",
  FETCHING_AND_COMPARING_DATA: "fetchingAndComparingData",
  FETCHING_AVAILABLE_FIX_VERSIONS: "fetchingAvailableFixVersions",

  GITLAB_CONFIG_MISSING: "gitlabConfigMissing",
  GITLAB_AUTH_FAILED: "gitlabAuthFailed",
  GITLAB_FORBIDDEN: "gitlabForbidden",
  GITLAB_ENDPOINT_NOT_FOUND: "gitlabEndpointNotFound",

  JIRA_API_UNREACHABLE: "jiraApiUnreachable",
  GITLAB_API_UNREACHABLE: "gitlabApiUnreachable",
  BOTH_APIS_UNREACHABLE: "bothApisUnreachable",
  USE_MOCK_DATA: "useMockData",
  DISMISS: "dismiss",
  MOCK_DATA_LOADED: "mockDataLoaded",
  POPULATE_MOCK_DATA: "populateMockData",

  ERROR_PREFIX: "errorPrefix",
  STATUS_LABEL: "statusLabel",
  RELATED_JIRA_LABEL: "relatedJiraLabel",
  UNKNOWN_SYSTEM_ERROR: "unknownSystemError",
  TEST_FAILED_NOTICE: "testFailedNotice",
  TEST_FAILED_CHECK_CONSOLE_NOTICE: "testFailedCheckConsoleNotice",
  RESET_FORM: "resetForm",
};

export const ERROR_MESSAGES = {
  OPENING_SIDE_PANEL: "Error opening side panel:",
  WINDOW_LEVEL_SIDE_PANEL_FAILED: "Window-level side panel open also failed:",
  API_CONFIGURATION_MISSING:
    "API configuration missing. Please go to options page to set up.",
  MISSING_CONFIGURATION:
    "Missing configuration. Please ensure Jira URL, PAT, and project key are provided.",
  JIRA_CONFIGURATION_MISSING:
    "Jira configuration missing. Please set up your Jira URL and PAT in the options page.",
  ALL_JIRA_ENDPOINTS_FAILED:
    "All Jira test endpoints failed. This might be a Jira Server/Data Center instance with different API paths.",
  GITLAB_CONFIGURATION_MISSING: USER_MESSAGES.GITLAB_CONFIG_MISSING,
  GITLAB_AUTHENTICATION_FAILED: USER_MESSAGES.GITLAB_AUTH_FAILED,
  GITLAB_ACCESS_FORBIDDEN: USER_MESSAGES.GITLAB_FORBIDDEN,
  GITLAB_API_ENDPOINT_NOT_FOUND: USER_MESSAGES.GITLAB_ENDPOINT_NOT_FOUND,
  ALL_JIRA_API_VERSIONS_FAILED: "All Jira API versions failed. Last error:",
  GITLAB_TAGS_NOT_FOUND: "Could not find GitLab tags:",
  GITLAB_TAGS_ENSURE_EXISTS: "Ensure they exist and are correctly named.",
  FIX_VERSION_NOT_EXISTS: "does not exist for the field 'fixVersion'",
  FIX_VERSION_CHECK_NAME:
    'Fix version "{version}" does not exist in project "{project}". Please check the exact name in your Jira project settings.',
  AUTHENTICATION_FAILED:
    "Authentication failed. Please check your Jira PAT and ensure it has the correct permissions.",
  ACCESS_FORBIDDEN:
    "Access forbidden. Your PAT may not have sufficient permissions to access Jira.",
  UNKNOWN_ACTION: "Unknown action",
  FAILED_TO_GET_FIX_VERSIONS: "Failed to get fix versions:",
  UNKNOWN_ERROR: "Unknown error",
  NO_BACKGROUND_SCRIPT_RESPONSE:
    "No response from background script. Please check extension setup.",
  UNKNOWN_ERROR_OCCURRED: "Unknown error occurred",
  API_CALL_FAILED: "API call failed:",
};

export const SUCCESS_MESSAGES = {
  BACKGROUND_SCRIPT_WORKING: "Background script is working!",
  JIRA_CONNECTION_SUCCESSFUL: "✓ Jira connection successful! Using endpoint:",
  FOUND_FIX_VERSIONS: "Found {count} fix versions for project {project}",
};

export const STATUS_MESSAGES = {
  TEST_FAILED: "✗ {action} failed:",
  TEST_FAILED_CHECK_CONSOLE: "✗ {action} failed - check console",
};

export const BUTTON_TEXT = {
  RE_TEST_CONNECTION: "retestConnection",
  RE_TEST_JIRA_API: "retestJiraApi",
  RE_TEST_GITLAB_API: "retestGitlabApi",
};

export const JIRA_ENDPOINTS = {
  SERVER_INFO_V2: "rest/api/2/serverInfo",
  MYSELF_V2: "rest/api/2/myself",
  SERVER_INFO_V3: "rest/api/3/serverInfo",
  MYSELF_V3: "rest/api/3/myself",
  SEARCH: "rest/api/{version}/search",
  PROJECT_VERSIONS: "rest/api/{version}/project/{projectKey}/versions",
};

export const GITLAB_ENDPOINTS = {
  PROJECT_DETAILS: "api/v4/projects/{projectId}",
  PROJECT_TAGS: "api/v4/projects/{projectId}/repository/tags",
  PROJECT_COMMITS: "api/v4/projects/{projectId}/repository/commits",
  USER: "api/v4/user",
};

export const API_VERSIONS = {
  JIRA: ["2", "3"],
};

export const AUTH_TYPES = {
  BASIC: "Basic",
  BEARER: "Bearer",
};

export const HTTP_STATUS = {
  UNAUTHORIZED: "401",
  FORBIDDEN: "403",
  NOT_FOUND: "404",
};

export const PAGINATION = {
  MAX_RESULTS: 50,
  PER_PAGE: 100,
};

export const JIRA_FIELDS = "key,summary,status,resolution,fixVersions,updated";

export const JIRA_RESOLVED_STATUSES = ["Done", "Resolved", "Closed"];

export const CSS_CLASSES = {
  HIDDEN: "hidden",
  DISCREPANCY_ITEM: "discrepancy-item",
  STATUS_MESSAGE: "status-message",
  STATUS_ERROR: "status-error",
  STATUS_SUCCESS: "status-success",
  STATUS_INFO: "status-info",
  VISIBLE: "visible",
  JIRA_LINK: "jira-link",
  TOAST_CONTAINER: "toast-container",
  TOAST: "toast",
  TOAST_ERROR: "toast-error",
  TOAST_SUCCESS: "toast-success",
  TOAST_INFO: "toast-info",
  TOAST_WARNING: "toast-warning",
  TOAST_SHOW: "show",
  TOAST_CLOSE: "toast-close",
  FALLBACK_PROMPT: "fallback-prompt",
  FALLBACK_PROMPT_MESSAGE: "fallback-prompt-message",
  FALLBACK_PROMPT_ACTIONS: "fallback-prompt-actions",
};

export const STATUS_TYPES = {
  ERROR: "error",
  SUCCESS: "success",
  INFO: "info",
};

export const ELEMENT_IDS = {
  JIRA_BASE_URL: "jiraBaseUrl",
  JIRA_PAT: "jiraPat",
  GITLAB_BASE_URL: "gitlabBaseUrl",
  GITLAB_PAT: "gitlabPat",
  SAVE_BUTTON: "saveButton",
  STATUS: "status",
  TEST_BTN: "testBtn",
  TEST_JIRA_BTN: "testJiraBtn",
  TEST_GITLAB_BTN: "testGitLabBtn",
  THEME_TOGGLE: "themeToggle",
  GENERATE_SUMMARY_BTN: "generateSummaryBtn",
  GET_VERSIONS_BTN: "getVersionsBtn",
  LOADING_SPINNER: "loading",
  STATUS_MESSAGE: "statusMessage",
  SUMMARY_RESULTS: "summaryResults",
  VERSIONS_DATALIST: "versionsDatalist",
  JIRA_PROJECT_KEY: "jiraProjectKey",
  JIRA_FIX_VERSION: "jiraFixVersion",
  GITLAB_PROJECT_ID: "gitlabProjectId",
  GITLAB_CURRENT_TAG: "gitlabCurrentTag",
  GITLAB_PREVIOUS_TAG: "gitlabPreviousTag",
  JIRA_TICKETS: "jira-tickets",
  GITLAB_HISTORY: "gitlab-history",
  OPTIONS_LINK: "optionsLink",

  VIEW_DEMO_REPORT_DETAILS: "viewDemoReportDetails",
  EXAMPLE_RESULTS: "exampleResults",
  JIRA_TICKETS_EXAMPLE: "jira-tickets-example",
  GITLAB_COMMITS_EXAMPLE: "gitlab-commits-example",
  GITLAB_TAGS_EXAMPLE: "gitlab-tags-example",
  RESET_BTN: "resetBtn",
};

export const TIMEOUTS = {
  DEBOUNCE_DELAY: 300,
};

export const URL_TEMPLATES = {
  JIRA_ISSUE: "https://jira.dell.com/browse/{key}",
  GITLAB_COMMIT: "https://gitlab.dell.com/{projectPath}/-/commit/{commitId}",
};

export const JQL_TEMPLATES = {
  PROJECT_AND_FIX_VERSION:
    'project = "{projectKey}" AND fixVersion = "{fixVersion}"',
};

export const HTTP_HEADERS = {
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  APPLICATION_JSON: "application/json",
};

export const DOM_ELEMENTS = {
  ANCHOR: "a",
  LIST_ITEM: "li",
  OPTION: "option",
  DIV: "div",
};

export const STORAGE_KEYS = {
  FORM_DATA: "formData",
  JIRA_BASE_URL: "jiraBaseUrl",
  JIRA_PAT: "jiraPat",
  GITLAB_BASE_URL: "gitlabBaseUrl",
  GITLAB_PAT: "gitlabPat",
  THEME_PREFERENCE: "themePreference",
};

export const DEFAULT_VALUES = {
  DATALIST_VALUE_KEY: "name",
  DATALIST_DATA_KEY: "id",
  LINK_TARGET_BLANK: "_blank",
  URL_PATH_SEPARATOR: "/",
  COLON_SEPARATOR: ":",
  ERROR_TEXT_SUBSTRING_LENGTH: 500,
  ERROR_MESSAGE_SUBSTRING_LENGTH: 200,
};

export const BOOLEAN_CONDITIONS = {
  TRUE: true,
  FALSE: false,
};

export const VALIDATION = {
  isValidString: (value) => Boolean(value && value.trim()),
  isEmpty: (value) => !Boolean(value && value.trim()),
  hasLength: (array) => Boolean(array && array.length > 0),
  isAborted: (controller) => Boolean(controller && controller.signal.aborted),
};
