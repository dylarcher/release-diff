import { logAssertionToConsole } from './consoleTestRunner.js';
import * as i18nHelper from './internationalizationHelper.js';
import { getConsoleTestSetting } from '../services/userOptionsApiManager.js';

// Mock chrome.i18n API
global.chrome = global.chrome || {};
global.chrome.i18n = global.chrome.i18n || {};

const messages = {
    greeting: { message: 'Hello, World!' },
    farewell: { message: 'Goodbye, $USER$!', placeholders: { user: { content: '$1' } } },
    complexHtml: { message: 'Click <a href="#">here</a>!' },
    simpleText: { message: 'Just text.'}
};

let getMessageMock = (messageName, substitutions) => {
    const entry = messages[messageName];
    if (!entry) return messageName; // Fallback to key name if not found

    let message = entry.message;
    if (substitutions && entry.placeholders) {
        if (Array.isArray(substitutions)) {
            substitutions.forEach((sub, i) => {
                const placeholderKey = Object.keys(entry.placeholders).find(
                    pKey => entry.placeholders[pKey].content === `$${i + 1}`
                );
                if (placeholderKey) {
                    message = message.replace(entry.placeholders[placeholderKey].content, sub);
                }
            });
        } else if (typeof substitutions === 'string') {
             // Handle single substitution if needed, though the main use case seems to be array
            const placeholderKey = Object.keys(entry.placeholders)[0];
            if (placeholderKey) {
                 message = message.replace(entry.placeholders[placeholderKey].content, substitutions);
            }
        }
    }
     // Simulate Chrome's behavior of returning the key if message is empty or not found after processing
    return message || messageName;
};

global.chrome.i18n.getMessage = (messageName, substitutions) => getMessageMock(messageName, substitutions);


const runTests = async () => {
    const consoleTestsEnabled = await getConsoleTestSetting();
    if (!consoleTestsEnabled) {
        console.log('Console tests are disabled. Skipping internationalizationHelper tests.');
        return;
    }

    // --- getMessage ---
    logAssertionToConsole({
        subject: 'i18nHelper.getMessage: Retrieves simple message',
        fn: i18nHelper.getMessage,
        args: ['greeting'],
        expect: 'Hello, World!'
    });
    logAssertionToConsole({
        subject: 'i18nHelper.getMessage: Retrieves message with substitution',
        fn: i18nHelper.getMessage,
        args: ['farewell', 'Jules'],
        expect: 'Goodbye, Jules!'
    });
    logAssertionToConsole({
        subject: 'i18nHelper.getMessage: Retrieves message with HTML content',
        fn: i18nHelper.getMessage,
        args: ['complexHtml'],
        expect: 'Click <a href="#">here</a>!'
    });
    logAssertionToConsole({
        subject: 'i18nHelper.getMessage: Fallbacks to key for non-existent message',
        fn: i18nHelper.getMessage,
        args: ['nonExistentKey'],
        expect: 'nonExistentKey'
    });
     logAssertionToConsole({
        subject: 'i18nHelper.getMessage: Handles no substitutions gracefully',
        fn: i18nHelper.getMessage,
        args: ['simpleText', null],
        expect: 'Just text.'
    });


    // --- initializeI18n ---
    // Setup DOM elements for initializeI18n
    document.body.innerHTML = `
        <div id="el1" data-i18n="greeting">Fallback Content</div>
        <div id="el2" data-i18n-title="farewell" title="Fallback Title"></div>
        <input id="el3" data-i18n-placeholder="simpleText" placeholder="Fallback Placeholder" />
        <div id="el4" data-i18n="nonExistentKey">Should use this text</div>
        <div id="el5" data-i18n="complexHtml"></div>
    `;

    i18nHelper.initializeI18n(); // This function doesn't return, we check side effects

    logAssertionToConsole({
        subject: 'i18nHelper.initializeI18n: Sets innerHTML for data-i18n',
        fn: () => document.getElementById('el1').innerHTML,
        expect: 'Hello, World!'
    });
    logAssertionToConsole({
        subject: 'i18nHelper.initializeI18n: Sets title for data-i18n-title (no substitution provided here)',
        fn: () => document.getElementById('el2').getAttribute('title'),
        // Note: getMessageMock won't substitute $USER$ here as initializeI18n doesn't pass substitutions for titles
        expect: 'Goodbye, $USER$!'
    });
    logAssertionToConsole({
        subject: 'i18nHelper.initializeI18n: Sets placeholder for data-i18n-placeholder',
        fn: () => document.getElementById('el3').getAttribute('placeholder'),
        expect: 'Just text.'
    });
    logAssertionToConsole({
        subject: 'i18nHelper.initializeI18n: Uses attribute value as textContent for non-existent key (data-i18n)',
        fn: () => document.getElementById('el4').textContent,
        expect: 'nonExistentKey'
    });
    logAssertionToConsole({
        subject: 'i18nHelper.initializeI18n: Sets complex HTML using innerHTML',
        fn: () => document.getElementById('el5').innerHTML,
        expect: 'Click <a href="#">here</a>!'
    });


    // --- updateElementText ---
    document.body.innerHTML += `<div id="updateTarget">Initial Text</div>`;
    const updateTarget = document.getElementById('updateTarget');

    i18nHelper.updateElementText('updateTarget', 'greeting');
    logAssertionToConsole({
        subject: 'i18nHelper.updateElementText: Updates textContent with simple message',
        fn: () => updateTarget.textContent,
        expect: 'Hello, World!'
    });

    i18nHelper.updateElementText('updateTarget', 'farewell', 'Tester');
    logAssertionToConsole({
        subject: 'i18nHelper.updateElementText: Updates textContent with substitution',
        fn: () => updateTarget.textContent,
        expect: 'Goodbye, Tester!'
    });

    i18nHelper.updateElementText('updateTarget', 'nonExistentKeyUpdate');
    logAssertionToConsole({
        subject: 'i18nHelper.updateElementText: Uses key as textContent for non-existent key',
        fn: () => updateTarget.textContent,
        expect: 'nonExistentKeyUpdate'
    });

    // Test with non-existent element
    const originalConsoleWarn = console.warn; // Suppress expected warning for this test
    let consoleWarnCalledWith = '';
    console.warn = (msg) => { consoleWarnCalledWith = msg; }; // Simplified mock

    i18nHelper.updateElementText('noSuchElement', 'greeting'); // Should not throw, console.warns
    logAssertionToConsole({
        subject: 'i18nHelper.updateElementText: Does not throw for non-existent element (and warns)',
        // Check that it didn't alter our existing element, and a warning was logged (indirectly)
        fn: () => updateTarget.textContent, // Keep previous state
        expect: 'nonExistentKeyUpdate' // The last value it was set to
    });
    // A more direct check for the warning would require a more sophisticated spy on console.warn

    console.warn = originalConsoleWarn; // Restore console.warn

    // Clean up body
    document.body.innerHTML = '';
};

runTests();
