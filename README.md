# jenkinsfile-lint

One-command offline linting for declarative Jenkinsfiles. No Jenkins server, no credentials, no network access to any CI system. Installs the `jflint` command.

## Why this exists

The most-installed VS Code extension for Jenkinsfile validation ([Jenkins Pipeline Linter Connector](https://marketplace.visualstudio.com/items?itemName=janjoerke.jenkins-pipeline-linter-connector), 270k+ installs) only works by sending your file to a reachable Jenkins server. There's also an older npm package literally called [`jflint`](https://www.npmjs.com/package/jflint) (2017, last released 2018) — its own README says it plainly: "This tool itself does not lint a Jenkinsfile, but sends a request to Jenkins in the same way as curl approach", so it has the same reachable-server requirement. That name was already taken, which is why this package is published as `jenkinsfile-lint` even though the command it installs is still the shorter `jflint`.

The official offline tool, [`jenkinsfile-runner`](https://github.com/jenkinsci/jenkinsfile-runner), already ships a `lint` command, but using it means assembling a matching Jenkins WAR and plugin set by hand, and its Docker CLI mode is confusing enough that real users get stuck on it (see [issue #461](https://github.com/jenkinsci/jenkinsfile-runner/issues/461)) — and years after the `lint` command shipped, it still has no dedicated documentation page ([issue #521](https://github.com/jenkinsci/jenkinsfile-runner/issues/521)).

`jflint` doesn't reimplement pipeline validation — it wraps the official `jenkins/jenkinsfile-runner` Docker image (which already bundles a Jenkins WAR and a minimal plugin set) behind one command with readable output. The underlying validation engine is the same Jenkins core your real server runs, but the result only matches your server exactly when its Jenkins version, installed plugins, and Shared Libraries match too — see [Matching your real Jenkins environment](#matching-your-real-jenkins-environment) below.

It also works around a real, currently open bug in that official image: invoking it with a custom command (like `lint`) drops the image's default `-w`/`-p` flags, which makes `jenkinsfile-runner` fall back to downloading a fresh Jenkins WAR over HTTPS at container startup — and on the `latest` tag (last published in 2022, no newer tag exists), that download fails with an SSL handshake error because the image's embedded Java runtime has an outdated CA trust store ([issue #738](https://github.com/jenkinsci/jenkinsfile-runner/issues/738)). `jflint` always points `-w`/`-p` back at the WAR and plugins already bundled inside the image, so linting works fully offline and never hits that bug.

## Requirements

- [Docker](https://docs.docker.com/get-docker/), installed and running.
- Node.js 18+.

## Usage

```
npm install -g jenkinsfile-lint   # installs the `jflint` command

jflint                       # lints ./Jenkinsfile
jflint path/to/Jenkinsfile
jflint --pull                # pull the image first (do this on first run)
jflint --plugins ./plugins   # lint against your own plugin set, not just the minimal Vanilla one
jflint --raw                 # show full, unfiltered jenkinsfile-runner output
```

Without a global install, use `npx -p jenkinsfile-lint jflint` — plain `npx jflint` would resolve to the unrelated, older `jflint` package on npm (see above) instead of this one.

Exit code is `0` when the Jenkinsfile is valid, non-zero otherwise — safe to use as a pre-commit hook or a CI step.

## Matching your real Jenkins environment

The default image only includes the minimum plugin set needed to run pipelines at all ("Vanilla" distribution). If your real Jenkinsfile uses steps from plugins that aren't in that minimal set, linting will fail even though your actual Jenkins server would accept it. Point `--plugins` at a plugin directory that matches your server (export one with the [Plugin Installation Manager Tool](https://github.com/jenkinsci/plugin-installation-manager-tool), or copy `JENKINS_HOME/plugins`) for an accurate result.

## What this is (and isn't)

This is a free, open-source wrapper. It does not talk to any external service, does not collect data, and does not claim to catch every possible pipeline problem — Shared Libraries and org-specific custom steps still need their actual plugins/libraries mounted to validate correctly. If you'd find a hosted version useful — team-wide policy checks across many repos, a GitHub PR check, Shared Library validation — [open an issue](https://github.com/johndow-42/jflint/issues) and say so; that's the signal this project is watching for before building anything paid.

## License

MIT
