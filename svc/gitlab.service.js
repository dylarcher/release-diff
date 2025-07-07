"use strict";

import { makeAuthenticatedApiRequest, buildCleanApiUrl } from './request.service.js';
import { AUTH_TYPES, GITLAB_ENDPOINTS, HTTP_STATUS, PAGINATION, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../conf/constants.conf.js';

export class GitLabService {
  static async fetchProjectDetails(gitlabBaseUrl, gitlabPat, projectId) {
    const url = buildCleanApiUrl(gitlabBaseUrl, GITLAB_ENDPOINTS.PROJECT_DETAILS.replace('{projectId}', projectId));
    return await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
  }

  static async fetchTagsForProject(gitlabBaseUrl, gitlabPat, projectId) {
    const url = buildCleanApiUrl(gitlabBaseUrl, `${GITLAB_ENDPOINTS.PROJECT_TAGS.replace('{projectId}', projectId)}?per_page=${PAGINATION.PER_PAGE}`);
    return await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
  }

  static async *fetchCommitsBetweenTagsGenerator(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag) {
    const tags = await this.fetchTagsForProject(gitlabBaseUrl, gitlabPat, projectId);
    const currentTagObj = tags.find(tag => tag.name === currentTag);
    const previousTagObj = tags.find(tag => tag.name === previousTag);

    if (!currentTagObj || !previousTagObj) {
      throw new Error(`${ERROR_MESSAGES.GITLAB_TAGS_NOT_FOUND} ${currentTag} or ${previousTag}. ${ERROR_MESSAGES.GITLAB_TAGS_ENSURE_EXISTS}`);
    }

    const { committed_date: currentTagDate } = currentTagObj.commit;
    const { committed_date: previousTagDate } = previousTagObj.commit;

    let page = 1;
    const perPage = PAGINATION.PER_PAGE;

    while (true) {
      const endpoint = `${GITLAB_ENDPOINTS.PROJECT_COMMITS.replace('{projectId}', projectId)}?per_page=${perPage}&since=${previousTagDate}&until=${currentTagDate}&page=${page}`;
      const url = buildCleanApiUrl(gitlabBaseUrl, endpoint);

      const commits = await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
      if (commits.length === 0) break;

      for (const commit of commits) {
        yield commit;
      }

      page++;
    }
  }

  static async fetchCommitsBetweenTags(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag) {
    const commits = [];
    for await (const commit of this.fetchCommitsBetweenTagsGenerator(gitlabBaseUrl, gitlabPat, projectId, currentTag, previousTag)) {
      commits.push(commit);
    }
    return commits;
  }

  static async testConnection(gitlabBaseUrl, gitlabPat) {
    try {
      const url = buildCleanApiUrl(gitlabBaseUrl, GITLAB_ENDPOINTS.USER);
      const result = await makeAuthenticatedApiRequest(url, gitlabPat, AUTH_TYPES.BEARER);
      return {
        success: true,
        message: SUCCESS_MESSAGES.GITLAB_API_CONNECTION_SUCCESSFUL, // This is a user message key
        data: result
      };
    } catch (error) {
      if (error.message.includes(HTTP_STATUS.UNAUTHORIZED)) {
        throw new Error(ERROR_MESSAGES.GITLAB_AUTHENTICATION_FAILED);
      } else if (error.message.includes(HTTP_STATUS.FORBIDDEN)) {
        throw new Error(ERROR_MESSAGES.GITLAB_ACCESS_FORBIDDEN);
      } else if (error.message.includes(HTTP_STATUS.NOT_FOUND)) {
        throw new Error(ERROR_MESSAGES.GITLAB_API_ENDPOINT_NOT_FOUND);
      }
      // Generic fallback
      throw error;
    }
  }
}

export default new GitLabService();
