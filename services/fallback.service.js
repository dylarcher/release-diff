import { toast } from "./toast.service.js";
import { getMessage } from "../utils/i18n.util.js";

export class FallbackDataService {
  constructor() {
    this.mockDataAvailable = true;
  }

  /**
   * Show fallback prompt when APIs are unreachable
   * @param {string} apiType - 'jira', 'gitlab', or 'both'
   * @param {Function} onUseMockData - Callback for when user chooses to use mock data
   * @param {HTMLElement} container - Container to show the prompt in
   */
  showFallbackPrompt(apiType, onUseMockData, container) {
    const promptId = `fallback-prompt-${Date.now()}`;
    const prompt = this.createFallbackPromptElement(
      promptId,
      apiType,
      onUseMockData
    );

    // Remove any existing prompts
    this.removeFallbackPrompts(container);

    container.appendChild(prompt);
    return promptId;
  }

  createFallbackPromptElement(id, apiType, onUseMockData) {
    const prompt = document.createElement("div");
    prompt.id = id;
    prompt.className = "fallback-prompt";
    prompt.setAttribute("role", "alert");

    const messageText = this.getFallbackMessage(apiType);
    const messageElement = document.createElement("p");
    messageElement.className = "fallback-prompt-message";
    messageElement.textContent = messageText;

    const actionsContainer = document.createElement("div");
    actionsContainer.className = "fallback-prompt-actions";

    const useMockButton = document.createElement("button");
    useMockButton.className = "btn btn-secondary btn-sm";
    useMockButton.textContent = getMessage("useMockData") || "Use Mock Data";
    useMockButton.addEventListener("click", () => {
      onUseMockData();
      this.hideFallbackPrompt(id);
    });

    const dismissButton = document.createElement("button");
    dismissButton.className = "btn btn-secondary btn-sm";
    dismissButton.textContent = getMessage("dismiss") || "Dismiss";
    dismissButton.addEventListener("click", () => {
      this.hideFallbackPrompt(id);
    });

    actionsContainer.appendChild(useMockButton);
    actionsContainer.appendChild(dismissButton);

    prompt.appendChild(messageElement);
    prompt.appendChild(actionsContainer);

    return prompt;
  }

  getFallbackMessage(apiType) {
    const messages = {
      jira:
        getMessage("jiraApiUnreachable") ||
        "Jira API is currently unreachable. Would you like to use mock data for demonstration?",
      gitlab:
        getMessage("gitlabApiUnreachable") ||
        "GitLab API is currently unreachable. Would you like to use mock data for demonstration?",
      both:
        getMessage("bothApisUnreachable") ||
        "Both Jira and GitLab APIs are currently unreachable. Would you like to use mock data for demonstration?",
    };

    return messages[apiType] || messages["both"];
  }

  hideFallbackPrompt(promptId) {
    const prompt = document.getElementById(promptId);
    if (prompt) {
      prompt.style.opacity = "0";
      prompt.style.transform = "translateY(-10px)";

      setTimeout(() => {
        if (prompt.parentNode) {
          prompt.parentNode.removeChild(prompt);
        }
      }, 300);
    }
  }

  removeFallbackPrompts(container) {
    const existingPrompts = container.querySelectorAll(".fallback-prompt");
    existingPrompts.forEach((prompt) => {
      this.hideFallbackPrompt(prompt.id);
    });
  }

  /**
   * Load mock data from the shared/data directory
   * @param {string} dataType - 'releases', 'commits', or 'versions'
   * @returns {Promise<Object>} Mock data
   */
  async loadMockData(dataType) {
    try {
      const dataFiles = {
        releases: "/shared/data/releases.json",
        commits: "/shared/data/commits.json",
        versions: "/shared/data/versions.json",
      };

      const filePath = dataFiles[dataType];
      if (!filePath) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      const response = await fetch(chrome.runtime.getURL(filePath));
      if (!response.ok) {
        throw new Error(`Failed to load mock ${dataType} data`);
      }

      const data = await response.json();
      console.info(`Loaded mock ${dataType} data:`, data);
      return data;
    } catch (error) {
      console.error(`Error loading mock ${dataType} data:`, error);
      toast.showError(`Failed to load mock ${dataType} data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Populate UI with mock data
   * @param {Object} elements - UI elements to populate
   */
  async populateMockData(elements) {
    try {
      const [releasesData, commitsData, versionsData] = await Promise.all([
        this.loadMockData("releases"),
        this.loadMockData("commits"),
        this.loadMockData("versions"),
      ]);

      this.populateJiraTickets(elements.jiraTicketsDiv, releasesData);
      this.populateGitlabCommits(elements.gitlabHistoryDiv, commitsData);
      this.populateVersions(elements.versionsDatalist, versionsData);

      // Show success message
      toast.showSuccess(
        getMessage("mockDataLoaded") ||
          "Mock data loaded successfully for demonstration"
      );

      return {
        jiraData: releasesData,
        gitlabCommits: commitsData,
        gitlabTags: versionsData,
      };
    } catch (error) {
      console.error("Error populating mock data:", error);
      toast.showError(`Failed to populate mock data: ${error.message}`);
      throw error;
    }
  }

  populateJiraTickets(container, jiraData) {
    if (!container || !jiraData?.issues) return;

    container.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = `Jira Tickets (${jiraData.issues.length} total)`;
    container.appendChild(title);

    const list = document.createElement("ul");
    jiraData.issues.forEach((issue) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = issue.self;
      link.textContent = `${issue.key}: ${issue.fields?.summary || "No summary"}`;
      link.target = "_blank";
      link.className = "jira-link";
      listItem.appendChild(link);
      list.appendChild(listItem);
    });

    container.appendChild(list);
  }

  populateGitlabCommits(container, commitsData) {
    if (!container || !Array.isArray(commitsData)) return;

    container.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = `GitLab Commits (${commitsData.length} total)`;
    container.appendChild(title);

    const list = document.createElement("ul");
    commitsData.forEach((commit) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = commit.web_url;
      link.textContent = commit.title || commit.message || "Commit";
      link.target = "_blank";
      listItem.appendChild(link);
      list.appendChild(listItem);
    });

    container.appendChild(list);
  }

  populateVersions(datalist, versionsData) {
    if (!datalist || !Array.isArray(versionsData)) return;

    datalist.innerHTML = "";
    versionsData.forEach((version) => {
      const option = document.createElement("option");
      option.value =
        version.name ||
        version.tag_name ||
        version.version ||
        "Unknown version";
      datalist.appendChild(option);
    });
  }

  /**
   * Check if APIs are reachable
   * @param {string} jiraUrl - Jira base URL
   * @param {string} gitlabUrl - GitLab base URL
   * @param {string} jiraPat - Jira PAT
   * @param {string} gitlabPat - GitLab PAT
   * @returns {Promise<Object>} Status of API availability
   */
  async checkApiAvailability(jiraUrl, gitlabUrl, jiraPat, gitlabPat) {
    const results = {
      jiraAvailable: false,
      gitlabAvailable: false,
      errors: [],
    };

    // Test Jira connection
    try {
      const jiraResponse = await fetch(`${jiraUrl}/rest/api/2/myself`, {
        headers: {
          Authorization: `Basic ${btoa(jiraPat + ":")}`,
          "Content-Type": "application/json",
        },
      });
      results.jiraAvailable = jiraResponse.ok;
    } catch (error) {
      results.errors.push(`Jira: ${error.message}`);
    }

    // Test GitLab connection
    try {
      const gitlabResponse = await fetch(`${gitlabUrl}/api/v4/user`, {
        headers: {
          Authorization: `Bearer ${gitlabPat}`,
          "Content-Type": "application/json",
        },
      });
      results.gitlabAvailable = gitlabResponse.ok;
    } catch (error) {
      results.errors.push(`GitLab: ${error.message}`);
    }

    return results;
  }
}

export const fallbackService = new FallbackDataService();
export default fallbackService;
