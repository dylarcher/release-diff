export const generateStylesheet = tokens => {
  let css = ':root {\n';

  function traverse(obj, prefix = '') {
    for (const key in obj) {
      if (key.startsWith('$')) continue;

      const value = obj[key];
      const newPrefix = prefix ? `${prefix}-${key}` : key;

      if (typeof value === 'object' && value !== null && !value.hasOwnProperty('$value')) {
        traverse(value, newPrefix);
      } else if (value.hasOwnProperty('$value')) {
        css += `  --${newPrefix}: ${value.$value};\n`;
      }
    }
  }

  traverse(tokens);
  css += '}\n';
  return css;
}

export const DS = async tokenSegments => {
  const designTokens = {};
  for (const segment of tokenSegments) {
    const response = await fetch(`../shared/design/_segments/${segment}.json`);
    const data = await response.json();
    Object.assign(designTokens, data);
  }
  const stylesheet = generateStylesheet(designTokens);
  const styleElement = document.createElement('style');
  styleElement.textContent = stylesheet;
  document.head.appendChild(styleElement);
}
