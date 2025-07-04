/**
 * @fileoverview A utility to test functions with console methods for debugging and inspection.
 * @author Dylan Archer
 */

const { time, table, info, assert, groupCollapsed, timeEnd, groupEnd, count, warn } = console;

/**
 * @typedef {object} TestArgs
 * @property {string} subject - The name of the test.
 * @property {Function} fn - The function to be tested.
 * @property {any[]} [args] - The arguments to be passed to the function.
 * @property {any} [expect] - The expected result of the function.
 */
export const logAssertionToConsole = (/** @type {TestArgs} */ { subject, fn, args = [], expect }) => {
  try {
    groupCollapsed(subject);
    count(`#️⃣ Caller`);

    time('⏱️ Timing');
    const actual = fn(...args);
    timeEnd('⏱️ Timing');

    const status = expect === actual;
    info('🗺️ Expect:', expect);

    typeof actual === 'object'
      ? table(JSON.stringify(actual, null, 2))
      : info('☑️ Actual:', actual);
    info(`${status ? '✅' : '❌'} %cStatus: ${actual} ${status ? '===' : '!=='} ${expect}`, `color: ${!status ? 'tomato' : 'seagreen'}; font - weight: 800; `);

    assert(status, subject);
    !!status && warn(`Assertion passed:`, subject);

    groupEnd();
    return status;
  }
  catch (/** @type {any} */ error) {
    const { message = error } = error ?? {};
    groupCollapsed(message);
    count(`COUNT`);
    groupEnd();
    return false;
  }
};
