"use strict";

import { makeAuthenticatedApiRequest, buildCleanApiUrl } from './request.service.js';
import {
  PAGINATION,
  JQL_TEMPLATES,
  JIRA_FIELDS,
  API_VERSIONS,
  JIRA_ENDPOINTS,
  CONSOLE_MESSAGES,
  ERROR_MESSAGES,
  AUTH_TYPES
} from '../conf/constants.conf.js';

export class JiraService {
  static async fetchIssuesForProjectAndVersion(jiraBaseUrl, jiraPat, projectKey, fixVersion) {
    let allIssues = [];
    let startAt = 0;
    const maxResults = PAGINATION.MAX_RESULTS;

    const jql = encodeURIComponent(JQL_TEMPLATES.PROJECT_AND_FIX_VERSION.replace('{projectKey}', projectKey).replace('{fixVersion}', fixVersion));
    const fields = encodeURIComponent(JIRA_FIELDS);

    const apiVersions = API_VERSIONS.JIRA;
    let lastError = null;

    for (const version of apiVersions) {
      try {
        while (true) {
          const endpoint = `${JIRA_ENDPOINTS.SEARCH.replace('{version}', version)}?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`;
          const url = buildCleanApiUrl(jiraBaseUrl, endpoint);

          const data = await makeAuthenticatedApiRequest(url, jiraPat, AUTH_TYPES.BASIC);

          if (!data.issues || data.issues.length === 0) break;

          allIssues = allIssues.concat(data.issues);
          startAt += data.issues.length;

          if (startAt >= data.total) break;
        }

        console.info(`${CONSOLE_MESSAGES.SUCCESSFULLY_USED_JIRA_API} ${version}, found ${allIssues.length} issues`);
        return allIssues;

      } catch (error) {
        console.info(`${CONSOLE_MESSAGES.JIRA_API_FAILED} ${version} failed:`, error.message);
        lastError = error;
        allIssues = [];
        startAt = 0;

        if (error.message.includes(ERROR_MESSAGES.FIX_VERSION_NOT_EXISTS)) {
          throw new Error(ERROR_MESSAGES.FIX_VERSION_CHECK_NAME.replace('{version}', fixVersion).replace('{project}', projectKey));
        }
      }
    }

    throw new Error(`${ERROR_MESSAGES.ALL_JIRA_API_VERSIONS_FAILED} ${lastError.message}`);
  }

  static async fetchFixVersionsForProject(jiraBaseUrl, jiraPat, projectKey) {
    const apiVersions = API_VERSIONS.JIRA;

    for (const version of apiVersions) {
      try {
        const endpoint = JIRA_ENDPOINTS.PROJECT_VERSIONS.replace('{version}', version).replace('{projectKey}', projectKey);
        const url = buildCleanApiUrl(jiraBaseUrl, endpoint);
        const versions = await makeAuthenticatedApiRequest(url, jiraPat, AUTH_TYPES.BASIC);
        return versions.filter(v => !v.archived);
      } catch (error) {
        if (version === '3') {
          throw error;
        }
      }
    }
  }

  static async testConnection(jiraBaseUrl, jiraPat) {
    const testEndpoints = [
      JIRA_ENDPOINTS.SERVER_INFO_V2,
      JIRA_ENDPOINTS.MYSELF_V2,
      JIRA_ENDPOINTS.SERVER_INFO_V3,
      JIRA_ENDPOINTS.MYSELF_V3
    ];

    for (const endpoint of testEndpoints) {
      try {
        const url = buildCleanApiUrl(jiraBaseUrl, endpoint);
        const result = await makeAuthenticatedApiRequest(url, jiraPat, AUTH_TYPES.BASIC);
        return {
          success: true,
          message: `${SUCCESS_MESSAGES.JIRA_CONNECTION_SUCCESSFUL} ${endpoint}`,
          data: result
        };
      } catch (error) {
        if (error.message.includes(HTTP_STATUS.UNAUTHORIZED)) {
          throw new Error(ERROR_MESSAGES.AUTHENTICATION_FAILED);
        } else if (error.message.includes(HTTP_STATUS.FORBIDDEN)) {
          throw new Error(ERROR_MESSAGES.ACCESS_FORBIDDEN);
        } else if (error.message.includes(HTTP_STATUS.NOT_FOUND)) {
          continue;
        }
      }
    }

    throw new Error(ERROR_MESSAGES.ALL_JIRA_ENDPOINTS_FAILED);
  }
}

export default new JiraService();
