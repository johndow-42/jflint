'use strict';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// jenkinsfile-runner's underlying validator is the same one used by the
// classic `declarative-linter` Jenkins CLI command. On success it prints a
// line ending in "successfully validated." On failure it prints Groovy
// compilation errors, usually mentioning "WorkflowScript" or "ERROR".
// These heuristics exist to cut the noisy JVM/plugin-loading boilerplate
// that makes raw jenkinsfile-runner output hard to scan (the exact
// complaint in https://github.com/jenkinsci/jenkinsfile-runner/issues/461),
// while --raw always shows the untouched output so the heuristic can never
// hide something the user needs.
const NOISE_PATTERNS = [
  /^Started$/,
  /^Resume disabled/,
  /^\[Pipeline\]/,
  /^Running from:/,
  /^webroot:/,
  /^Jenkins home directory:/,
  /^--?INFO/i,
  /^Finished: /,
];

const SIGNAL_PATTERNS = [
  /successfully validated/i,
  /error/i,
  /exception/i,
  /WorkflowScript/,
  /failed/i,
];

function isNoise(line) {
  return NOISE_PATTERNS.some((re) => re.test(line.trim()));
}

function isSignal(line) {
  return SIGNAL_PATTERNS.some((re) => re.test(line));
}

function summarize(rawOutput) {
  const lines = rawOutput.split(/\r?\n/).filter((l) => l.length > 0);
  const signalLines = lines.filter((l) => isSignal(l) && !isNoise(l));
  return signalLines.length > 0 ? signalLines : lines.filter((l) => !isNoise(l));
}

function printResult({ success, rawOutput, raw }) {
  if (raw) {
    process.stdout.write(rawOutput);
    console.log();
  }

  if (success) {
    console.log(`${GREEN}✔ Jenkinsfile is valid${RESET}`);
    return;
  }

  console.log(`${RED}✘ Jenkinsfile validation failed${RESET}`);
  if (!raw) {
    const summary = summarize(rawOutput);
    for (const line of summary) {
      console.log(`  ${line}`);
    }
    console.log(`${DIM}(run with --raw to see the full jenkinsfile-runner output)${RESET}`);
  }
}

module.exports = { printResult, summarize };
