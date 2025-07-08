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

export default design
  .generateToken()
  .catch(console.warn);
