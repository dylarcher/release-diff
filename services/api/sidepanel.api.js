import { displayStatusMessage } from "../notice.service.js";
import {
  saveFormDataToStorage,
  loadFormDataFromStorage,
  loadThemePreference,
} from "../storage.service.js";
import { sendMessageToBackgroundScript } from "../comms.service.js";
import {
  clearElementContent,
  populateDatalistWithOptions,
  createDiscrepancyItemDiv,
  resetForm,
} from "../../utils/dom.util.js";
import {
  validateRequiredFields,
  extractFormFieldValues,
} from "../../utils/validation.util.js";
import { initializeI18n, getMessage } from "../../utils/i18n.util.js";
import { toast } from "../toast.service.js";
import { fallbackService } from "../fallback.service.js";
import {
  ELEMENT_IDS,
  ERROR_MESSAGES,
  USER_MESSAGES,
  ACTIONS,
  STATUS_TYPES,
  CSS_CLASSES,
  CONSOLE_MESSAGES,
  TIMEOUTS,
  URL_TEMPLATES,
  ELEMENT_IDS as EXT_ELEMENT_IDS,
} from "../../shared/constants.js";
import { DS } from "../../shared/tokens/tokenize.js";

export class ExtensionUIManager {
  constructor() {
    this.initializeI18n();
    this.setupElementReferences();
    this.setupEventListeners();
    this.loadFormValuesFromStorage();
    this.loadAndApplyTheme();
    (async () =>
      await DS([
        "colors",
        "depth",
        "element",
        "fonts",
        "layers",
        "motion",
        "sizing",
      ]))();
  }

  async loadAndApplyTheme() {
    try {
      const theme = await loadThemePreference();
      if (theme) {
        document.body.dataset.theme = theme;
      } else {
        const prefersDark =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.dataset.theme = prefersDark ? "dark" : "light";
      }
    } catch (error) {
      console.error(CONSOLE_MESSAGES.THEME_LOAD_ERROR, error);
      document.body.dataset.theme = "light";
    }
  }

  initializeI18n() {
    initializeI18n();
  }

  setupElementReferences() {
    this.elements = {
      generateSummaryBtn: document.getElementById(
        ELEMENT_IDS.GENERATE_SUMMARY_BTN
      ),
      getVersionsBtn: document.getElementById(ELEMENT_IDS.GET_VERSIONS_BTN),
      loadingSpinner: document.getElementById(ELEMENT_IDS.LOADING_SPINNER),
      statusMessageDiv: document.getElementById(ELEMENT_IDS.STATUS_MESSAGE),
      summaryResultsDiv: document.getElementById(ELEMENT_IDS.SUMMARY_RESULTS),
      versionsDatalist: document.getElementById(ELEMENT_IDS.VERSIONS_DATALIST),
      jiraProjectKeyInput: document.getElementById(
        ELEMENT_IDS.JIRA_PROJECT_KEY
      ),
      jiraFixVersionInput: document.getElementById(
        ELEMENT_IDS.JIRA_FIX_VERSION
      ),
      gitlabProjectIdInput: document.getElementById(
        ELEMENT_IDS.GITLAB_PROJECT_ID
      ),
      gitlabCurrentTagInput: document.getElementById(
        ELEMENT_IDS.GITLAB_CURRENT_TAG
      ),
      gitlabPreviousTagInput: document.getElementById(
        ELEMENT_IDS.GITLAB_PREVIOUS_TAG
      ),
      jiraTicketsDiv: document.getElementById(ELEMENT_IDS.JIRA_TICKETS),
      gitlabHistoryDiv: document.getElementById(ELEMENT_IDS.GITLAB_HISTORY),
      optionsLink: document.getElementById(ELEMENT_IDS.OPTIONS_LINK),
      viewDemoReportDetails: document.getElementById(
        ELEMENT_IDS.VIEW_DEMO_REPORT_DETAILS
      ),
      exampleResultsDiv: document.getElementById(ELEMENT_IDS.EXAMPLE_RESULTS),
      jiraTicketsExampleDiv: document.getElementById(
        ELEMENT_IDS.JIRA_TICKETS_EXAMPLE
      ),
      gitlabCommitsExampleDiv: document.getElementById(
        ELEMENT_IDS.GITLAB_COMMITS_EXAMPLE
      ),
      gitlabTagsExampleDiv: document.getElementById(
        ELEMENT_IDS.GITLAB_TAGS_EXAMPLE
      ),
      resetBtn: document.getElementById(ELEMENT_IDS.RESET_BTN),
    };

    this.fetchController = null;
    this.debounceTimeout = null;
  }

  setupEventListeners() {
    const {
      optionsLink,
      generateSummaryBtn,
      jiraFixVersionInput,
      getVersionsBtn,
    } = this.elements;

    this.eventHandlers = new Map([
      ["optionsClick", this.handleOptionsClick.bind(this)],
      ["generateSummary", this.handleGenerateSummary.bind(this)],
      ["versionInput", this.handleVersionInput.bind(this)],
      ["getVersions", this.handleGetVersions.bind(this)],
      ["viewDemoReportToggle", this.handleDemoReportToggle.bind(this)],
      ["reset", this.handleReset.bind(this)],
    ]);

    optionsLink.addEventListener(
      "click",
      this.eventHandlers.get("optionsClick")
    );
    generateSummaryBtn.addEventListener(
      "click",
      this.eventHandlers.get("generateSummary")
    );
    jiraFixVersionInput.addEventListener(
      "input",
      this.eventHandlers.get("versionInput")
    );
    getVersionsBtn.addEventListener(
      "click",
      this.eventHandlers.get("getVersions")
    );
    this.elements.viewDemoReportDetails.addEventListener(
      "toggle",
      this.eventHandlers.get("viewDemoReportToggle")
    );
    this.elements.resetBtn.addEventListener(
      "click",
      this.eventHandlers.get("reset")
    );

    // Add resize handler for connection lines
    window.addEventListener("resize", () => {
      if (this.connections && this.connections.size > 0) {
        setTimeout(() => this.drawConnectionLines(), 100);
      }
    });
  }

  handleOptionsClick(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  }

  async handleDemoReportToggle(event) {
    if (event.target.open) {
      console.info("View Demo Report details opened");
      this.elements.jiraProjectKeyInput.value = "DDSTM";
      this.elements.gitlabProjectIdInput.value = "82150";
      this.elements.jiraFixVersionInput.value = "57550";
      this.elements.gitlabCurrentTagInput.value = "v2.25.5";
      this.elements.gitlabPreviousTagInput.value = "v2.25.4";
      await this.saveFormValuesToStorage();
      this.elements.exampleResultsDiv.classList.remove(CSS_CLASSES.HIDDEN);

      // Show the demo report using the new interactive structure
      this.elements.summaryResultsDiv.classList.remove(CSS_CLASSES.HIDDEN);
      await this.populateExampleReport();
    } else {
      console.info("View Demo Report details closed");
      // Hide the summary results when demo is closed
      this.elements.summaryResultsDiv.classList.add(CSS_CLASSES.HIDDEN);
    }
  }

  async populateExampleReport() {
    try {
      const [jiraData, gitlabCommitData, gitlabTagData] = await Promise.all([
        await this.getDemoJiraData(),
        await this.getDemoGitlabCommitData(),
        await this.getDemoGitlabTagData(),
      ]);

      // Transform Jira data
      const transformedJiraIssues = (jiraData.issues || []).map((issue) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
      }));

      // Transform GitLab commit data
      const transformedCommits = (gitlabCommitData || []).map((commit) => ({
        id: commit.id,
        short_id: commit.short_id,
        title: commit.title,
        jira_keys: this.extractJiraKeysFromCommit(commit.title),
      }));

      // Transform GitLab releases
      const transformedReleases = (gitlabTagData || []).map((tag) => ({
        name: tag.name,
        description: tag.release?.description || "",
      }));

      const transformedSummary = {
        allJiraIssues: transformedJiraIssues,
        allGitLabCommits: transformedCommits,
        gitlabReleases: transformedReleases,
        gitlabProjectPath:
          "dao/dell-digital-design/design-language-system/systems/dds-angular",
      };

      // Use the same display method as the real summary
      this.displaySummaryResults(transformedSummary);
    } catch (error) {
      console.error("Error populating example report sections:", error);
      const errorMessage = `<p>${getMessage("errorLoadingData")}</p>`;
      if (this.elements.jiraTicketsExampleDiv)
        this.elements.jiraTicketsExampleDiv.innerHTML = errorMessage;
      if (this.elements.gitlabCommitsExampleDiv)
        this.elements.gitlabCommitsExampleDiv.innerHTML = errorMessage;
      if (this.elements.gitlabTagsExampleDiv)
        this.elements.gitlabTagsExampleDiv.innerHTML = errorMessage;
    }
  }

  extractJiraKeysFromCommit(commitTitle) {
    const jiraKeyPattern = /([A-Z]+-\d+)/g;
    const matches = commitTitle.match(jiraKeyPattern);
    return matches || [];
  }
  async getDemoJiraData() {
    try {
      const response = await fetch(
        chrome.runtime.getURL("shared/data/releases.json")
      );
      return await response.json();
    } catch (error) {
      console.error("Failed to load Jira release data:", error);
      return {};
    }
  }

  async getDemoGitlabTagData() {
    try {
      const response = await fetch(
        chrome.runtime.getURL("shared/data/versions.json")
      );
      return await response.json();
    } catch (error) {
      console.error("Failed to load GitLab tags data:", error);
      return [];
    }
  }

  async getDemoGitlabCommitData() {
    try {
      const response = await fetch(
        chrome.runtime.getURL("shared/data/commits.json")
      );
      return await response.json();
    } catch (error) {
      console.error("Failed to load GitLab commits data:", error);
      return [];
    }
  }

  populateExampleJiraTickets(jiraData) {
    clearElementContent(this.elements.jiraTicketsExampleDiv);
    if (jiraData && jiraData.issues && this.elements.jiraTicketsExampleDiv) {
      const ul = document.createElement("ul");
      ul.className = "list-style-none p-0";
      jiraData.issues.forEach((issue) => {
        const li = document.createElement("li");
        li.className = CSS_CLASSES.DISCREPANCY_ITEM;
        const issueHtml = `<strong><a href="${URL_TEMPLATES.JIRA_ISSUE.replace("{key}", issue.key)}" target="_blank" rel="noopener noreferrer">${issue.key}</a></strong>: ${issue.fields.summary} <br> <small>${getMessage("statusLabel")}${issue.fields.status.name}</small>`;
        li.innerHTML = issueHtml;
        ul.appendChild(li);
      });
      this.elements.jiraTicketsExampleDiv.appendChild(ul);
    } else if (this.elements.jiraTicketsExampleDiv) {
      this.elements.jiraTicketsExampleDiv.innerHTML = `<p>${getMessage("noJiraTicketsFound")}</p>`;
    }
  }

  populateExampleGitlabCommits(commitData) {
    clearElementContent(this.elements.gitlabCommitsExampleDiv);
    if (
      commitData &&
      commitData.length > 0 &&
      this.elements.gitlabCommitsExampleDiv
    ) {
      const ul = document.createElement("ul");
      ul.className = "list-style-none p-0";
      const gitlabProjectPath =
        "dao/dell-digital-design/design-language-system/systems/dds-angular";
      commitData.forEach((commit) => {
        const li = document.createElement("li");
        li.className = CSS_CLASSES.DISCREPANCY_ITEM;
        let commitHtml = `<strong><a href="${URL_TEMPLATES.GITLAB_COMMIT.replace("{projectPath}", gitlabProjectPath).replace("{commitId}", commit.id)}" target="_blank" rel="noopener noreferrer">${commit.short_id}</a></strong>: ${commit.title}`;
        li.innerHTML = commitHtml;
        ul.appendChild(li);
      });
      this.elements.gitlabCommitsExampleDiv.appendChild(ul);
    } else if (this.elements.gitlabCommitsExampleDiv) {
      this.elements.gitlabCommitsExampleDiv.innerHTML = `<p>${getMessage("noGitLabCommitsFound")}</p>`;
    }
  }

  populateExampleGitlabTags(tagData) {
    clearElementContent(this.elements.gitlabTagsExampleDiv);
    if (tagData && tagData.length > 0 && this.elements.gitlabTagsExampleDiv) {
      const ul = document.createElement("ul");
      ul.className = "list-style-none p-0";
      tagData.forEach((tag) => {
        const li = document.createElement("li");
        li.className = CSS_CLASSES.DISCREPANCY_ITEM;
        let tagHtml = `<strong>${tag.name}</strong>`;
        if (tag.release && tag.release.description) {
          const releaseDescription = tag.release.description
            .replace(/\n/g, "<br>")
            .replace(/### (.*?)\s/g, "<strong>$1</strong><br>")
            .replace(
              /\* \*\*(.*?)\*\* (.*?)\((.*?)\)/g,
              '<li><strong>$1</strong> $2 (<a href="$3" target="_blank" rel="noopener noreferrer">link</a>)</li>'
            )
            .replace(
              /\* (.*?)\((.*?)\)/g,
              '<li>$1 (<a href="$2" target="_blank" rel="noopener noreferrer">link</a>)</li>'
            );
          tagHtml += `<br><small>Release Notes:</small><div class="release-notes">${releaseDescription}</div>`;
        }
        li.innerHTML = tagHtml;
        ul.appendChild(li);
      });
      this.elements.gitlabTagsExampleDiv.appendChild(ul);
    } else if (this.elements.gitlabTagsExampleDiv) {
      this.elements.gitlabTagsExampleDiv.innerHTML = `<p>${getMessage("noGitLabTagsFound")}</p>`;
    }
  }

  async handleGenerateSummary() {
    const {
      jiraProjectKeyInput,
      jiraFixVersionInput,
      gitlabProjectIdInput,
      gitlabCurrentTagInput,
      gitlabPreviousTagInput,
      statusMessageDiv,
    } = this.elements;

    const [
      jiraProjectKey,
      jiraFixVersion,
      gitlabProjectId,
      gitlabCurrentTag,
      gitlabPreviousTag,
    ] = extractFormFieldValues(
      jiraProjectKeyInput,
      jiraFixVersionInput,
      gitlabProjectIdInput,
      gitlabCurrentTagInput,
      gitlabPreviousTagInput
    );

    const validation = validateRequiredFields({
      jiraProjectKey,
      jiraFixVersion,
      gitlabProjectId,
      gitlabCurrentTag,
      gitlabPreviousTag,
    });

    if (!validation.isValid) {
      const errorMessage = getMessage(USER_MESSAGES.FILL_ALL_INPUT_FIELDS);
      displayStatusMessage(statusMessageDiv, errorMessage, STATUS_TYPES.ERROR);
      toast.showError(errorMessage);
      return;
    }

    await this.saveFormValuesToStorage();
    this.showLoadingStateAndClearResults();

    const loadingMessage = getMessage(
      USER_MESSAGES.FETCHING_AND_COMPARING_DATA
    );
    displayStatusMessage(statusMessageDiv, loadingMessage, STATUS_TYPES.INFO);
    toast.showInfo(loadingMessage, 3000);

    try {
      console.info(CONSOLE_MESSAGES.SENDING_MESSAGE_TO_BACKGROUND);

      const response = await sendMessageToBackgroundScript(
        ACTIONS.GENERATE_RELEASE_SUMMARY,
        {
          jiraProjectKey,
          jiraFixVersion,
          gitlabProjectId,
          gitlabCurrentTag,
          gitlabPreviousTag,
        }
      );

      console.info(
        CONSOLE_MESSAGES.RECEIVED_RESPONSE_FROM_BACKGROUND,
        response
      );
      this.elements.loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);

      const messageHandler = {
        true: () => {
          const successMessage = getMessage(
            USER_MESSAGES.SUMMARY_GENERATED_SUCCESSFULLY
          );
          displayStatusMessage(
            statusMessageDiv,
            successMessage,
            STATUS_TYPES.SUCCESS
          );
          toast.showSuccess(successMessage);
          this.displaySummaryResults(response.summary);
        },
        false: () => {
          const errorMessage = `${getMessage("errorPrefix")}${response.message || getMessage("unknownSystemError")}`;
          displayStatusMessage(
            statusMessageDiv,
            errorMessage,
            STATUS_TYPES.ERROR
          );
          toast.showError(errorMessage, 8000);

          // Check if this is a connection failure that might benefit from fallback
          if (
            response.message &&
            (response.message.includes("unreachable") ||
              response.message.includes("timeout") ||
              response.message.includes("network"))
          ) {
            this.showFallbackOption();
          }
        },
      }[Boolean(response.success)];

      messageHandler();
    } catch (error) {
      this.elements.loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);
      const errorMessage = getMessage(USER_MESSAGES.UNEXPECTED_ERROR_OCCURRED);
      displayStatusMessage(statusMessageDiv, errorMessage, STATUS_TYPES.ERROR);
      toast.showError(errorMessage, 8000);
      console.error(CONSOLE_MESSAGES.SIDE_PANEL_SCRIPT_ERROR, error);

      // Show fallback option for connection errors
      this.showFallbackOption();
    }
  }

  showFallbackOption() {
    const { statusMessageDiv } = this.elements;

    fallbackService.showFallbackPrompt(
      "both",
      async () => {
        try {
          await fallbackService.populateMockData(this.elements);
          toast.showSuccess(getMessage("mockDataLoaded"));
        } catch (error) {
          toast.showError(`Failed to load mock data: ${error.message}`);
        }
      },
      statusMessageDiv.parentElement
    );
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
    const {
      jiraProjectKeyInput,
      statusMessageDiv,
      loadingSpinner,
      versionsDatalist,
    } = this.elements;
    const jiraProjectKey = jiraProjectKeyInput.value.trim();

    if (!jiraProjectKey) {
      const errorMessage = getMessage(
        USER_MESSAGES.ENTER_JIRA_PROJECT_KEY_FIRST
      );
      displayStatusMessage(statusMessageDiv, errorMessage, STATUS_TYPES.ERROR);
      toast.showError(errorMessage);
      return;
    }

    this.abortPreviousFetchIfExists();
    this.setupNewFetchController();

    const loadingMessage = getMessage(
      USER_MESSAGES.FETCHING_AVAILABLE_FIX_VERSIONS
    );
    displayStatusMessage(statusMessageDiv, loadingMessage, STATUS_TYPES.INFO);
    toast.showInfo(loadingMessage, 3000);
    loadingSpinner.classList.remove(CSS_CLASSES.HIDDEN);

    try {
      const response = await sendMessageToBackgroundScript(
        ACTIONS.GET_FIX_VERSIONS,
        { jiraProjectKey }
      );

      if (this.fetchController.signal.aborted) return;

      const resultHandler = {
        true: () => {
          const successMessage = getMessage(
            USER_MESSAGES.FIX_VERSIONS_RETRIEVED_SUCCESSFULLY
          );
          displayStatusMessage(
            statusMessageDiv,
            successMessage,
            STATUS_TYPES.SUCCESS
          );
          toast.showSuccess(successMessage);
          populateDatalistWithOptions(versionsDatalist, response.data);
        },
        false: () => {
          const errorMessage = `${ERROR_MESSAGES.FAILED_TO_GET_FIX_VERSIONS} ${response.message || ERROR_MESSAGES.UNKNOWN_ERROR}`;
          displayStatusMessage(
            statusMessageDiv,
            errorMessage,
            STATUS_TYPES.ERROR
          );
          toast.showError(errorMessage, 8000);
          clearElementContent(versionsDatalist);

          // Check if this is a connection failure that might benefit from fallback
          if (
            response.message &&
            (response.message.includes("unreachable") ||
              response.message.includes("timeout") ||
              response.message.includes("network"))
          ) {
            this.showJiraFallbackOption();
          }
        },
      }[Boolean(response.success)];

      resultHandler();
    } catch (error) {
      if (error.name !== "AbortError") {
        const errorMessage = getMessage(
          USER_MESSAGES.ERROR_GETTING_FIX_VERSIONS
        );
        displayStatusMessage(
          statusMessageDiv,
          errorMessage,
          STATUS_TYPES.ERROR
        );
        toast.showError(errorMessage, 8000);
        console.error(CONSOLE_MESSAGES.GET_VERSIONS_ERROR, error);
        clearElementContent(versionsDatalist);

        // Show fallback option for connection errors
        this.showJiraFallbackOption();
      }
    } finally {
      if (!this.fetchController.signal.aborted) {
        loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);
      }
    }
  }

  showJiraFallbackOption() {
    const { statusMessageDiv } = this.elements;

    fallbackService.showFallbackPrompt(
      "jira",
      async () => {
        try {
          const versionsData = await fallbackService.loadMockData("versions");
          fallbackService.populateVersions(
            this.elements.versionsDatalist,
            versionsData
          );
          toast.showSuccess("Mock Jira versions loaded successfully");
        } catch (error) {
          toast.showError(`Failed to load mock versions: ${error.message}`);
        }
      },
      statusMessageDiv.parentElement
    );
  }

  displaySummaryResults(summary) {
    const { summaryResultsDiv } = this.elements;
    const jiraTicketsDiv = document.getElementById("jira-tickets");
    const gitlabCommitsDiv = document.getElementById("gitlab-commits");
    const gitlabReleasesDiv = document.getElementById("gitlab-releases");
    const connectionLinesDiv = document.getElementById("connection-lines");

    summaryResultsDiv.classList.remove(CSS_CLASSES.HIDDEN);
    clearElementContent(jiraTicketsDiv);
    clearElementContent(gitlabCommitsDiv);
    clearElementContent(gitlabReleasesDiv);
    clearElementContent(connectionLinesDiv);

    // Create SVG arrow marker
    this.createArrowMarker(connectionLinesDiv);

    // Store connections for line drawing
    this.connections = new Map();

    // Populate Jira tickets as draggable story cards
    summary.allJiraIssues.forEach((issue, index) => {
      const storyCard = this.createStoryCard(issue, index);
      jiraTicketsDiv.appendChild(storyCard);
    });

    // Populate GitLab commits as draggable commit cards
    summary.allGitLabCommits.forEach((commit, index) => {
      const commitCard = this.createCommitCard(
        commit,
        index,
        summary.gitlabProjectPath
      );
      gitlabCommitsDiv.appendChild(commitCard);
    });

    // Populate GitLab releases in collapsible details
    this.populateGitlabReleases(summary, gitlabReleasesDiv);

    // Initialize drag and drop functionality
    this.initializeDragAndDrop();

    // Draw initial connection lines
    this.drawConnectionLines();

    // Add interaction handlers for connection lines
    this.addConnectionLineInteractions();
  }

  async saveFormValuesToStorage() {
    const {
      versionsDatalist,
      jiraProjectKeyInput,
      jiraFixVersionInput,
      gitlabProjectIdInput,
      gitlabCurrentTagInput,
      gitlabPreviousTagInput,
    } = this.elements;

    const selectedVersion = Array.from(versionsDatalist.options).find(
      (option) => option.value === jiraFixVersionInput.value
    );
    const versionId = selectedVersion
      ? selectedVersion.dataset.id
      : jiraFixVersionInput.value;

    const formData = {
      jiraProjectKey: jiraProjectKeyInput.value.trim(),
      jiraFixVersion: versionId,
      gitlabProjectId: gitlabProjectIdInput.value.trim(),
      gitlabCurrentTag: gitlabCurrentTagInput.value.trim(),
      gitlabPreviousTag: gitlabPreviousTagInput.value.trim(),
    };

    await saveFormDataToStorage(formData);
  }

  async loadFormValuesFromStorage() {
    const {
      jiraProjectKeyInput,
      jiraFixVersionInput,
      gitlabProjectIdInput,
      gitlabCurrentTagInput,
      gitlabPreviousTagInput,
    } = this.elements;

    const data = await loadFormDataFromStorage();

    const formFieldUpdaters = {
      jiraProjectKey: (value) => {
        if (value) jiraProjectKeyInput.value = value;
      },
      jiraFixVersion: (value) => {
        if (value) jiraFixVersionInput.value = value;
      },
      gitlabProjectId: (value) => {
        if (value) gitlabProjectIdInput.value = value;
      },
      gitlabCurrentTag: (value) => {
        if (value) gitlabCurrentTagInput.value = value;
      },
      gitlabPreviousTag: (value) => {
        if (value) gitlabPreviousTagInput.value = value;
      },
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

  createArrowMarker(svg) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "marker"
    );
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");

    const polygon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon"
    );
    polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
    polygon.setAttribute("fill", "var(--colors-palette-modern-blue-medium)");

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
  }

  createStoryCard(issue, index) {
    const storyCard = document.createElement("div");
    storyCard.className = "story-card";
    storyCard.dataset.storyId = issue.key;
    storyCard.dataset.storyIndex = index;

    const storyKey = document.createElement("div");
    storyKey.className = "story-key";
    storyKey.innerHTML = `<a href="${URL_TEMPLATES.JIRA_ISSUE.replace("{key}", issue.key)}" target="_blank" rel="noopener noreferrer">${issue.key}</a>`;

    const storySummary = document.createElement("div");
    storySummary.className = "story-summary";
    storySummary.textContent = issue.summary;

    const storyStatus = document.createElement("div");
    storyStatus.className = "story-status";
    storyStatus.textContent = `${getMessage("statusLabel")}${issue.status}`;

    const relatedCommits = document.createElement("div");
    relatedCommits.className = "related-commits";
    relatedCommits.style.display = "none";

    storyCard.appendChild(storyKey);
    storyCard.appendChild(storySummary);
    storyCard.appendChild(storyStatus);
    storyCard.appendChild(relatedCommits);

    return storyCard;
  }

  createCommitCard(commit, index, projectPath) {
    const commitCard = document.createElement("div");
    commitCard.className = "commit-card";
    commitCard.draggable = true;
    commitCard.dataset.commitId = commit.id;
    commitCard.dataset.commitIndex = index;

    const commitId = document.createElement("div");
    commitId.className = "commit-id";
    commitId.innerHTML = `<a href="${URL_TEMPLATES.GITLAB_COMMIT.replace("{projectPath}", projectPath).replace("{commitId}", commit.id)}" target="_blank" rel="noopener noreferrer">${commit.short_id}</a>`;

    const commitMessage = document.createElement("div");
    commitMessage.className = "commit-message";
    commitMessage.textContent = commit.title;

    commitCard.appendChild(commitId);
    commitCard.appendChild(commitMessage);

    // Add related stories if they exist
    if (commit.jira_keys && commit.jira_keys.length > 0) {
      const relatedStories = document.createElement("div");
      relatedStories.className = "related-stories";
      relatedStories.innerHTML = `<strong>${getMessage("relatedJiraLabel") || "Related Stories:"}</strong>`;

      commit.jira_keys.forEach((key) => {
        const storyTag = document.createElement("span");
        storyTag.className = "story-tag";
        storyTag.textContent = key;
        relatedStories.appendChild(storyTag);
      });

      commitCard.appendChild(relatedStories);
    }

    return commitCard;
  }

  populateGitlabReleases(summary, container) {
    // This would need to be populated with actual release data
    // For now, we'll create a placeholder structure
    const releases = summary.gitlabReleases || [];

    releases.forEach((release, index) => {
      const releaseItem = document.createElement("div");
      releaseItem.className = "release-item";

      const details = document.createElement("details");
      if (index === 0) {
        details.open = true; // First release open by default
      }

      const summary = document.createElement("summary");
      summary.textContent = release.name || `Release ${index + 1}`;

      const releaseContent = document.createElement("div");
      releaseContent.className = "release-content";

      if (release.description) {
        const releaseNotes = document.createElement("div");
        releaseNotes.className = "release-notes";
        releaseNotes.innerHTML = this.formatReleaseNotes(release.description);
        releaseContent.appendChild(releaseNotes);
      }

      details.appendChild(summary);
      details.appendChild(releaseContent);
      releaseItem.appendChild(details);
      container.appendChild(releaseItem);
    });
  }

  formatReleaseNotes(description) {
    // Format the release notes markdown-style content
    return description
      .replace(/\n/g, "<br>")
      .replace(/### (.*?)\s/g, "<h3>$1</h3>")
      .replace(/\* \*\*(.*?)\*\*/g, "<li><strong>$1</strong>")
      .replace(/\* (.*?)(\([^)]+\))/g, "<li>$1 $2</li>")
      .replace(
        /\((https?:\/\/[^)]+)\)/g,
        '(<a href="$1" target="_blank" rel="noopener noreferrer">link</a>)'
      );
  }

  initializeDragAndDrop() {
    const commitCards = document.querySelectorAll(".commit-card");
    const storyCards = document.querySelectorAll(".story-card");

    commitCards.forEach((card) => {
      card.addEventListener("dragstart", this.handleDragStart.bind(this));
      card.addEventListener("dragend", this.handleDragEnd.bind(this));
    });

    storyCards.forEach((card) => {
      card.addEventListener("dragover", this.handleDragOver.bind(this));
      card.addEventListener("drop", this.handleDrop.bind(this));
      card.addEventListener("dragenter", this.handleDragEnter.bind(this));
      card.addEventListener("dragleave", this.handleDragLeave.bind(this));
    });
  }

  handleDragStart(e) {
    e.dataTransfer.setData("text/plain", e.target.dataset.commitId);
    e.target.classList.add("dragging");

    // Disable pointer events and text selection on story cards during drag
    const storyCards = document.querySelectorAll(".story-card");
    storyCards.forEach((card) => {
      card.classList.add("drag-in-progress");
    });
  }

  handleDragEnd(e) {
    e.target.classList.remove("dragging");

    // Re-enable pointer events and text selection on story cards
    const storyCards = document.querySelectorAll(".story-card");
    storyCards.forEach((card) => {
      card.classList.remove("drag-in-progress");
      card.classList.remove("drop-target");
    });
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();

    // Find the closest story card to handle nested elements
    const storyCard = e.target.closest(".story-card");
    if (storyCard) {
      storyCard.classList.add("drop-target");
    }
  }

  handleDragLeave(e) {
    e.stopPropagation();

    // Only remove drop-target if we're leaving the story card entirely
    const storyCard = e.target.closest(".story-card");
    if (storyCard && !storyCard.contains(e.relatedTarget)) {
      storyCard.classList.remove("drop-target");
    }
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const commitId = e.dataTransfer.getData("text/plain");

    // Find the closest story card to handle nested elements
    const storyCard = e.target.closest(".story-card");
    if (!storyCard) return;

    const storyId = storyCard.dataset.storyId;
    storyCard.classList.remove("drop-target");

    if (commitId && storyId) {
      // Create or update connection
      if (!this.connections.has(storyId)) {
        this.connections.set(storyId, new Set());
      }
      this.connections.get(storyId).add(commitId);

      // Update UI to show connection
      this.updateConnectionDisplay(storyId, commitId);
      this.drawConnectionLines();
    }
  }
  updateConnectionDisplay(storyId, commitId) {
    const storyCard = document.querySelector(`[data-story-id="${storyId}"]`);
    const commitCard = document.querySelector(`[data-commit-id="${commitId}"]`);

    if (storyCard && commitCard) {
      // Add connection indicators
      storyCard.classList.add("has-connections");
      commitCard.classList.add("has-connections");

      // Update story card to show related commit
      const relatedCommits = storyCard.querySelector(".related-commits");
      if (relatedCommits) {
        relatedCommits.style.display = "block";
        const commitTag = document.createElement("span");
        commitTag.className = "story-tag";
        commitTag.textContent = commitCard
          .querySelector(".commit-id")
          .textContent.trim();
        relatedCommits.appendChild(commitTag);
      }
    }
  }

  drawConnectionLines() {
    const svg = document.getElementById("connection-lines");
    const existingLines = svg.querySelectorAll(".connection-line");
    existingLines.forEach((line) => line.remove());

    this.connections.forEach((commitIds, storyId) => {
      const storyCard = document.querySelector(`[data-story-id="${storyId}"]`);
      if (!storyCard) return;

      commitIds.forEach((commitId) => {
        const commitCard = document.querySelector(
          `[data-commit-id="${commitId}"]`
        );
        if (!commitCard) return;

        const line = this.createConnectionLine(storyCard, commitCard);
        svg.appendChild(line);
      });
    });

    // Add interaction handlers after drawing lines
    this.addConnectionLineInteractions();
  }

  createConnectionLine(storyCard, commitCard) {
    const container = document.querySelector(".stories-commits-container");
    const containerRect = container.getBoundingClientRect();
    const storyRect = storyCard.getBoundingClientRect();
    const commitRect = commitCard.getBoundingClientRect();

    const startX = storyRect.right - containerRect.left;
    const startY = storyRect.top + storyRect.height / 2 - containerRect.top;
    const endX = commitRect.left - containerRect.left;
    const endY = commitRect.top + commitRect.height / 2 - containerRect.top;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", startX);
    line.setAttribute("y1", startY);
    line.setAttribute("x2", endX);
    line.setAttribute("y2", endY);
    line.setAttribute("class", "connection-line");

    return line;
  }

  // Add interaction handlers for connection lines
  addConnectionLineInteractions() {
    const lines = document.querySelectorAll(".connection-line");
    lines.forEach((line) => {
      line.addEventListener("mouseenter", () => {
        line.classList.add("active");
      });

      line.addEventListener("mouseleave", () => {
        line.classList.remove("active");
      });
    });
  }

  // Method to remove a connection
  removeConnection(storyId, commitId) {
    if (this.connections.has(storyId)) {
      this.connections.get(storyId).delete(commitId);
      if (this.connections.get(storyId).size === 0) {
        this.connections.delete(storyId);
      }
      this.drawConnectionLines();
    }
  }

  // Method to clear all connections
  clearAllConnections() {
    this.connections.clear();
    this.drawConnectionLines();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ExtensionUIManager();
});

export default new ExtensionUIManager();
