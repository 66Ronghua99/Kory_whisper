#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');

const JS_IMPORT_PATTERN = /require\(\s*['"]([^'"]+)['"]\s*\)|import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/g;
const PLATFORM_ADAPTER_PATTERN = /^src\/main\/platform\/adapters\/.+\.js$/;
const PLATFORM_LEGACY_SELECTOR_PATTERN = /^src\/main\/platform\/(?:audio|input|audio-cues)-(?:darwin|win32)\.js$/;
const RENDERER_FORBIDDEN_PATTERNS = [
  {
    id: 'renderer-child-process',
    pattern: /require\(\s*['"]child_process['"]\s*\)|from\s+['"]child_process['"]/,
    message: 'Move child-process access behind the main process instead of invoking it from renderer code.'
  },
  {
    id: 'renderer-global-keyboard',
    pattern: /require\(\s*['"]uiohook-napi['"]\s*\)|from\s+['"]uiohook-napi['"]/,
    message: 'Renderer code must not talk to the global keyboard listener directly; route through main-process IPC.'
  },
  {
    id: 'renderer-whisper-bin',
    pattern: /whisper-cli|\/System\/Library\/Sounds|afplay/,
    message: 'Renderer code must not shell out to bundled binaries or system sounds directly.'
  }
];

function toRepoPath(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function listFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolvedBase = path.resolve(path.dirname(fromFile), specifier);
  const withExtension = resolvedBase.endsWith('.js') ? resolvedBase : `${resolvedBase}.js`;

  if (fs.existsSync(withExtension)) {
    return withExtension;
  }

  const asIndex = path.join(resolvedBase, 'index.js');
  if (fs.existsSync(asIndex)) {
    return asIndex;
  }

  return null;
}

function collectImports(filePath, content) {
  const imports = [];
  for (const match of content.matchAll(JS_IMPORT_PATTERN)) {
    const specifier = match[1] || match[2];
    const resolved = resolveImport(filePath, specifier);
    imports.push({
      specifier,
      resolved
    });
  }
  return imports;
}

function tokenizeJavaScript(source) {
  const tokens = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') {
        i += 1;
      }
      continue;
    }

    if (char === '/' && next === '*') {
      i += 2;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          i += 2;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      let value = '';
      i += 1;

      while (i < source.length) {
        const current = source[i];
        if (current === '\\') {
          value += current;
          i += 1;
          if (i < source.length) {
            value += source[i];
            i += 1;
          }
          continue;
        }

        if (current === quote) {
          i += 1;
          break;
        }

        value += current;
        i += 1;
      }

      tokens.push({ type: 'string', value });
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      let value = char;
      i += 1;
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i])) {
        value += source[i];
        i += 1;
      }
      tokens.push({ type: 'identifier', value });
      continue;
    }

    tokens.push({ type: 'punctuation', value: char });
    i += 1;
  }

  return tokens;
}

function findMatchingPunctuation(tokens, startIndex, openValue, closeValue) {
  let depth = 0;

  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'punctuation') {
      continue;
    }

    if (token.value === openValue) {
      depth += 1;
      continue;
    }

    if (token.value === closeValue) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function hasServicePlatformBranch(content) {
  const tokens = tokenizeJavaScript(content);

  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    const afterNext = tokens[index + 2];
    const afterAfterNext = tokens[index + 3];

    if (
      current?.type === 'identifier' && current.value === 'process' &&
      next?.type === 'punctuation' && next.value === '.' &&
      afterNext?.type === 'identifier' && afterNext.value === 'platform'
    ) {
      return true;
    }

    if (
      current?.type === 'identifier' && current.value === 'process' &&
      next?.type === 'punctuation' && next.value === '?' &&
      afterNext?.type === 'punctuation' && afterNext.value === '.' &&
      afterAfterNext?.type === 'identifier' && afterAfterNext.value === 'platform'
    ) {
      return true;
    }

    if (
      current?.type === 'identifier' && current.value === 'process' &&
      next?.type === 'punctuation' && next.value === '[' &&
      afterNext?.type === 'string' && afterNext.value === 'platform' &&
      afterAfterNext?.type === 'punctuation' && afterAfterNext.value === ']'
    ) {
      return true;
    }

    if (
      current?.type === 'identifier' && ['const', 'let', 'var'].includes(current.value) &&
      next?.type === 'punctuation' && next.value === '{'
    ) {
      const closingBraceIndex = findMatchingPunctuation(tokens, index + 1, '{', '}');
      if (closingBraceIndex === -1) {
        continue;
      }

      const equalsToken = tokens[closingBraceIndex + 1];
      const sourceToken = tokens[closingBraceIndex + 2];
      if (
        equalsToken?.type !== 'punctuation' ||
        equalsToken.value !== '=' ||
        sourceToken?.type !== 'identifier' ||
        sourceToken.value !== 'process'
      ) {
        continue;
      }

      const destructuringTokens = tokens.slice(index + 2, closingBraceIndex);
      const hasPlatformBinding = destructuringTokens.some((token) => token.type === 'identifier' && token.value === 'platform');
      if (hasPlatformBinding) {
        return true;
      }
    }
  }

  return false;
}

function analyzeRepository() {
  const violations = [];
  const files = listFiles(srcRoot);

  for (const filePath of files) {
    const repoPath = toRepoPath(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = collectImports(filePath, content);

    for (const fileImport of imports) {
      if (!fileImport.resolved) {
        continue;
      }

      const importedRepoPath = toRepoPath(fileImport.resolved);
      const importsPlatformAdapter = PLATFORM_ADAPTER_PATTERN.test(importedRepoPath);
      const importsLegacyPlatformLeaf = PLATFORM_LEGACY_SELECTOR_PATTERN.test(importedRepoPath);
      const importsSelectorOwnedPlatformLeaf = importsPlatformAdapter || importsLegacyPlatformLeaf;

      if (
        repoPath === 'src/main/index.js' &&
        importsSelectorOwnedPlatformLeaf
      ) {
        violations.push({
          ruleId: 'LTD-001',
          file: repoPath,
          detail: `Main entry imports selector-owned platform module "${fileImport.specifier}". Import "./platform" instead.`
        });
      }

      if (
        importsSelectorOwnedPlatformLeaf &&
        repoPath !== 'src/main/platform/index.js' &&
        !repoPath.startsWith('tests/')
      ) {
        violations.push({
          ruleId: 'LTD-002',
          file: repoPath,
          detail: `Only src/main/platform/index.js may import platform adapters or legacy selector-owned leaves such as "${fileImport.specifier}". Route selection through the platform selector.`
        });
      }
    }

    if (repoPath.startsWith('src/renderer/')) {
      for (const check of RENDERER_FORBIDDEN_PATTERNS) {
        if (check.pattern.test(content)) {
          violations.push({
            ruleId: 'LTD-003',
            file: repoPath,
            detail: `${check.id}: ${check.message}`
          });
        }
      }
    }

    if (repoPath.startsWith('src/main/services/') && hasServicePlatformBranch(content)) {
      violations.push({
        ruleId: 'LTD-004',
        file: repoPath,
        detail: 'Business-service modules must resolve runtime platform facts before branching instead of reading process.platform directly.'
      });
    }
  }

  return violations;
}

function formatViolations(violations) {
  return violations.map((violation) => `${violation.ruleId} ${violation.file}\n  ${violation.detail}`).join('\n');
}

function main() {
  const violations = analyzeRepository();
  if (violations.length === 0) {
    console.log('repo-hardgate: OK');
    return 0;
  }

  console.error('repo-hardgate: boundary violations found');
  console.error(formatViolations(violations));
  return 1;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  analyzeRepository,
  formatViolations
};
