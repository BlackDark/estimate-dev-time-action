# estimate-dev-time-action

GitHub Action that estimates pull-request development time from the diff using an OpenRouter model.

## Verify

- `mise run check`: frozen install, ESLint, Jest, and the esbuild bundle.
- CI additionally requires `git diff --exit-code -- dist` after the build; commit regenerated `dist/index.js`.
- The PR estimation workflow runs the action from the same checkout, not another branch.

CI uses one required `check` gate plus actionlint, zizmor, and strict Renovate validation.

## Stack

Follows https://github.com/BlackDark/agent-presets/blob/main/stack/core.md. Existing TypeScript, ESLint, Jest, and esbuild stay; no toolchain migration is needed for routine maintenance.

## Map

- `src/`: GitHub API, diff filtering, OpenRouter, and formatting.
- `test/`: Jest unit, integration, runtime, and bundle tests.
- `dist/index.js`: generated action bundle.
- `action.yml`: action inputs and runtime.

## Git

- Conventional Commits, one topic per PR.
- Squash unless commits need separate review.
- Force-push only with `--force-with-lease` on own branches.

## Boundaries

- Tools come from `mise.toml`; no global installs.
- Never print or commit OpenRouter keys. Do not publish action tags from a local session.
