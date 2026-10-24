# Security Policy

CyberScape is a deterministic internet-infrastructure twin, from cable landing to IXP. This document describes the security model of the repository, what is in
scope for a report, and how to report a vulnerability privately.

## Supported versions

| Version | Supported |
| --- | --- |
| `main` (1.x) | Yes |
| Older commits, forks and tags | No |

Security fixes land on `main` only. There are no maintained release branches.

## Reporting a vulnerability

**Do not open a public issue, pull request or discussion for a security problem.**

Report privately with GitHub's advisory form:

<https://github.com/shivang-jindal/CyberScape/security/advisories/new>

Please include:

- the affected component — `client`, `server` or `shared`;
- reproduction steps, ideally a request/response pair or a short script;
- the impact you believe it has;
- whether any real data is involved.

What to expect:

| | |
| --- | --- |
| Acknowledgement | Within 3 working days |
| First assessment | Within 10 working days |
| Fix or mitigation plan | Shared with the reporter before disclosure |
| Credit | Offered unless you ask otherwise |

Please do not access other users' data, do not run destructive or high-volume scans against
the demo instance, and give the maintainer a reasonable window to ship a fix before public
disclosure. Good-faith research that does not degrade the service is not treated as abuse.

## Scope

In scope: `client/`, `server/`, `shared/`, `scripts/`, the CI workflow, and the dependency
tree.

Out of scope: findings that require a deliberately unsafe operator setup — committed
secrets, TLS termination disabled, a database reachable from the internet, a shared
`ENCRYPTION_KEY` across deployments — and behaviour the README already documents as a
limitation.

## Security controls in this repository

- **Input validation.** Every request body, query string and path parameter is parsed with
  Zod schemas from `shared/` before it reaches domain code
  (`server/src/http/middleware.ts`). Domain functions receive typed values, never raw
  `req.body`.
- **No accounts.** The API is anonymous and read-mostly: there is no login, no user table
  and no credential to steal. Anything that must stay private has to be deployed behind
  the operator's own access control (private network, VPN or an authenticating proxy).
- **Security headers.** `helmet()` with Express's `x-powered-by` header disabled.
- **CORS.** An explicit origin allow-list from configuration; no wildcard with credentials.
- **Request size.** JSON bodies are capped at 1 MB.
- **Rate limiting.** `express-rate-limit` on the API surface. Counters are per process and
  in memory, so a multi-instance deployment needs a shared store.
- **Error handling.** Validation failures return `400` with field-level issues. Unexpected
  failures return a fixed message; stack traces are written to the server log only.
- **Logging.** Request logs record method, path, status and duration. Secrets, cookies and
  authorisation headers are not logged.
- **Secrets.** Configuration comes from environment variables. `.env` is git-ignored, and
  the browser bundle contains no server-side secret.
- **Dependencies.** Dependabot keeps minor and patch versions current; major upgrades are
  reviewed by hand. `npm audit` runs in CI.

## Data handling

CyberScape has no accounts, no database and no stored user records. Simulation state
lives in memory for the lifetime of the process and is discarded on restart. Share links
encode the scenario, so whoever holds a link can read the scenario it contains.

## Disclosure

This project follows coordinated disclosure: the fix and a GitHub security advisory are
published together, and the reporter is credited unless they prefer otherwise. Reporters
who need a CVE identifier can ask for one in the advisory thread.

## Questions

Security questions that are not vulnerability reports can go to the maintainer,
[@shivang-jindal](https://github.com/shivang-jindal), as a normal GitHub issue.
