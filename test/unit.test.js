'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../lib/cli');
const { summarize } = require('../lib/format');
const { buildLintArgs, DEFAULT_IMAGE, DEFAULT_WAR_PATH, DEFAULT_PLUGINS_PATH } = require('../lib/docker');

test('parseArgs defaults to ./Jenkinsfile and the default image', () => {
  const opts = parseArgs([]);
  assert.equal(opts.jenkinsfilePath, 'Jenkinsfile');
  assert.equal(opts.image, DEFAULT_IMAGE);
  assert.equal(opts.pull, false);
  assert.equal(opts.raw, false);
});

test('parseArgs reads a positional path and options', () => {
  const opts = parseArgs(['ci/Jenkinsfile', '--image', 'myorg/jfr:2.5', '--plugins', './plugins', '--pull', '--raw']);
  assert.equal(opts.jenkinsfilePath, 'ci/Jenkinsfile');
  assert.equal(opts.image, 'myorg/jfr:2.5');
  assert.equal(opts.pluginsDir, './plugins');
  assert.equal(opts.pull, true);
  assert.equal(opts.raw, true);
});

test('parseArgs recognizes --help and --version', () => {
  assert.equal(parseArgs(['--help']).help, true);
  assert.equal(parseArgs(['--version']).version, true);
});

test('buildLintArgs mounts the workspace and points -w/-p at the image\'s bundled Jenkins install', () => {
  const args = buildLintArgs({
    workspaceDir: '/home/user/project',
    jenkinsfileName: 'Jenkinsfile',
    image: DEFAULT_IMAGE,
  });
  assert.deepEqual(args, [
    'run',
    '--rm',
    '-v',
    '/home/user/project:/workspace',
    DEFAULT_IMAGE,
    'lint',
    '-w',
    DEFAULT_WAR_PATH,
    '-p',
    DEFAULT_PLUGINS_PATH,
    '-f',
    '/workspace/Jenkinsfile',
  ]);
});

test('buildLintArgs never lets jenkinsfile-runner fall back to downloading a WAR at runtime', () => {
  // Regression test for the SSL handshake failure caused by the stale
  // official image's outdated CA trust store
  // (https://github.com/jenkinsci/jenkinsfile-runner/issues/738): if -w is
  // ever missing, jenkinsfile-runner silently tries to fetch a fresh WAR
  // over HTTPS instead of using the one already bundled in the image.
  const args = buildLintArgs({
    workspaceDir: '/w',
    jenkinsfileName: 'Jenkinsfile',
    image: DEFAULT_IMAGE,
  });
  assert.ok(args.includes('-w'), 'buildLintArgs must always pass -w to avoid a runtime WAR download');
});

test('buildLintArgs mounts a plugins directory at the same path the image expects when given', () => {
  const args = buildLintArgs({
    workspaceDir: '/w',
    jenkinsfileName: 'Jenkinsfile',
    image: DEFAULT_IMAGE,
    pluginsDir: '/my/plugins',
  });
  assert.ok(args.includes(`/my/plugins:${DEFAULT_PLUGINS_PATH}`));
});

test('summarize keeps the success line and drops JVM/pipeline noise', () => {
  const raw = [
    'Started',
    'Running from: /app/jenkins-cli.jar',
    'Resume disabled by user, switching to high-performance, low-durability mode.',
    '[Pipeline] End of Pipeline',
    'Jenkinsfile successfully validated.',
  ].join('\n');
  const summary = summarize(raw);
  assert.deepEqual(summary, ['Jenkinsfile successfully validated.']);
});

test('summarize keeps error lines', () => {
  const raw = [
    'Started',
    "WorkflowScript: 6: Invalid stage configuration; 'parallel' and 'agent' cannot both be used at the same time",
    'Finished: FAILURE',
  ].join('\n');
  const summary = summarize(raw);
  assert.ok(summary.some((l) => l.includes('WorkflowScript')));
  assert.ok(!summary.includes('Started'));
});
