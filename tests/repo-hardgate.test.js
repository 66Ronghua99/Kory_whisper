const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  analyzeRepository,
  formatViolations,
  main
} = require('../scripts/repo-hardgate.js');

function test(name, fn) {
  return nodeTest(name, { concurrency: false }, fn);
}

function writeTempServiceModule(name, source) {
  const filePath = path.join(__dirname, '..', 'src', 'main', 'services', name);
  fs.writeFileSync(filePath, source, 'utf8');
  return filePath;
}

function withTempServiceModule(name, source, fn) {
  const filePath = writeTempServiceModule(name, source);
  try {
    return fn(filePath);
  } finally {
    fs.unlinkSync(filePath);
  }
}

function writeTempRendererFile(name, source) {
  const filePath = path.join(__dirname, '..', 'src', 'renderer', name);
  fs.writeFileSync(filePath, source, 'utf8');
  return filePath;
}

function withTempRendererFile(name, source, fn) {
  const filePath = writeTempRendererFile(name, source);
  try {
    return fn(filePath);
  } finally {
    fs.unlinkSync(filePath);
  }
}

function withTempRepository(files, fn) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kory-whisper-hardgate-'));

  try {
    for (const [relativePath, source] of Object.entries(files)) {
      const filePath = path.join(repoRoot, relativePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, source, 'utf8');
    }

    return fn({
      repoRoot,
      srcRoot: path.join(repoRoot, 'src')
    });
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
}

test('repo hardgate passes against the current repository state without platform-ui ownership exceptions', () => {
  const violations = analyzeRepository();

  assert.deepEqual(violations, []);
});

test('repo hardgate formats violations with rule id and remediation detail', () => {
  const output = formatViolations([
    {
      ruleId: 'LTD-001',
      file: 'src/main/index.js',
      detail: 'Import "./platform" instead.'
    }
  ]);

  assert.match(output, /LTD-001 src\/main\/index\.js/);
  assert.match(output, /Import "\.\/platform" instead\./);
});

test('repo hardgate rejects direct service-layer process.platform access', () => {
  withTempServiceModule(
    '__temp-platform-dot.js',
    "if (process.platform === 'darwin') {\n  module.exports = true;\n}\n",
    () => {
      const violations = analyzeRepository();
      const serviceViolation = violations.find((violation) => violation.ruleId === 'LTD-004');

      assert.ok(serviceViolation, 'expected a direct service-layer platform violation');
      assert.equal(serviceViolation.file, 'src/main/services/__temp-platform-dot.js');
      assert.match(serviceViolation.detail, /process\.platform/);
    }
  );
});

test('repo hardgate rejects destructured service-layer platform aliases', () => {
  withTempServiceModule(
    '__temp-platform-destructured.js',
    "const { platform: runtimePlatform } = process;\nmodule.exports = runtimePlatform;\n",
    () => {
      const violations = analyzeRepository();
      const serviceViolation = violations.find((violation) => violation.ruleId === 'LTD-004');

      assert.ok(serviceViolation, 'expected a destructured service-layer platform violation');
      assert.equal(serviceViolation.file, 'src/main/services/__temp-platform-destructured.js');
      assert.match(serviceViolation.detail, /process\.platform/);
    }
  );
});

test('repo hardgate allows destructuring platform from non-process objects', () => {
  withTempServiceModule(
    '__temp-platform-non-process-destructured.js',
    "const { platform } = someOtherObject;\nconst info = process.cwd();\nmodule.exports = { platform, info };\n",
    () => {
      const violations = analyzeRepository();
      const serviceViolation = violations.find((violation) => violation.ruleId === 'LTD-004');

      assert.equal(serviceViolation, undefined);
    }
  );
});

test('repo hardgate rejects bracket-based service-layer platform access', () => {
  withTempServiceModule(
    '__temp-platform-bracket.js',
    "const runtimePlatform = process['platform'];\nmodule.exports = runtimePlatform;\n",
    () => {
      const violations = analyzeRepository();
      const serviceViolation = violations.find((violation) => violation.ruleId === 'LTD-004');

      assert.ok(serviceViolation, 'expected a bracket-access service-layer platform violation');
      assert.equal(serviceViolation.file, 'src/main/services/__temp-platform-bracket.js');
      assert.match(serviceViolation.detail, /process\.platform/);
    }
  );
});

test('repo hardgate rejects optional-chaining service-layer platform access', () => {
  withTempServiceModule(
    '__temp-platform-optional.js',
    "const runtimePlatform = process?.platform;\nmodule.exports = runtimePlatform;\n",
    () => {
      const violations = analyzeRepository();
      const serviceViolation = violations.find((violation) => violation.ruleId === 'LTD-004');

      assert.ok(serviceViolation, 'expected an optional-chaining service-layer platform violation');
      assert.equal(serviceViolation.file, 'src/main/services/__temp-platform-optional.js');
      assert.match(serviceViolation.detail, /process\.platform/);
    }
  );
});

test('repo hardgate ignores process.platform mentions in comments and strings', () => {
  withTempServiceModule(
    '__temp-platform-comment.js',
    [
      '// process.platform should not trigger a violation',
      'const note = "process.platform";',
      "const label = 'process[\'platform\']';",
      'module.exports = note + label;'
    ].join('\n'),
    () => {
      const violations = analyzeRepository();
      assert.equal(
        violations.some((violation) => violation.file === 'src/main/services/__temp-platform-comment.js'),
        false
      );
    }
  );
});

test('repo hardgate ignores block comments while tokenizing service-layer sources', () => {
  withTempServiceModule(
    '__temp-platform-block-comment.js',
    [
      '/* process.platform should stay inside a block comment */',
      'const note = "still safe";',
      'module.exports = note;'
    ].join('\n'),
    () => {
      const violations = analyzeRepository();
      assert.equal(
        violations.some((violation) => violation.file === 'src/main/services/__temp-platform-block-comment.js'),
        false
      );
    }
  );
});

test('repo hardgate ignores unresolved local imports while scanning a repository root', () => {
  withTempServiceModule(
    '__temp-missing-import.js',
    [
      "const missing = require('./missing-module');",
      'module.exports = missing;'
    ].join('\n'),
    () => {
      const violations = analyzeRepository();
      assert.equal(
        violations.some((violation) => violation.file === 'src/main/services/__temp-missing-import.js'),
        false
      );
    }
  );
});

test('repo hardgate skips files that disappear between directory walk and read', () => {
  withTempRepository(
    {
      'src/main/services/flaky.js': 'module.exports = "ok";\n'
    },
    ({ repoRoot, srcRoot }) => {
      const flakyPath = path.join(repoRoot, 'src', 'main', 'services', 'flaky.js');
      const originalReadFileSync = fs.readFileSync;
      let injectedEnoent = false;

      fs.readFileSync = function patchedReadFileSync(filePath, ...args) {
        if (!injectedEnoent && path.resolve(filePath) === flakyPath) {
          injectedEnoent = true;
          fs.unlinkSync(flakyPath);
          const error = new Error(`ENOENT: no such file or directory, open '${flakyPath}'`);
          error.code = 'ENOENT';
          throw error;
        }

        return originalReadFileSync.call(this, filePath, ...args);
      };

      try {
        assert.deepEqual(analyzeRepository({ srcRoot }), []);
      } finally {
        fs.readFileSync = originalReadFileSync;
      }
    }
  );
});

test('repo hardgate rethrows non-ENOENT read failures during repository scans', () => {
  withTempRepository(
    {
      'src/main/services/broken.js': 'module.exports = "ok";\n'
    },
    ({ repoRoot, srcRoot }) => {
      const brokenPath = path.join(repoRoot, 'src', 'main', 'services', 'broken.js');
      const originalReadFileSync = fs.readFileSync;

      fs.readFileSync = function patchedReadFileSync(filePath, ...args) {
        if (path.resolve(filePath) === brokenPath) {
          const error = new Error(`EACCES: permission denied, open '${brokenPath}'`);
          error.code = 'EACCES';
          throw error;
        }

        return originalReadFileSync.call(this, filePath, ...args);
      };

      try {
        assert.throws(
          () => analyzeRepository({ srcRoot }),
          /EACCES: permission denied/
        );
      } finally {
        fs.readFileSync = originalReadFileSync;
      }
    }
  );
});

test('repo hardgate tolerates malformed destructuring without reporting a platform branch', () => {
  withTempServiceModule(
    '__temp-platform-malformed-destructuring.js',
    [
      'const { platform = process;',
      'module.exports = platform;'
    ].join('\n'),
    () => {
      const violations = analyzeRepository();
      assert.equal(
        violations.some((violation) => violation.file === 'src/main/services/__temp-platform-malformed-destructuring.js'),
        false
      );
    }
  );
});

test('repo hardgate rejects platform adapter imports outside the selector', () => {
  withTempServiceModule(
    '__temp-platform-adapter-import.js',
    "const recorder = require('../platform/adapters/win32/audio-recorder.js');\nmodule.exports = recorder;\n",
    () => {
      const violations = analyzeRepository();
      const adapterViolation = violations.find((violation) => violation.ruleId === 'LTD-002');

      assert.ok(adapterViolation, 'expected a platform-adapter import violation');
      assert.equal(adapterViolation.file, 'src/main/services/__temp-platform-adapter-import.js');
      assert.match(adapterViolation.detail, /platform adapters/);
    }
  );
});

test('repo hardgate rejects legacy platform leaf imports outside the selector', () => {
  withTempServiceModule(
    '__temp-platform-legacy-import.js',
    "const recorder = require('../platform/audio-darwin.js');\nmodule.exports = recorder;\n",
    () => {
      const violations = analyzeRepository();
      const selectorViolation = violations.find((violation) => violation.ruleId === 'LTD-002');

      assert.ok(selectorViolation, 'expected a legacy platform leaf import violation');
      assert.equal(selectorViolation.file, 'src/main/services/__temp-platform-legacy-import.js');
      assert.match(selectorViolation.detail, /platform selector/);
    }
  );
});

test('repo hardgate rejects legacy platform leaf imports written with ESM syntax outside the selector', () => {
  withTempServiceModule(
    '__temp-platform-legacy-import-esm.js',
    "import recorder from '../platform/audio-darwin.js';\nmodule.exports = recorder;\n",
    () => {
      const violations = analyzeRepository();
      const selectorViolation = violations.find((violation) => violation.ruleId === 'LTD-002');

      assert.ok(selectorViolation, 'expected an ESM legacy platform leaf import violation');
      assert.equal(selectorViolation.file, 'src/main/services/__temp-platform-legacy-import-esm.js');
      assert.match(selectorViolation.detail, /platform selector/);
    }
  );
});

test('repo hardgate rejects main-entry selector-owned imports in a temporary repository root', () => {
  withTempRepository(
    {
      'src/main/index.js': "const recorder = require('./platform/adapters/win32/audio-recorder.js');\nmodule.exports = recorder;\n",
      'src/main/platform/adapters/win32/audio-recorder.js': 'module.exports = {};\n'
    },
    ({ srcRoot }) => {
      const violations = analyzeRepository({ srcRoot });
      const mainViolation = violations.find((violation) => violation.ruleId === 'LTD-001');

      assert.ok(mainViolation, 'expected a main-entry platform import violation');
      assert.equal(mainViolation.file, 'src/main/index.js');
      assert.match(mainViolation.detail, /Import "\.\/platform" instead/);
    }
  );
});

test('repo hardgate rejects renderer runtime surface imports in a temporary repository root', () => {
  withTempRepository(
    {
      'src/renderer/sneaky.js': "const childProcess = require('child_process');\nmodule.exports = childProcess;\n"
    },
    ({ srcRoot }) => {
      const violations = analyzeRepository({ srcRoot });
      const rendererViolation = violations.find((violation) => violation.ruleId === 'LTD-003');

      assert.ok(rendererViolation, 'expected a renderer runtime-surface violation');
      assert.equal(rendererViolation.file, 'src/renderer/sneaky.js');
      assert.match(rendererViolation.detail, /child-process/);
    }
  );
});

test('repo hardgate rejects renderer-owned platform shortcut and cue tables outside the canonical profile owner', () => {
  withTempRendererFile(
    '__temp-platform-ui-table.html',
    [
      '<!DOCTYPE html>',
      '<html>',
      '<body>',
      '  <select id="shortcutKey">',
      '    <option value="RIGHT COMMAND">RIGHT COMMAND</option>',
      '    <option value="LEFT COMMAND">LEFT COMMAND</option>',
      '    <option value="RIGHT OPTION">RIGHT OPTION</option>',
      '  </select>',
      '  <select id="recordingStartSound">',
      '    <option value="Tink">Tink</option>',
      '    <option value="Glass">Glass</option>',
      '    <option value="Pop">Pop</option>',
      '  </select>',
      '</body>',
      '</html>'
    ].join('\n'),
    () => {
      const violations = analyzeRepository();
      const ownershipViolation = violations.find((violation) => violation.ruleId === 'LTD-006');

      assert.ok(ownershipViolation, 'expected a renderer-owned platform UI contract violation');
      assert.equal(ownershipViolation.file, 'src/renderer/__temp-platform-ui-table.html');
      assert.match(ownershipViolation.detail, /canonical platform profile owner/);
      assert.match(ownershipViolation.detail, /src\/main\/platform\/profiles/);
    }
  );
});

test('repo hardgate rejects service-owned platform shortcut and cue tables outside the canonical profile owner', () => {
  withTempServiceModule(
    '__temp-platform-ui-table.js',
    [
      "const shortcutOptions = ['RIGHT COMMAND', 'LEFT COMMAND', 'RIGHT OPTION'];",
      "const cueOptions = ['Tink', 'Glass', 'Pop'];",
      'module.exports = { shortcutOptions, cueOptions };'
    ].join('\n'),
    () => {
      const violations = analyzeRepository();
      const ownershipViolation = violations.find((violation) => violation.ruleId === 'LTD-006');

      assert.ok(ownershipViolation, 'expected a service-owned platform UI contract violation');
      assert.equal(ownershipViolation.file, 'src/main/services/__temp-platform-ui-table.js');
      assert.match(ownershipViolation.detail, /canonical platform profile owner/);
    }
  );
});

test('guarded coverage slice stays on the stable frozen seams instead of the whole main process', () => {
  const coverageConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.c8rc.json'), 'utf8'));
  const includeSet = coverageConfig.include;

  assert.equal(coverageConfig.all, true);
  assert.ok(includeSet.includes('scripts/repo-hardgate.js'));
  assert.equal(includeSet.includes('src/main/config-manager.js'), false);
  assert.equal(includeSet.includes('src/main/model-paths.js'), false);
  assert.ok(includeSet.includes('src/main/platform/index.js'));
  assert.ok(includeSet.includes('src/main/runtime/runtime-capabilities.js'));
  assert.equal(includeSet.includes('src/main/app/bootstrap.js'), false);
  assert.equal(includeSet.includes('src/main/services/dictation-service.js'), false);
  assert.equal(includeSet.includes('src/main/platform/adapters/win32/audio-recorder.js'), false);
});

test('mac legacy runtime files are deleted once the canonical seams own the flow', () => {
  const repoRoot = path.join(__dirname, '..');
  const deletedRepoPaths = [
    'src/main/legacy/audio-recorder-legacy.js',
    'src/main/legacy/input-simulator-legacy.js',
    'src/main/legacy/README.md',
    'src/main/llm-postprocessor.js',
    'src/main/local-llm.js',
    'src/main/config-manager.js',
    'src/main/model-paths.js'
  ];

  for (const repoPath of deletedRepoPaths) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, repoPath)),
      false,
      `expected ${repoPath} to be removed from the active repository shape`
    );
  }
});

test('repo hardgate runs as a standalone CLI and exits cleanly on the current repository state', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'repo-hardgate.js')], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /repo-hardgate: OK/);
  assert.equal(result.stderr, '');
});

test('repo hardgate main reports boundary violations on a dirty temporary repository root', () => {
  withTempRepository(
    {
      'src/main/index.js': "const recorder = require('./platform/adapters/win32/audio-recorder.js');\nmodule.exports = recorder;\n",
      'src/main/platform/adapters/win32/audio-recorder.js': 'module.exports = {};\n',
      'src/renderer/sneaky.js': "const childProcess = require('child_process');\nmodule.exports = childProcess;\n"
    },
    ({ srcRoot }) => {
      const messages = [];
      const originalLog = console.log;
      const originalError = console.error;

      console.log = (...args) => {
        messages.push(['log', args.join(' ')]);
      };
      console.error = (...args) => {
        messages.push(['error', args.join(' ')]);
      };

      try {
        const exitCode = main({ srcRoot });
        assert.equal(exitCode, 1);
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }

      assert(messages.some(([kind, text]) => kind === 'error' && /boundary violations found/.test(text)));
      assert(messages.some(([kind, text]) => kind === 'error' && /LTD-001/.test(text)));
      assert(messages.some(([kind, text]) => kind === 'error' && /LTD-003/.test(text)));
    }
  );
});

test('composition root uses the canonical config manager path instead of the deleted shim', () => {
  const compositionRootSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'main', 'app', 'composition-root.js'),
    'utf8'
  );

  assert.match(compositionRootSource, /require\('\.\.\/config\/config-manager'\)/);
  assert.doesNotMatch(compositionRootSource, /require\('\.\.\/config-manager'\)/);
});
