import { DOM_ELEMENTS, CSS_CLASSES, DEFAULT_VALUES } from '../shared/presetConstants.js';

class DomManipulationHelpers {
  static clearElementContent(element) {
    element.innerHTML = '';
  }

  static createLinkElement(href, text, targetBlank = true) {
    const link = document.createElement(DOM_ELEMENTS.ANCHOR);
    link.href = href;
    link.textContent = text;
    if (targetBlank) {
      link.target = DEFAULT_VALUES.LINK_TARGET_BLANK;
    }
    return link;
  }

  static createListItemWithOptionalLink(text, link = null) {
    const li = document.createElement(DOM_ELEMENTS.LIST_ITEM);

    const content = {
      true: () => {
        const a = this.createLinkElement(link, text);
        a.classList.add(CSS_CLASSES.JIRA_LINK);
        return a;
      },
      false: () => text
    }[Boolean(link)];

    if (Boolean(link)) {
      li.appendChild(content());
    } else {
      li.innerHTML = content();
    }

    return li;
  }

  static populateDatalistWithOptions(datalist, options, valueKey = DEFAULT_VALUES.DATALIST_VALUE_KEY, dataKey = DEFAULT_VALUES.DATALIST_DATA_KEY) {
    this.clearElementContent(datalist);

    if (options.length === 0) {
      return;
    }

    for (const option of options) {
      const optionElement = document.createElement(DOM_ELEMENTS.OPTION);
      optionElement.value = option[valueKey];
      if (dataKey && option[dataKey]) {
        optionElement.dataset.id = option[dataKey];
      }
      datalist.appendChild(optionElement);
    }
  }

  static createDiscrepancyItemDiv(className, htmlContent) {
    const div = document.createElement(DOM_ELEMENTS.DIV);
    div.className = className;
    div.innerHTML = htmlContent;
    return div;
  }
}

// Export individual functions for backward compatibility
export const clearElementContent = DomManipulationHelpers.clearElementContent;
export const createLinkElement = DomManipulationHelpers.createLinkElement;
export const createListItemWithOptionalLink = DomManipulationHelpers.createListItemWithOptionalLink;
export const populateDatalistWithOptions = DomManipulationHelpers.populateDatalistWithOptions;
export const createDiscrepancyItemDiv = DomManipulationHelpers.createDiscrepancyItemDiv;
export default DomManipulationHelpers;
