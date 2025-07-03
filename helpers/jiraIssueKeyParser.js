const JIRA_ISSUE_KEY_REGEX = /([A-Z]{2,}-\d+)/g;

export function extractJiraIssueKeysFromText(text) {
  const matches = text.match(JIRA_ISSUE_KEY_REGEX);
  return matches ? [...new Set(matches.map(key => key.toUpperCase()))] : [];
}
