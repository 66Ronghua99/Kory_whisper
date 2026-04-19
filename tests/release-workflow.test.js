const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const windowsReleaseWorkflow = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'release-windows.yml'),
  'utf8'
);

test('windows release workflow publishes a dedicated NSIS installer build', () => {
  assert.match(windowsReleaseWorkflow, /name:\s+Build and publish Windows release/i);
  assert.match(windowsReleaseWorkflow, /runs-on:\s+windows-latest/i);
  assert.match(windowsReleaseWorkflow, /npm run build:win:release/i);
  assert.match(windowsReleaseWorkflow, /softprops\/action-gh-release@v2/i);
  assert.match(windowsReleaseWorkflow, /dist\/\*\.exe/i);
  assert.match(windowsReleaseWorkflow, /workflow_dispatch:/i);
  assert.match(windowsReleaseWorkflow, /push:\s*\n\s*tags:\s*\n\s*-\s*'v\*'/i);
});
