# Compare Jira vs. GitLab - Release Diff Report

A browser extension that provides a consolidated summary and overview of software releases by integrating data from Jira and GitLab. It aims to bridge the information gap between issue tracking and code management platforms, enhancing release transparency and streamlining reporting.

*The extension uses Chrome's side panel for a persistant interface while navigating between tabs providing a better workflow than the alternative "popup" integration.*

> **Security Disclaimer Notice:**
>
> This extension uses Personal Access Tokens (PATs) for authentication and stores them in the browser's `chrome.storage.local` for simplicity of demonstration. **For production enterprise environments, this method is generally NOT recommended due to security risks.** A more secure approach for handling sensitive credentials, especially with Jira Cloud's OAuth limitations, would involve a backend proxy service to manage tokens securely. Use this extension with caution in sensitive environments.

## Table of Contents

- [Compare Jira vs. GitLab - Release Diff Report](#compare-jira-vs-gitlab---release-diff-report)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Getting Started](#getting-started)
    - [1. Project Structure and File Guide](#1-project-structure-and-file-guide)
    - [2. Installation (for Chrome/Edge)](#2-installation-for-chromeedge)
    - [3. Using the Side Panel](#3-using-the-side-panel)
    - [4. Configuration](#4-configuration)
    - [4. Update `manifest.json` Host Permissions](#4-update-manifestjson-host-permissions)
    - [5. Usage](#5-usage)
    - [6. Troubleshooting](#6-troubleshooting)
      - ["Fix version does not exist" Error](#fix-version-does-not-exist-error)
      - [Authentication Issues](#authentication-issues)
      - [API Endpoint Issues](#api-endpoint-issues)
      - [Project/Version Not Found](#projectversion-not-found)
  - [Limitations and Future Improvements](#limitations-and-future-improvements)

## Features

- Fetches Jira issues based on `Fix Version`.
- Fetches GitLab commits between specified release tags.
- Correlates Jira issues with GitLab commits by parsing issue keys (`DDSTM-#####`) from commit messages/MR titles.
- **Identifies discrepancies:**
  - Jira issues planned for a release but not found in the corresponding GitLab code.
  - Code changes found in GitLab but not formally planned in Jira (no linked Jira issue).
  - Jira issues linked in code but whose Jira status is not "Done".
- Displays a summary of matched issues and identified discrepancies in a persistent side panel UI.
- *Click* the extension icon to open the side panel interface.

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

  ```shell
  git clone https://github.com/your-username/jira-gitlab-release-extension.git
  cd jira-gitlab-release-extension
  ```

2. **Open Extension Management:**
  - Open your Chrome or Edge browser.
  - Navigate to `chrome://extensions` (for Chrome) or `edge://extensions` (for Edge).

3. **Enable Developer Mode:**
  - Toggle the "Developer mode" switch in the top right corner.

4. **Load the extension:**
  - Click "Load unpacked".
  - Select the `jira-gitlab-release-extension` directory you cloned.

### 3. Using the Side Panel

**Opening the Side Panel:**

- Click the extension icon in the browser toolbar
- The side panel will open on the right side of your browser window
- The panel persists across tabs, allowing you to continue your work while keeping the release overview visible

**Closing the Side Panel:**

- Use the browser's built-in side panel controls (X button in the side panel header)
- The side panel will remain available until manually closed

**Benefits of Side Panel over Popup:**

- **Persistent Interface** - Unlike popups that close when you click outside, the side panel stays open
- **Better Workflow** - Continue browsing Jira/GitLab while keeping release data visible
- **More Space** - Wider interface for better data visualization
- **Responsive Design** - Adapts to different side panel widths

### 4. Configuration

> Before using the extension, you need to configure your Jira and GitLab instance URLs and API Personal Access Tokens.

1. **Open Options Page:**
  - *Click* on the "Jira-GitLab Release Overview" extension icon in your browser toolbar.
  - At the bottom of the popup, click the "Configure API Keys and URLs" link. This will open the options page in a new tab.
2. Get Jira Personal Access Token (PAT):
  - *Go to* your Atlassian account settings (for Jira Cloud) or your Jira profile (for Jira Server/Data Center).
  - Generate an API token.
  - **Important for Jira Cloud:** For Jira Cloud PATs, the `background.js` script uses Basic Authentication in the format `email:token` or `username:token`. When entering your PAT in the options,  **only provide the token itself**. The `background.js` will append the `:` internally. If your Jira instance requires `email:token`, you may need to adjust the authentication in `background.js` to `btoa("{EMAIL_ADDRESS}@{PROVIDER_DOMAIN}.com:" + token)`. For simplicity in this example, it assumes a token-only input for the PAT field, acting as a password in Basic Auth.
3. **Get GitLab Personal Access Token (PAT):**
  - Log in to your GitLab instance.
  - Go to your user settings -> Access Tokens.
  - Generate a new personal access token with at least `read_api` and `read_repository` scopes.
4. **Enter Configuration Details:** (&hellip;in the extension options page)
    - Enter your *Jira Base URL* (e.g. `https://jira.dell.net` or `https://jira.dell.com`).
    - Enter your *Jira Personal Access Token (PAT)*.
    - Enter your *GitLab Base URL* (e.g. `https://gitlab.com` or `https://gitlab.dell.com`).
    - Enter your *GitLab Personal Access Token (PAT)*.
5. **Save Settings:**
  - Click the "Save Settings" button. You should see a "Settings saved!" message.

### 4. Update `manifest.json` Host Permissions

**Crucially, you MUST update the `host_permissions` in `manifest.json`** to include the exact domains of your Jira and GitLab instances. If you use self-hosted instances, replace the placeholder domains with your actual ones.

**Example**`host_permissions` in `manifest.json`:

```jsonc
{
  "host_permissions": [
      "https://dell.atlassian.net/*",
      "https://jira.dell.com/*",
      "https://gitlab.com/*",
      "https://gitlab.dell.com/*"å
  ],
}
```

**After modifying**`manifest.json`, go back to `chrome://extensions` and click the "Reload" button (circular arrow icon) on the "Jira-GitLab Release Overview" extension card.

### 5. Usage

1. **Click the extension icon in your browser toolbar.**
2. **Enter the required details:**
  - **Jira Project Key** - The key for your Jira project (e.g. `DDSTM`).
  - **Jira Fix Version** - The exact name of the Jira**`Fix Version` (e.g. `Release v1.0.0`).
  - **GitLab Project ID** - The numerical ID of your GitLab project. You can find this on your GitLab project's overview page.
  - **GitLab Current Release Tag** - The exact name of the Git tag for the current release (e.g. `v1.0.0`).
  - **GitLab Previous Release Tag** - The exact name of the Git tag for the previous release (e.g. `v0.9.0`).
3. *Click* "Generate Summary".
4. The extension will fetch data, perform the comparison, and display the summary, including total issues, and identified discrepancies.

### 6. Troubleshooting

> &hellip;for common occurance issues, edge cases, and ideal paths for known solutions.

#### "Fix version does not exist" Error

**Problem:** `Error message like "The value 'Release v2.25.5' does not exist for the field 'fixVersion'"`

**Solution:**

1. Click the "Get Available Versions" button next to the Fix Version field
2. Select the correct version name from the list that appears
3. Fix version names must match exactly as they appear in Jira

#### Authentication Issues

**Problem:** `401/403 errors or "Authentication failed"`

**Solutions:**

1. Verify your Jira PAT is correct and hasn't expired
2. For Jira Cloud: Use your email address and API token
3. For Jira Server/Data Center: Use username and password or PAT
4. Ensure your PAT has sufficient permissions (browse projects, read issues)

#### API Endpoint Issues

**Problem:** `404 errors on API calls`

**Solutions:**

1. Verify your Jira base URL is correct (no trailing slash needed)
2. For Jira Server/Data Center, the extension tries API v2 first
3. Use the "Test Jira API" button to verify connectivity

#### Project/Version Not Found

**Problem:** `Project key or fix version not found`

**Solutions:**

1. Double-check the project key matches exactly (case-sensitive)
2. Ensure you have access to the project in Jira
3. Use the "Get Available Versions" feature to see valid fix versions

## Limitations and Future Improvements

| **TOPIC** | **SUMMARY** |
| --- | --- |
| **Security of PATs** | As noted, storing PATs client-side is a security risk. For production, consider a backend service to handle API authentication and act as a proxy. |
| **Jira OAuth 2.0** | Jira Cloud's OAuth 2.0 (3LO) is complex for client-side applications as it does not support implicit grant flow. A full OAuth implementation would require a backend component. |
| **Error Handling** | Basic error handling is in place. More robust error handling, including exponential backoff for rate limits and more specific API error messages, could be implemented. |
| **GitLab Pagination for Commits** | The GitLab Commits API does not provide total counts, which means the extension fetches pages iteratively. For very large commit histories between tags, this could be slow. |
| **Jira Issue Linking Precision** | The extension relies on Jira issue keys being explicitly mentioned in GitLab commit messages/MR titles. Incorrect or missing links will result in discrepancies. |
| **Merge Request Details** | The current version infers MR details from commit messages. A more robust solution would involve fetching GitLab Merge Request (MR) details directly via API.
| **Customization** | The Jira issue key regex is hardcoded. It could be made configurable in the options page. |
| **Interface Enhancements** | More advanced visualizations or filtering options could be added.
| **Cross-Browser Compatibility** | While designed for Chrome/Edge, full cross-browser compatibility (Firefox, Safari) would require testing and potentially minor adjustments to browser-specific APIs (though `webextension-polyfill` can help). |
