'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_IMAGE, isDockerAvailable, pullImage, runLint } = require('./docker');
const { printResult } = require('./format');
const pkg = require('../package.json');

const HELP = `jflint ${pkg.version} — offline lint for declarative Jenkinsfiles

Usage:
  jflint [path-to-Jenkinsfile] [options]

  If no path is given, ./Jenkinsfile is used.

Options:
  --image <name[:tag]>   Docker image to run (default: ${DEFAULT_IMAGE})
  --plugins <dir>        Directory of Jenkins plugins to mount, so the lint
                          matches your real server instead of the minimal
                          Vanilla plugin set. Export one with the Jenkins
                          Plugin Installation Manager Tool, or copy it from
                          JENKINS_HOME/plugins.
  --pull                 Pull the image before linting (recommended on first run
                          and whenever you change --image).
  --raw                  Print the unfiltered jenkinsfile-runner output instead
                          of the short summary.
  --help                 Show this help.
  --version              Print the jflint version.

Requires Docker to be installed and running. jflint itself never talks to a
Jenkins server — it runs the official jenkinsfile-runner image locally, so it
works without network access to any Jenkins instance.
`;

function parseArgs(argv) {
  const opts = { image: DEFAULT_IMAGE, pull: false, raw: false, help: false, version: false };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        opts.help = true;
        break;
      case '--version':
      case '-v':
        opts.version = true;
        break;
      case '--image':
        opts.image = argv[++i];
        break;
      case '--plugins':
        opts.pluginsDir = argv[++i];
        break;
      case '--pull':
        opts.pull = true;
        break;
      case '--raw':
        opts.raw = true;
        break;
      default:
        positional.push(arg);
    }
  }

  opts.jenkinsfilePath = positional[0] || 'Jenkinsfile';
  return opts;
}

function run(argv) {
  const opts = parseArgs(argv);

  if (opts.help) {
    console.log(HELP);
    return 0;
  }

  if (opts.version) {
    console.log(pkg.version);
    return 0;
  }

  const resolvedPath = path.resolve(process.cwd(), opts.jenkinsfilePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`jflint: no Jenkinsfile found at ${resolvedPath}`);
    console.error('Pass a path explicitly: jflint path/to/Jenkinsfile');
    return 2;
  }

  if (!isDockerAvailable()) {
    console.error('jflint: Docker does not seem to be installed or running.');
    console.error('jflint needs Docker to run the official jenkinsfile-runner image locally.');
    console.error('Install Docker from https://docs.docker.com/get-docker/ and try again.');
    return 3;
  }

  if (opts.pull) {
    const pullResult = pullImage(opts.image);
    if (pullResult.status !== 0) {
      console.error(`jflint: failed to pull image ${opts.image}`);
      return pullResult.status ?? 1;
    }
  }

  const workspaceDir = path.dirname(resolvedPath);
  const jenkinsfileName = path.basename(resolvedPath);
  const pluginsDir = opts.pluginsDir ? path.resolve(process.cwd(), opts.pluginsDir) : undefined;

  const result = runLint({
    workspaceDir,
    jenkinsfileName,
    image: opts.image,
    pluginsDir,
  });

  const rawOutput = `${result.stdout || ''}${result.stderr || ''}`;
  const success = result.status === 0;

  printResult({ success, rawOutput, raw: opts.raw });

  return success ? 0 : 1;
}

module.exports = { run, parseArgs, HELP };
