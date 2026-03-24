const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  analyzeRepository,
  formatViolations
} = require('../scripts/repo-hardgate.js');

function readCoverageIncludeSet() {
  const coverageConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.c8rc.json'), 'utf8'));
  return coverageConfig.include;
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

test('repo hardgate rejects direct process.platform branching inside business services', () => {
  const tempFilePath = path.join(__dirname, '..', 'src', 'main', 'services', '__temp-platform-branch.js');

  fs.writeFileSync(
    tempFilePath,
    "const platform = process.platform;\nmodule.exports = platform;\n",
    'utf8'
  );

  try {
    const violations = analyzeRepository();
    const serviceViolation = violations.find((violation) => violation.ruleId === 'LTD-004');

    assert.ok(serviceViolation, 'expected a service-layer platform branching violation');
    assert.equal(serviceViolation.file, 'src/main/services/__temp-platform-branch.js');
    assert.match(serviceViolation.detail, /process\.platform/);
  } finally {
    fs.unlinkSync(tempFilePath);
  }
});

test('guarded coverage slice names only the stable frozen seams instead of the whole main process', () => {
  const includeSet = readCoverageIncludeSet();

  assert.equal(includeSet.includes('src/main/app/bootstrap.js'), false);
  assert.equal(includeSet.includes('src/main/runtime/runtime-env.js'), false);
  assert.equal(includeSet.includes('src/main/services/dictation-service.js'), false);
  assert.ok(includeSet.includes('src/main/distribution/distribution-manifest.js'));
  assert.ok(includeSet.includes('src/main/runtime/runtime-capabilities.js'));
  assert.ok(includeSet.includes('src/main/platform/index.js'));
  assert.equal(includeSet.includes('src/main/index.js'), false);
});