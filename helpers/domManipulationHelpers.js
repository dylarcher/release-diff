import { getMessage } from './internationalizationHelper.js';
import { USER_MESSAGES, STATUS_TYPES, CSS_CLASSES } from '../shared/presetConstants.js';
import { displayStatusMessage } from '../services/statusDisplayManager.js';

export function clearElementContent(element) {
    if (element) {
        element.innerHTML = '';
    }
}

export function populateDatalistWithOptions(datalist, options) {
    clearElementContent(datalist);
    if (datalist && options) {
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.name;
            optionElement.dataset.id = option.id;
            datalist.appendChild(optionElement);
        });
    }
}

export function createDiscrepancyItemDiv(className, innerHTML) {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = innerHTML;
    return div;
}

export function createButton(id, text, classes = [], clickHandler) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.className = classes.join(' ');
    if (clickHandler) {
        button.addEventListener('click', clickHandler);
    }
    return button;
}

export function createDiv(id, classes = [], children = []) {
    const div = document.createElement('div');
    div.id = id;
    div.className = classes.join(' ');
    children.forEach(child => div.appendChild(child));
    return div;
}

export function createLink(href, text, classes = [], target = '_blank') {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    link.className = classes.join(' ');
    link.target = target;
    link.rel = 'noopener noreferrer';
    return link;
}

export function createElement(tag, { id, classes = [], text, children = [] }) {
    const el = document.createElement(tag);
    if (id) el.id = id;
    if (classes.length) el.className = classes.join(' ');
    if (text) el.textContent = text;
    children.forEach(child => el.appendChild(child));
    return el;
}

export function resetForm(elements) {
    const {
        jiraProjectKeyInput,
        jiraFixVersionInput,
        gitlabProjectIdInput,
        gitlabCurrentTagInput,
        gitlabPreviousTagInput,
        statusMessageDiv,
        summaryResultsDiv,
        jiraTicketsDiv,
        gitlabHistoryDiv,
        versionsDatalist,
        viewDemoReportDetails
    } = elements;

    // Clear input fields
    jiraProjectKeyInput.value = '';
    jiraFixVersionInput.value = '';
    gitlabProjectIdInput.value = '';
    gitlabCurrentTagInput.value = '';
    gitlabPreviousTagInput.value = '';

    // Clear messages and results
    clearElementContent(statusMessageDiv);
    clearElementContent(summaryResultsDiv);
    clearElementContent(jiraTicketsDiv);
    clearElementContent(gitlabHistoryDiv);
    clearElementContent(versionsDatalist);

    // Hide summary results and close demo details
    summaryResultsDiv.classList.add(CSS_CLASSES.HIDDEN);
    viewDemoReportDetails.open = false;

    // Optionally, clear storage
    chrome.storage.local.remove(['formData']);

    displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.RESET_FORM), STATUS_TYPES.INFO);
}
