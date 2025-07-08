export const design = {
  colors: {},
  element: {},
  motion: {},
  fonts: {},
  sizing: {},
  depth: {},
  _meta: {},
  zindex: {},

  async generateToken() {
    const presets = [
      ["colors", "./_segments/colors.json"],
      ["element", "./_segments/element.json"],
      ["motion", "./_segments/motion.json"],
      ["fonts", "./_segments/fonts.json"],
      ["sizing", "./_segments/sizing.json"],
      ["depth", "./_segments/depth.json"],
      ["_meta", "./_segments/_meta.json"],
      ["zindex", "./_segments/layers.json"],
    ];

    for (const [name, path] of presets) {
      const options = { assert: { type: 'json' } };
      const module = (await import(path, options))?.default || {};
      design[name] = module;
    }

    delete design.tokens;
    const obj = { ...design };
    const arr = Object.entries(obj);
    const map = new Map(arr);

    return { map, obj, arr };
  }
};

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

export default design
  .generateToken()
  .catch(console.warn);
