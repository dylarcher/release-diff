import { logAssertionToConsole } from './consoleTestRunner.js';
import * as formValidationHelpers from './formValidationHelpers.js';
import { getConsoleTestSetting } from '../services/userOptionsApiManager.js';

const runTests = async () => {
    const consoleTestsEnabled = await getConsoleTestSetting();
    if (!consoleTestsEnabled) {
        console.log('Console tests are disabled. Skipping formValidationHelpers tests.');
        return;
    }

    // --- validateRequiredFields ---
    logAssertionToConsole({
        subject: 'formValidationHelpers.validateRequiredFields: All fields valid',
        fn: () => formValidationHelpers.validateRequiredFields({ a: '1', b: '2' }).isValid,
        expect: true
    });
    logAssertionToConsole({
        subject: 'formValidationHelpers.validateRequiredFields: One field empty string',
        fn: () => formValidationHelpers.validateRequiredFields({ a: '1', b: '' }).isValid,
        expect: false
    });
    logAssertionToConsole({
        subject: 'formValidationHelpers.validateRequiredFields: One field null',
        fn: () => formValidationHelpers.validateRequiredFields({ a: '1', b: null }).isValid,
        expect: false
    });
    logAssertionToConsole({
        subject: 'formValidationHelpers.validateRequiredFields: One field undefined',
        fn: () => formValidationHelpers.validateRequiredFields({ a: '1', b: undefined }).isValid,
        expect: false
    });
    logAssertionToConsole({
        subject: 'formValidationHelpers.validateRequiredFields: One field whitespace',
        fn: () => formValidationHelpers.validateRequiredFields({ a: '1', b: '   ' }).isValid,
        expect: false
    });
    const missingFieldsResult = formValidationHelpers.validateRequiredFields({ a: '1', b: '', c: null, d: '  ' });
    logAssertionToConsole({
        subject: 'formValidationHelpers.validateRequiredFields: Reports missing fields correctly',
        fn: () => JSON.stringify(missingFieldsResult.missingFields.sort()), // Sort for consistent comparison
        expect: JSON.stringify(['b', 'c', 'd'].sort())
    });
    logAssertionToConsole({
        subject: 'formValidationHelpers.validateRequiredFields: No missing fields',
        fn: () => formValidationHelpers.validateRequiredFields({ a: '1', b: '2' }).missingFields.length,
        expect: 0
    });


    // --- extractFormFieldValues ---
    // Mock input elements for testing
    const input1 = { value: '  value1  ' };
    const input2 = { value: 'value2' };
    const input3 = { value: '  ' };
    const input4 = { value: '' };

    const extractedValues = formValidationHelpers.extractFormFieldValues(input1, input2, input3, input4);
    logAssertionToConsole({
        subject: 'formValidationHelpers.extractFormFieldValues: Extracts and trims values',
        fn: () => JSON.stringify(extractedValues),
        expect: JSON.stringify(['value1', 'value2', '', ''])
    });

    const noValues = formValidationHelpers.extractFormFieldValues();
    logAssertionToConsole({
        subject: 'formValidationHelpers.extractFormFieldValues: Handles no arguments',
        fn: () => JSON.stringify(noValues),
        expect: JSON.stringify([])
    });
};

runTests();
