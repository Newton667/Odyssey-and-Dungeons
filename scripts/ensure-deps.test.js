// Unit test for the pure decision in scripts/ensure-deps.js.
// Runs on Node's built-in runner (`node --test scripts/ensure-deps.test.js`) rather than
// vitest, because this script must work before client/node_modules exists at all — and on a
// checkout whose node_modules was built for another OS, vitest cannot even start.
const test = require('node:test');
const assert = require('node:assert/strict');

// Requiring the module must have NO side effects: if main() ran on require, this line would
// kick off an `npm install`. Node's runner would show that as a multi-minute test with npm output.
const { assessTree, PLATFORM, MARKER } = require('./ensure-deps.js');

test('matching marker → ok, no wipe', () => {
  assert.deepEqual(assessTree('linux-x64', 'linux-x64', true), {
    ok: true, wipe: false, status: 'OK (linux-x64)',
  });
});

test('Windows-built tree on Linux (the shared-NTFS case) → wipe', () => {
  assert.deepEqual(assessTree('win32-x64', 'linux-x64', true), {
    ok: false, wipe: true, status: 'built for win32-x64 (want linux-x64)',
  });
});

test('Linux-built tree on Windows (the return trip) → wipe', () => {
  assert.deepEqual(assessTree('linux-x64', 'win32-x64', true), {
    ok: false, wipe: true, status: 'built for linux-x64 (want win32-x64)',
  });
});

test('existing tree with no marker (this checkout today) → wipe', () => {
  assert.deepEqual(assessTree(null, 'linux-x64', true), {
    ok: false, wipe: true, status: 'no marker (want linux-x64)',
  });
});

test('fresh clone: no tree, no marker → install but nothing to delete', () => {
  assert.deepEqual(assessTree(null, 'linux-x64', false), {
    ok: false, wipe: false, status: 'no marker (want linux-x64)',
  });
});

test('stray marker but no tree → never ask to delete a missing directory', () => {
  assert.equal(assessTree('win32-x64', 'linux-x64', false).wipe, false);
});

test('arch is part of the key, not just OS', () => {
  assert.equal(assessTree('linux-arm64', 'linux-x64', true).wipe, true);
});

test('exported constants', () => {
  assert.equal(PLATFORM, `${process.platform}-${process.arch}`);
  assert.equal(MARKER, '.ond-platform');
});
