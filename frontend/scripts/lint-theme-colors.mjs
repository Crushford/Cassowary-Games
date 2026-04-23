import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, 'src');

const PALETTE_FAMILIES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTILITY_PREFIX =
  '(?:bg|text|border(?:-[trblxy])?|from|to|ring(?:-offset)?|fill|stroke)';

const DISALLOWED_COLOR_SCALE_CLASS =
  new RegExp(
    `\\b${COLOR_UTILITY_PREFIX}-(?:${PALETTE_FAMILIES})-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d{1,3})?\\b`,
    'g'
  );
const DISALLOWED_THEME_SCALE_CLASS =
  new RegExp(
    `\\b${COLOR_UTILITY_PREFIX}-theme-(?:${PALETTE_FAMILIES})-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d{1,3})?\\b`,
    'g'
  );
const DISALLOWED_ARBITRARY_COLOR_CLASS = new RegExp(
  `\\b${COLOR_UTILITY_PREFIX}-\\[(?:#|rgb|hsl|hwb|lab|lch|oklab|oklch)[^\\]]*\\]`,
  'gi'
);
const DISALLOWED_CUSTOM_THEME_OPACITY_CLASS = new RegExp(
  `\\b${COLOR_UTILITY_PREFIX}-(?:semantic|app|group|queens|incremental|plaque|nature|status|surface|feedback|edge|ink)-[a-zA-Z0-9-]+\\/\\d{1,3}\\b`,
  'g'
);

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(vue|ts|js)$/.test(entry.name)) continue;
    files.push(fullPath);
  }
  return files;
}

function getLineAndColumn(source, index) {
  const prefix = source.slice(0, index);
  const lines = prefix.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

function collectViolations(filePath, source, regex, label) {
  const violations = [];
  const matches = source.matchAll(regex);
  for (const match of matches) {
    const at = match.index ?? 0;
    const { line, column } = getLineAndColumn(source, at);
    violations.push({
      filePath,
      line,
      column,
      label,
      value: match[0],
    });
  }
  return violations;
}

// Files allowed to use raw Tailwind color-scale classes (e.g. proof-of-concept
// admin tooling that needs a large decorative palette not covered by the theme).
const EXCLUDED_FILES = new Set([
  path.join(SRC_DIR, 'games/queens/components/admin/QueensAdminStitchingPanel.vue'),
]);

const targetFiles = walk(SRC_DIR);

const violations = [];
for (const filePath of targetFiles) {
  if (EXCLUDED_FILES.has(filePath)) continue;
  const source = fs.readFileSync(filePath, 'utf8');
  violations.push(
    ...collectViolations(
      filePath,
      source,
      DISALLOWED_COLOR_SCALE_CLASS,
      'raw-tailwind-color-scale'
    ),
    ...collectViolations(
      filePath,
      source,
      DISALLOWED_THEME_SCALE_CLASS,
      'non-semantic-theme-scale'
    ),
    ...collectViolations(
      filePath,
      source,
      DISALLOWED_ARBITRARY_COLOR_CLASS,
      'arbitrary-color-value'
    ),
    ...collectViolations(
      filePath,
      source,
      DISALLOWED_CUSTOM_THEME_OPACITY_CLASS,
      'custom-theme-opacity-inline'
    )
  );
}

if (violations.length > 0) {
  console.error('Theme color lint failed. Use Tailwind theme tokens instead of raw palette classes.');
  for (const violation of violations) {
    const rel = path.relative(ROOT, violation.filePath);
    console.error(
      `${rel}:${violation.line}:${violation.column} ${violation.label} ${violation.value}`
    );
  }
  process.exit(1);
}

console.log(`Theme color lint passed (${targetFiles.length} enforced file(s)).`);
