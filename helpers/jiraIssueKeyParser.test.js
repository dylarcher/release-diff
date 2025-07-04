import { logAssertionToConsole } from './consoleTestRunner.js';
import * as jiraIssueKeyParser from './jiraIssueKeyParser.js';
import { getConsoleTestSetting } from '../services/userOptionsApiManager.js';

const runTests = async () => {
    const consoleTestsEnabled = await getConsoleTestSetting();
    if (!consoleTestsEnabled) {
        console.log('Console tests are disabled. Skipping jiraIssueKeyParser tests.');
        return;
    }

    // --- extractJiraIssueKeysFromText ---
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Extracts single key',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('This is a test for JIRA-123')),
        expect: JSON.stringify(['JIRA-123'])
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Extracts multiple keys',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('ABC-456 and XYZ-789').sort()),
        expect: JSON.stringify(['ABC-456', 'XYZ-789'].sort())
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Handles duplicates (and sorts for test consistency)',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('TEST-1, TEST-2, TEST-1').sort()),
        expect: JSON.stringify(['TEST-1', 'TEST-2'].sort())
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Handles lowercase keys and converts to uppercase',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('fix for proj-007')),
        expect: JSON.stringify(['PROJ-007'])
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: No keys found',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('No issue keys here.')),
        expect: JSON.stringify([])
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Keys with numbers in project name',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('PRJ123-1 and APP45-56')),
        expect: JSON.stringify(['PRJ123-1', 'APP45-56'])
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Mixed case keys',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('Fixes TesT-123 and dev-PROJ-456').sort()),
        expect: JSON.stringify(['TEST-123', 'DEV-PROJ-456'].sort())
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Empty string input',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('')),
        expect: JSON.stringify([])
    });
     logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Keys adjacent to punctuation',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('(DEV-123), [PROJ-456]. OTHER-789!').sort()),
        expect: JSON.stringify(['DEV-123', 'PROJ-456', 'OTHER-789'].sort())
    });
    logAssertionToConsole({
        subject: 'jiraIssueKeyParser.extractJiraIssueKeysFromText: Minimum two letters for project key part',
        fn: () => JSON.stringify(jiraIssueKeyParser.extractJiraIssueKeysFromText('A-123 should not match, but AB-123 should').sort()),
        expect: JSON.stringify(['AB-123'].sort())
    });
};

runTests();
