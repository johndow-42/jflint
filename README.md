# jflint

One-command offline linting for declarative Jenkinsfiles. No Jenkins server, no credentials, no network access to any CI system.

## Why this exists

The most-installed VS Code extension for Jenkinsfile validation ([Jenkins Pipeline Linter Connector](https://marketplace.visualstudio.com/items?itemName=janjoerke.jenkins-pipeline-linter-connector), 270k+ installs) only works by sending your file to a reachable Jenkins server. The official offline tool, [`jenkinsfile-runner`](https://github.com/jenkinsci/jenkinsfile-runner), already ships a `lint` command, but using it means assembling a matching Jenkins WAR and plugin set by hand, and its Docker CLI mode is confusing enough that real users get stuck on it (see [issue #461](https://github.com/jenkinsci/jenkinsfile-runner/issues/461)) — and years after the `lint` command shipped, it still has no dedicated documentation page ([issue #521](https://github.com/jenkinsci/jenkinsfile-runner/issues/521)).

`jflint` doesn't reimplement pipeline validation — it wraps the official `jenkins/jenkinsfile-runner` Docker image (which already bundles a Jenkins WAR and a minimal plugin set) behind one command with readable output, so the underlying validation is the same one your real Jenkins server would run.

## Requirements

- [Docker](https://docs.docker.com/get-docker/), installed and running.
- Node.js 18+.

## Usage

```
npx jflint                       # lints ./Jenkinsfile
npx jflint path/to/Jenkinsfile
npx jflint --pull                # pull the image first (do this on first run)
npx jflint --plugins ./plugins   # lint against your own plugin set, not just the minimal Vanilla one
npx jflint --raw                 # show full, unfiltered jenkinsfile-runner output
```

Exit code is `0` when the Jenkinsfile is valid, non-zero otherwise — safe to use as a pre-commit hook or a CI step.

## Matching your real Jenkins environment

The default image only includes the minimum plugin set needed to run pipelines at all ("Vanilla" distribution). If your real Jenkinsfile uses steps from plugins that aren't in that minimal set, linting will fail even though your actual Jenkins server would accept it. Point `--plugins` at a plugin directory that matches your server (export one with the [Plugin Installation Manager Tool](https://github.com/jenkinsci/plugin-installation-manager-tool), or copy `JENKINS_HOME/plugins`) for an accurate result.

## What this is (and isn't)

This is a free, open-source wrapper. It does not talk to any external service, does not collect data, and does not claim to catch every possible pipeline problem — Shared Libraries and org-specific custom steps still need their actual plugins/libraries mounted to validate correctly. If you'd find a hosted version useful — team-wide policy checks across many repos, a GitHub PR check, Shared Library validation — [open an issue](../../issues) and say so; that's the signal this project is watching for before building anything paid.

## License

MIT
