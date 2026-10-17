# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Smart Assessment Engine V2

SARATHI includes a server-trusted, evidence-based skill assessment system with sandboxed code runners and integrity monitoring.

### Configuration & Feature Flags

Assessment V2 operates strictly behind feature flags:

| Flag | Location | Default | Description |
|---|---|---|---|
| `ASSESSMENT_V2_ENABLED` | `server/.env` | `false` | Enables V2 server routes (`/api/assessments/v2/*`) and blocks legacy heuristic submissions (410 Gone) |
| `VITE_ASSESSMENT_V2` | `.env` | `false` | Mounts V2 assessment shell on `/student/assessment` |
| `ASSESSMENT_RUNNER_DRIVER` | `server/.env` | `local_dev` | Code runner driver (`local_dev`, `sql`, `judge0`) |
| `ASSESSMENT_CAMERA_ENABLED`| `server/.env` / `.env` | `false` | Camera monitoring preview (local browser only, no video stored/uploaded) |

### Testing & Validation

```bash
# Run all server tests (123 tests across 20 suites)
npm --prefix server test

# Run all client tests (39 tests across 8 suites)
npm run test:client

# Typecheck and linting
npx tsc -b
npx oxlint
npx vite build
```

