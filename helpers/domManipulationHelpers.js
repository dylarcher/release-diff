export function clearElementContent(element) {
  element.innerHTML = '';
}

export function createLinkElement(href, text, targetBlank = true) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  if (targetBlank) {
    link.target = '_blank';
  }
  return link;
}

export function createListItemWithOptionalLink(text, link = null) {
  const li = document.createElement('li');

  if (link) {
    const a = createLinkElement(link, text);
    a.classList.add('jira-link');
    li.appendChild(a);
  } else {
    li.innerHTML = text;
  }

  return li;
}

export function populateDatalistWithOptions(datalist, options, valueKey = 'name', dataKey = 'id') {
  clearElementContent(datalist);

  if (options.length === 0) {
    return;
  }

  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option[valueKey];
    if (dataKey && option[dataKey]) {
      optionElement.dataset.id = option[dataKey];
    }
    datalist.appendChild(optionElement);
  });
}

export function createDiscrepancyItemDiv(className, htmlContent) {
  const div = document.createElement('div');
  div.className = className;
  div.innerHTML = htmlContent;
  return div;
}
