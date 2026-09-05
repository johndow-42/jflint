'use strict';

// End-to-end tests that actually invoke Docker and the real
// jenkins/jenkinsfile-runner image. These are skipped automatically when
// Docker isn't available (e.g. on a plain developer machine without Docker
// installed) and are meant to run for real in CI, where GitHub-hosted
// ubuntu-latest runners have Docker preinstalled.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { isDockerAvailable } = require('../lib/docker');

const CLI = path.join(__dirname, '..', 'bin', 'jflint.js');
const dockerAvailable = isDockerAvailable();

test('lints a valid Jenkinsfile as valid', { skip: !dockerAvailable && 'Docker not available' }, () => {
  const fixture = path.join(__dirname, 'fixtures', 'valid', 'Jenkinsfile');
  const result = spawnSync('node', [CLI, fixture, '--pull'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /valid/i);
});

test('rejects an invalid Jenkinsfile (parallel + agent) with a non-zero exit code', { skip: !dockerAvailable && 'Docker not available' }, () => {
  const fixture = path.join(__dirname, 'fixtures', 'invalid', 'Jenkinsfile');
  const result = spawnSync('node', [CLI, fixture], { encoding: 'utf8' });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /failed/i);
});
