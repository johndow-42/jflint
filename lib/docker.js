'use strict';

const { spawnSync } = require('node:child_process');

const DEFAULT_IMAGE = 'jenkins/jenkinsfile-runner';

// Paths where the official "Vanilla" image already bundles a Jenkins WAR and
// its minimum plugin set (documented in the project's own advanced Docker
// example: https://github.com/jenkinsci/jenkinsfile-runner#running-jenkinsfile-runner-in-docker).
//
// They matter because `docker run <image> lint ...` replaces the image's
// default CMD (which normally passes its own -w/-p pointing here) with our
// own arguments, so without repeating -w/-p ourselves, jenkinsfile-runner
// falls back to downloading a fresh Jenkins WAR from the internet at
// container-start time. On the "latest" tag (last published in 2022, no
// newer tag exists as of this writing) that download fails with an SSL
// handshake error because the image's embedded JRE has an outdated CA trust
// store — a real, currently open bug:
// https://github.com/jenkinsci/jenkinsfile-runner/issues/738
// Pointing -w/-p at the already-bundled copies avoids that network call
// entirely, which is also faster and works offline.
const DEFAULT_WAR_PATH = '/app/jenkins';
const DEFAULT_PLUGINS_PATH = '/usr/share/jenkins/ref/plugins';

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
    args.push('-v', `${pluginsDir}:${DEFAULT_PLUGINS_PATH}`);
  }

  args.push(
    image,
    'lint',
    '-w',
    DEFAULT_WAR_PATH,
    '-p',
    DEFAULT_PLUGINS_PATH,
    '-f',
    `/workspace/${jenkinsfileName}`
  );
  return args;
}

function runLint(options) {
  const args = buildLintArgs(options);
  return spawnSync('docker', args, { encoding: 'utf8' });
}

module.exports = {
  DEFAULT_IMAGE,
  DEFAULT_WAR_PATH,
  DEFAULT_PLUGINS_PATH,
  isDockerAvailable,
  pullImage,
  buildLintArgs,
  runLint,
};
