# Jira-GitLab Release Overview Browser Extension

**This browser extension provides a consolidated summary and overview of software releases by integrating data from Jira and GitLab. It aims to bridge the information gap between issue tracking and code management platforms, enhancing release transparency and streamlining reporting.**

**NEW: Side Panel Interface** - The extension now uses Chrome's side panel instead of a popup, allowing the interface to persist when moving between tabs for better workflow integration.

**Disclaimer: Security Notice**
This extension uses Personal Access Tokens (PATs) for authentication and stores them in the browser's `chrome.storage.local` for simplicity of demonstration. **For production enterprise environments, this method is generally NOT recommended due to security risks.** A more secure approach for handling sensitive credentials, especially with Jira Cloud's OAuth limitations, would involve a backend proxy service to manage tokens securely. Use this extension with caution in sensitive environments.

## Features

* **Fetches Jira issues based on `Fix Version`.
* **Fetches GitLab commits between specified release tags.**
* **Correlates Jira issues with GitLab commits by parsing issue keys (**`DDSTM-#####`) from commit messages/MR titles.
* **Identifies discrepancies:**
  * **Jira issues planned for a release but not found in the corresponding GitLab code.**
  * **Code changes found in GitLab but not formally planned in Jira (no linked Jira issue).**
  * **Jira issues linked in code but whose Jira status is not "Done".**
* **Displays a summary of matched issues and identified discrepancies in a persistent side panel UI.**
* **Click the extension icon to open the side panel interface.**

## Getting Started

### 1. Project Structure and File Guide

The extension is organized into several key files. Understanding their roles is helpful for both using and modifying the extension.

```shell
/ext.release-review
├── services/
│   └── background.js        # The service worker for API calls and data processing
├── ui/
│   ├── sidepanel.html       # The HTML for the extension's side panel UI
│   └── sidepanel.js         # JavaScript for side panel UI interactions
├── user/
│   ├── options.html         # The HTML for the extension's configuration page
│   └── options.js           # JavaScript for saving/loading configuration
├── manifest.json            # Defines the extension's properties and permissions
├── .gitignore               # Ignored files and directories for version control
└── README.md                # This file
```

### 2. Installation (for Chrome/Edge)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/jira-gitlab-release-extension.git
   cd jira-gitlab-release-extension
   ```

2. **Open Extension Management:**
   * Open your Chrome or Edge browser.
   * Navigate to `chrome://extensions` (for Chrome) or `edge://extensions` (for Edge).

3. **Enable Developer Mode:**
   * Toggle the "Developer mode" switch in the top right corner.

4. **Load the extension:**
   * Click "Load unpacked".
   * Select the `jira-gitlab-release-extension` directory you cloned.

### 3. Using the Side Panel

**Opening the Side Panel:**

* Click the extension icon in the browser toolbar
* The side panel will open on the right side of your browser window
* The panel persists across tabs, allowing you to continue your work while keeping the release overview visible

**Closing the Side Panel:**

* Use the browser's built-in side panel controls (X button in the side panel header)
* The side panel will remain available until manually closed

**Benefits of Side Panel over Popup:**

* **Persistent Interface**: Unlike popups that close when you click outside, the side panel stays open
* **Better Workflow**: Continue browsing Jira/GitLab while keeping release data visible
* **More Space**: Wider interface for better data visualization
* **Responsive Design**: Adapts to different side panel widths

### 4. Configuration

**Before using the extension, you need to configure your Jira and GitLab instance URLs and API Personal Access Tokens.**

1. **Open Options Page:**
   * **Click on the "Jira-GitLab Release Overview" extension icon in your browser toolbar.**
   * **At the bottom of the popup, click the "Configure API Keys and URLs" link. This will open the options page in a new tab.**
2. **Get Jira Personal Access Token (PAT):**
   * **Go to your Atlassian account settings (for Jira Cloud) or your Jira profile (for Jira Server/Data Center).**
   * **Generate an API token.**
   * **Important for Jira Cloud:** For Jira Cloud PATs, the `<span class="selected">background.js</span>` script uses Basic Authentication in the format `<span class="selected">email:token</span>` or `<span class="selected">username:token</span>`. When entering your PAT in the options,  **only provide the token itself** **. The**`<span class="selected">background.js</span>` will append the `<span class="selected">:</span>` internally. If your Jira instance requires `<span class="selected">email:token</span>`, you may need to adjust the authentication in `<span class="selected">background.js</span>` to `<span class="selected">btoa("your_email@domain.com:" + token)</span>`. For simplicity in this example, it assumes a token-only input for the PAT field, acting as a password in Basic Auth.
3. **Get GitLab Personal Access Token (PAT):**
   * **Log in to your GitLab instance.**
   * **Go to your user settings -> Access Tokens.**
   * **Generate a new personal access token with at least**`<span class="selected">read_api</span>` and `<span class="selected">read_repository</span>` scopes.
4. **Enter Configuration Details:**
   * **In the extension options page:**
     * **Enter your****Jira Base URL** (e.g., `<span class="selected">https://your-company.atlassian.net</span>` or `<span class="selected">https://jira.your-company.com</span>`).
     * **Enter your** **Jira Personal Access Token (PAT)** **.**
     * **Enter your****GitLab Base URL** (e.g., `<span class="selected">https://gitlab.com</span>` or `<span class="selected">https://gitlab.your-company.com</span>`).
     * **Enter your** **GitLab Personal Access Token (PAT)** **.**
5. **Save Settings:**
   * **Click the "Save Settings" button. You should see a "Settings saved!" message.**

### 4. Update `<span class="selected">manifest.json</span>` Host Permissions

**Crucially, you MUST update the `<span class="selected">host_permissions</span>` in `<span class="selected">manifest.json</span>`** to include the exact domains of your Jira and GitLab instances. If you use self-hosted instances, replace the placeholder domains with your actual ones.

**Example**`<span class="selected">host_permissions</span>` in `<span class="selected">manifest.json</span>`:

```json
{
   "host_permissions": [
      "https://your-company.atlassian.net/*",  // Replace with your Jira Cloud domain
      "https://jira.your-company.com/*",       // Or your Jira Server/Data Center domain
      "https://gitlab.com/*",                 // If using GitLab.com
      "https://gitlab.your-company.com/*"     // Or your self-hosted GitLab domain
   ],
}
```

**After modifying**`<span class="selected">manifest.json</span>`, go back to `<span class="selected">chrome://extensions</span>` and click the "Reload" button (circular arrow icon) on the "Jira-GitLab Release Overview" extension card.

### 5. Usage

1. **Click the extension icon in your browser toolbar.**
2. **Enter the required details:**
   * **Jira Project Key** **: The key for your Jira project (e.g.,**`<span class="selected">DDSTM</span>`).
   * **Jira Fix Version** **: The exact name of the Jira**`<span class="selected">Fix Version</span>` (e.g., `<span class="selected">Release v1.0.0</span>`).
   * **GitLab Project ID** **: The numerical ID of your GitLab project. You can find this on your GitLab project's overview page.**
   * **GitLab Current Release Tag** **: The exact name of the Git tag for the current release (e.g.,**`<span class="selected">v1.0.0</span>`).
   * **GitLab Previous Release Tag** **: The exact name of the Git tag for the previous release (e.g.,**`<span class="selected">v0.9.0</span>`).
3. **Click "Generate Summary".**
4. **The extension will fetch data, perform the comparison, and display the summary, including total issues, and identified discrepancies.**

### 6. Troubleshooting

**Common Issues and Solutions:**

#### "Fix version does not exist" Error
- **Problem**: Error message like "The value 'Release v2.25.5' does not exist for the field 'fixVersion'"
- **Solution**: 
  1. Click the "Get Available Versions" button next to the Fix Version field
  2. Select the correct version name from the list that appears
  3. Fix version names must match exactly as they appear in Jira

#### Authentication Issues
- **Problem**: 401/403 errors or "Authentication failed"
- **Solutions**:
  1. Verify your Jira PAT is correct and hasn't expired
  2. For Jira Cloud: Use your email address and API token
  3. For Jira Server/Data Center: Use username and password or PAT
  4. Ensure your PAT has sufficient permissions (browse projects, read issues)

#### API Endpoint Issues  
- **Problem**: 404 errors on API calls
- **Solutions**:
  1. Verify your Jira base URL is correct (no trailing slash needed)
  2. For Jira Server/Data Center, the extension tries API v2 first
  3. Use the "Test Jira API" button to verify connectivity

#### Project/Version Not Found
- **Problem**: Project key or fix version not found
- **Solutions**:
  1. Double-check the project key matches exactly (case-sensitive)
  2. Ensure you have access to the project in Jira
  3. Use the "Get Available Versions" feature to see valid fix versions

## Limitations and Future Improvements

* **Security of PATs:** As noted, storing PATs client-side is a security risk. For production, consider a backend service to handle API authentication and act as a proxy.
* **Jira OAuth 2.0:** Jira Cloud's OAuth 2.0 (3LO) is complex for client-side applications as it does not support implicit grant flow. A full OAuth implementation would require a backend component.
* **Error Handling:** Basic error handling is in place. More robust error handling, including exponential backoff for rate limits and more specific API error messages, could be implemented.
* **GitLab Pagination for Commits:** The GitLab Commits API does not provide total counts, which means the extension fetches pages iteratively. For very large commit histories between tags, this could be slow.
* **Jira Issue Linking Precision:** The extension relies on Jira issue keys being explicitly mentioned in GitLab commit messages/MR titles. Incorrect or missing links will result in discrepancies.
* **MR Details:** The current version infers MR details from commit messages. A more robust solution would involve fetching GitLab Merge Request details directly via API.
* **Customization:** The Jira issue key regex is hardcoded. It could be made configurable in the options page.
* **UI Enhancements:** More advanced visualizations or filtering options could be added.
* **Cross-Browser Compatibility:** While designed for Chrome/Edge, full cross-browser compatibility (Firefox, Safari) would require testing and potentially minor adjustments to browser-specific APIs (though `<span class="selected">webextension-polyfill</span>` can help).
