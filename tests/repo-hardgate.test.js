const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  analyzeRepository,
  formatViolations
} = require('../scripts/repo-hardgate.js');

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

test('repo hardgate passes against the current repository state', () => {
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

test('guarded coverage slice stays on the stable frozen seams instead of the whole main process', () => {
  const coverageConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.c8rc.json'), 'utf8'));
  const includeSet = coverageConfig.include;

  assert.equal(coverageConfig.all, true);
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

test('composition root uses the canonical config manager path instead of the deleted shim', () => {
  const compositionRootSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'main', 'app', 'composition-root.js'),
    'utf8'
  );

  assert.match(compositionRootSource, /require\('\.\.\/config\/config-manager'\)/);
  assert.doesNotMatch(compositionRootSource, /require\('\.\.\/config-manager'\)/);
});
