"use strict";

export class AnalysisService {
  // Helper for tokenizing and cleaning text for loose matching
  static _getTokensForMatching(text) {
    if (!text || typeof text !== 'string') return [];
    // Simple stop words list, can be expanded
    const stopWords = new Set(['a', 'an', 'the', 'is', 'in', 'it', 'of', 'for', 'on', 'with', 'to', 'and', 'or', 'ddstm']);
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  // Helper for calculating keyword overlap score
  static _calculateOverlapScore(tokens1, tokens2) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    let overlap = 0;
    for (const token of set1) {
      if (set2.has(token)) {
        overlap++;
      }
    }
    return overlap;
  }

  static analyzeIssueAndCommitCorrelation(jiraIssues, gitlabCommits, userModifications) {
    const { manualMatches = [], userUnmatches = [], flaggedItems = {} } = userModifications;

    // Phase 0: Apply user-defined flags
    jiraIssues.forEach(issue => {
      if (flaggedItems[issue.id]) {
        issue.needsAction = true;
      }
    });
    gitlabCommits.forEach(commit => {
      if (flaggedItems[commit.id]) {
        commit.needsAction = true;
      }
    });

    // Phase 1: Apply Manual Matches (these take highest precedence)
    for (const match of manualMatches) {
      const jiraIssue = jiraIssues.find(issue => issue.id === match.jiraId);
      const gitlabCommit = gitlabCommits.find(commit => commit.id === match.commitId);

      if (jiraIssue && gitlabCommit) {
        // Clear any existing associations first if we are forcing a manual one
        jiraIssue.associations = [];
        gitlabCommit.associations = [];

        jiraIssue.associations.push({ id: gitlabCommit.id, type: 'manual' });
        gitlabCommit.associations.push({ id: jiraIssue.id, type: 'manual' });
      }
    }

    // Phase 2: Explicit Matching (based on Jira keys in commit messages)
    // Only apply if not already part of a manual match
    for (const commit of gitlabCommits) {
      // If commit is already manually matched, skip its explicit key processing for matches
      if (commit.associations.some(a => a.type === 'manual')) continue;

      if (commit.explicitJiraKeys && commit.explicitJiraKeys.length > 0) {
        for (const jiraKey of commit.explicitJiraKeys) {
          const jiraIssue = jiraIssues.find(issue => issue.id === jiraKey);
          if (jiraIssue) {
            // Add association to Jira issue
            if (!jiraIssue.associations.some(assoc => assoc.id === commit.id)) {
              jiraIssue.associations.push({ id: commit.id, type: 'explicit' });
            }
            // Add association to commit
            if (!commit.associations.some(assoc => assoc.id === jiraIssue.id)) {
              commit.associations.push({ id: jiraIssue.id, type: 'explicit' });
            }
          }
        }
      }
    }

    // Phase 2: Loose Matching (based on content similarity)
    const LOOSE_MATCH_THRESHOLD = 2; // Min number of overlapping keywords to be considered a loose match

    for (const issue of jiraIssues) {
      // Only attempt to loosely match issues that don't have an explicit or manual match yet
      if (issue.associations.some(a => a.type === 'explicit' || a.type === 'manual')) continue;

      const issueTokens = this._getTokensForMatching(issue.summary);
      if (issueTokens.length === 0) continue;

      let bestLooseMatch = null;
      let maxScore = 0;

      for (const commit of gitlabCommits) {
        // Only attempt to loosely match commits that don't have an explicit or manual match with this issue
        // and are not already explicitly or manually matched with *any* issue.
        if (commit.associations.some(a => a.id === issue.id || a.type === 'explicit' || a.type === 'manual')) continue;

        // Check if this pair was explicitly unmatched by the user
        const isUnmatchedByUser = userUnmatches.some(unmatch =>
          (unmatch.item1Id === issue.id && unmatch.item2Id === commit.id) ||
          (unmatch.item1Id === commit.id && unmatch.item2Id === issue.id)
        );
        if (isUnmatchedByUser) continue; // Skip if user explicitly unmatched this pair

        const commitText = `${commit.title} ${commit.message}`;
        const commitTokens = this._getTokensForMatching(commitText);
        if (commitTokens.length === 0) continue;

        const score = this._calculateOverlapScore(issueTokens, commitTokens);

        if (score >= LOOSE_MATCH_THRESHOLD && score > maxScore) {
          maxScore = score;
          bestLooseMatch = commit;
        }
      }

      if (bestLooseMatch) {
        // Add loose association to Jira issue
        if (!issue.associations.some(assoc => assoc.id === bestLooseMatch.id)) {
          issue.associations.push({ id: bestLooseMatch.id, type: 'loose' });
        }
        // Add loose association to commit
        if (!bestLooseMatch.associations.some(assoc => assoc.id === issue.id)) {
          bestLooseMatch.associations.push({ id: issue.id, type: 'loose' });
        }
      }
    }
    return {
      jiraIssues, // These lists are now modified directly
      gitlabCommits
    };
  }
}

export default new AnalysisService();
