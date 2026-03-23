const test = require('node:test');
const assert = require('node:assert/strict');

const {
  analyzeRepository,
  formatViolations
} = require('../scripts/repo-hardgate.js');

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
