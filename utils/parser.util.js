"use strict";

import { JIRA_ISSUE_KEY_REGEX } from '../conf/constants.conf.js';

class JiraParser {
  static extractStoryKeysFromId(text) {
    const matches = text.match(JIRA_ISSUE_KEY_REGEX);
    return matches ? [...new Set(matches.map(key => key.toUpperCase()))] : [];
  }
}

export const { extractStoryKeysFromId } = JiraParser || {};
export default new JiraParser();
