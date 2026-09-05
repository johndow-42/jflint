'use strict';

const { spawnSync } = require('node:child_process');

const DEFAULT_IMAGE = 'jenkins/jenkinsfile-runner';

function isDockerAvailable() {
  const result = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    encoding: 'utf8',
  });
  return result.status === 0;
}

function pullImage(image) {
  return spawnSync('docker', ['pull', image], { stdio: 'inherit' });
}

// Builds the `docker run` arguments for linting a single Jenkinsfile.
//
// The official jenkinsfile-runner image already bundles a Jenkins WAR and the
// minimum plugin set for declarative pipelines (the "Vanilla" distribution),
// so no manual WAR/plugin assembly is needed for the common case. This is
// what removes the setup step that trips people up in
// https://github.com/jenkinsci/jenkinsfile-runner/issues/461.
function buildLintArgs({ workspaceDir, jenkinsfileName, image, pluginsDir }) {
  const args = ['run', '--rm', '-v', `${workspaceDir}:/workspace`];

  if (pluginsDir) {
    args.push('-v', `${pluginsDir}:/usr/share/jenkins/ref/plugins`);
  }

  args.push(image, 'lint', '-f', `/workspace/${jenkinsfileName}`);
  return args;
}

function runLint(options) {
  const args = buildLintArgs(options);
  return spawnSync('docker', args, { encoding: 'utf8' });
}

module.exports = {
  DEFAULT_IMAGE,
  isDockerAvailable,
  pullImage,
  buildLintArgs,
  runLint,
};
