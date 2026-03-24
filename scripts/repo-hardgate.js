#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');

const JS_IMPORT_PATTERN = /require\(\s*['"]([^'"]+)['"]\s*\)|import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/g;
const PLATFORM_ADAPTER_PATTERN = /^src\/main\/platform\/adapters\/.+\.js$/;
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

function stripCommentsAndStrings(source) {
  let result = '';
  let state = 'code';
  let quote = null;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (state === 'code') {
      if (char === '/' && next === '/') {
        state = 'line-comment';
        result += '  ';
        i += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        state = 'block-comment';
        result += '  ';
        i += 1;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        state = char === '`' ? 'template' : 'string';
        quote = char;
        result += ' ';
        continue;
      }

      result += char;
      continue;
    }

    if (state === 'line-comment') {
      if (char === '\n') {
        state = 'code';
        result += '\n';
      } else {
        result += ' ';
      }
      continue;
    }

    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'code';
        result += '  ';
        i += 1;
      } else {
        result += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (state === 'string' || state === 'template') {
      if (char === '\\') {
        result += '  ';
        i += 1;
        if (i < source.length) {
          result += source[i] === '\n' ? '\n' : ' ';
        }
        continue;
      }

      if (char === quote) {
        state = 'code';
        quote = null;
        result += ' ';
        continue;
      }

      result += char === '\n' ? '\n' : ' ';
    }
  }

  return result;
}

function hasServicePlatformBranch(content) {
  const stripped = stripCommentsAndStrings(content);
  const directAccessPattern = /\bprocess\s*(?:\.\s*platform|\[\s*['"]platform['"]\s*\])/;
  const destructuredPattern = /\b(?:const|let|var)\s*\{[^}]*\bplatform\b[^}]*\}\s*=\s*process\b/;

  return directAccessPattern.test(stripped) || destructuredPattern.test(stripped);
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

      if (
        repoPath === 'src/main/index.js' &&
        importedRepoPath.startsWith('src/main/platform/adapters/')
      ) {
        violations.push({
          ruleId: 'LTD-001',
          file: repoPath,
          detail: `Main entry imports platform adapter "${fileImport.specifier}". Import "./platform" instead.`
        });
      }

      if (
        importsPlatformAdapter &&
        repoPath !== 'src/main/platform/index.js' &&
        !repoPath.startsWith('tests/')
      ) {
        violations.push({
          ruleId: 'LTD-002',
          file: repoPath,
          detail: `Only src/main/platform/index.js may import platform adapters such as "${fileImport.specifier}". Route adapter selection through the platform selector.`
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