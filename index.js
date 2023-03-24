#!/usr/bin/env node
const fs = require('fs').promises;

async function main() {
  const cssFileName = process.argv[2];

  if (!cssFileName || !cssFileName.endsWith('.css')) {
    console.error('Please provide a valid CSS file name as the argument');
    process.exit(1);
  }

  const cssFileContents = await fs.readFile(cssFileName, 'utf8');
  const variables = cssFileContents.match(/--[\w-]+: ([^;]+);/g);

  const sectionFileContents = `
<style>
:root {
  ${variables.map((variable) => {
    const [_, name, value] = variable.match(/--([\w-]+):\s?(.+);/);

    if (value.includes('var(') || value === 'inherit') {
      return `--${name}: ${value};`;
    }

    return `--${name}: {{ section.settings.${name} }};`;
  }).join('\n')}
}
</style>
{% schema %}
{
  "name": "${cssFileName.replace('.css', '')}",
  "settings": [
${variables.map((variable) => {
  const [_, name, value] = variable.match(/--([\w-]+):\s?(.+);/);

  if (value.includes('var(') || value === 'inherit') {
    return null;
  }

  let settingType = '';
  let defaultValue = value;

  if (value.match(/#(?:[0-9a-fA-F]{3}){1,2}/) || value.match(/\d+,\s?\d+,\s?\d+/)) {
    settingType = 'color';
    if (value.match(/\d+,\s?\d+,\s?\d+/)) {
      defaultValue = rgbToHex(value);
    }
  } else {
    settingType = 'text';
  }

  const label = name.replace(/[-_\/\d]/g, ' ').replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1)).trim();

  return `    {
      "type": "${settingType}",
      "id": "${name}",
      "label": "${label}",
      "default": "${defaultValue}"
    }`;
}).filter((setting) => setting !== null).join(',\n')}
  ]
}
{% endschema %}
`;

  const sectionFileName = cssFileName.replace('.css', '.liquid');
  await fs.writeFile(sectionFileName, sectionFileContents);

  console.log(`Generated ${sectionFileName}`);
}

function rgbToHex(rgb) {
  const [r, g, b] = rgb.split(',').map((c) => parseInt(c.trim()));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
