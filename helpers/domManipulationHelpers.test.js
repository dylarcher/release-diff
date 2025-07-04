import { logAssertionToConsole } from './consoleTestRunner.js';
import * as domManipulationHelpers from './domManipulationHelpers.js';
import { getConsoleTestSetting } from '../services/userOptionsApiManager.js';

const runTests = async () => {
    const consoleTestsEnabled = await getConsoleTestSetting();
    if (!consoleTestsEnabled) {
        console.log('Console tests are disabled. Skipping domManipulationHelpers tests.');
        return;
    }

    // --- clearElementContent ---
    const clearElementContent_Target = document.createElement('div');
    clearElementContent_Target.innerHTML = '<span>Hello</span>';
    logAssertionToConsole({
        subject: 'domManipulationHelpers.clearElementContent: Clears content',
        fn: () => {
            domManipulationHelpers.clearElementContent(clearElementContent_Target);
            return clearElementContent_Target.innerHTML;
        },
        expect: ''
    });

    // --- createLinkElement ---
    const linkEl = domManipulationHelpers.createLinkElement('https://example.com', 'Example');
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createLinkElement: Creates an anchor element',
        fn: () => linkEl.tagName,
        expect: 'A'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createLinkElement: Sets href correctly',
        fn: () => linkEl.getAttribute('href'),
        expect: 'https://example.com'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createLinkElement: Sets textContent correctly',
        fn: () => linkEl.textContent,
        expect: 'Example'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createLinkElement: Sets target to _blank by default',
        fn: () => linkEl.target,
        expect: '_blank'
    });
    const linkElNoBlank = domManipulationHelpers.createLinkElement('https://example.com', 'ExampleNB', false);
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createLinkElement: Sets target to empty if targetBlank is false',
        fn: () => linkElNoBlank.target,
        expect: ''
    });


    // --- createListItemWithOptionalLink ---
    const listItemNoLink = domManipulationHelpers.createListItemWithOptionalLink('Simple Text');
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createListItemWithOptionalLink: Creates LI element (no link)',
        fn: () => listItemNoLink.tagName,
        expect: 'LI'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createListItemWithOptionalLink: Sets innerHTML for text (no link)',
        fn: () => listItemNoLink.innerHTML,
        expect: 'Simple Text'
    });

    const listItemWithLink = domManipulationHelpers.createListItemWithOptionalLink('Link Text', 'https://linked.example.com');
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createListItemWithOptionalLink: Creates LI element (with link)',
        fn: () => listItemWithLink.tagName,
        expect: 'LI'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createListItemWithOptionalLink: Contains an anchor child (with link)',
        fn: () => listItemWithLink.children[0]?.tagName,
        expect: 'A'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createListItemWithOptionalLink: Anchor has correct href (with link)',
        fn: () => listItemWithLink.children[0]?.getAttribute('href'),
        expect: 'https://linked.example.com'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createListItemWithOptionalLink: Anchor has correct textContent (with link)',
        fn: () => listItemWithLink.children[0]?.textContent,
        expect: 'Link Text'
    });
     logAssertionToConsole({
        subject: 'domManipulationHelpers.createListItemWithOptionalLink: Anchor has jira-link class (with link)',
        fn: () => listItemWithLink.children[0]?.classList.contains('jira-link'),
        expect: true
    });

    // --- populateDatalistWithOptions ---
    const datalist = document.createElement('datalist');
    const options = [
        { value: 'val1', id: 'id1', name: 'Opt1' },
        { value: 'val2', id: 'id2', name: 'Opt2' }
    ];
    domManipulationHelpers.populateDatalistWithOptions(datalist, options, 'name', 'id');
    logAssertionToConsole({
        subject: 'domManipulationHelpers.populateDatalistWithOptions: Populates options correctly',
        fn: () => datalist.children.length,
        expect: 2
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.populateDatalistWithOptions: Sets option value correctly',
        fn: () => datalist.children[0]?.value,
        expect: 'Opt1'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.populateDatalistWithOptions: Sets option data-id correctly',
        fn: () => datalist.children[0]?.dataset.id,
        expect: 'id1'
    });

    const datalistCleared = document.createElement('datalist');
    datalistCleared.innerHTML = '<option value="old">';
    domManipulationHelpers.populateDatalistWithOptions(datalistCleared, [], 'name', 'id');
     logAssertionToConsole({
        subject: 'domManipulationHelpers.populateDatalistWithOptions: Clears existing options',
        fn: () => datalistCleared.children.length,
        expect: 0
    });


    // --- createDiscrepancyItemDiv ---
    const discrepancyDiv = domManipulationHelpers.createDiscrepancyItemDiv('my-class', '<span>Content</span>');
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createDiscrepancyItemDiv: Creates a DIV element',
        fn: () => discrepancyDiv.tagName,
        expect: 'DIV'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createDiscrepancyItemDiv: Sets className correctly',
        fn: () => discrepancyDiv.className,
        expect: 'my-class'
    });
    logAssertionToConsole({
        subject: 'domManipulationHelpers.createDiscrepancyItemDiv: Sets innerHTML correctly',
        fn: () => discrepancyDiv.innerHTML,
        expect: '<span>Content</span>'
    });
};

runTests();
