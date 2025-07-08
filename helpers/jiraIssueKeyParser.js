const JIRA_ISSUE_KEY_REGEX = /([A-Z]{2,}-\d+)/g;

class JiraIssueKeyParser {
  static extractJiraIssueKeysFromText(text) {
    const matches = text.match(JIRA_ISSUE_KEY_REGEX);
    return matches ? [...new Set(matches.map(key => key.toUpperCase()))] : [];
  }
}
export const extractJiraIssueKeysFromText = JiraIssueKeyParser.extractJiraIssueKeysFromText;
export default JiraIssueKeyParser;
