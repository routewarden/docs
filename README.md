<p align="center">
  <img src="docs/public/icon.svg" alt="RouteWarden Icon" width="160">
</p>

<p align="center">
  <strong>Traefik &amp; Caddy Middleware for Sensitive Path Defense and Anti-Evasion</strong>
</p>

<p align="center">
  <a href="https://github.com/routewarden/traefik-warden/actions/workflows/ci.yml"><img src="https://github.com/routewarden/traefik-warden/actions/workflows/ci.yml/badge.svg" alt="Traefik CI Status"></a>
  <a href="https://github.com/routewarden/caddy-warden/actions/workflows/ci.yml"><img src="https://github.com/routewarden/caddy-warden/actions/workflows/ci.yml/badge.svg" alt="Caddy CI Status"></a>
  <a href="https://github.com/routewarden/docs/actions/workflows/deploy-docs.yml"><img src="https://github.com/routewarden/docs/actions/workflows/deploy-docs.yml/badge.svg" alt="Docs Deployment"></a>
  <a href="https://plugins.traefik.io"><img src="https://img.shields.io/badge/Traefik-v2%20%7C%20v3-blue.svg" alt="Traefik v2/v3 Compatible"></a>
  <a href="https://caddyserver.com"><img src="https://img.shields.io/badge/Caddy-v2-22b573.svg" alt="Caddy v2 Compatible"></a>
  <a href="https://routewarden.github.io/docs/?playground=open"><img src="https://img.shields.io/badge/Playground-Simulation-blue.svg" alt="Security Playground"></a>
  <a href="https://routewarden.github.io/docs/"><img src="https://img.shields.io/badge/docs-vitepress-6366f1.svg" alt="Documentation Site"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
</p>

---

## RouteWarden Documentation

This repository contains the documentation, deployment guides, examples, and release references for RouteWarden on both **[Traefik](https://github.com/routewarden/traefik-warden)** and **[Caddy](https://github.com/routewarden/caddy-warden)**.

- **Documentation Portal**: [https://routewarden.github.io/docs/](https://routewarden.github.io/docs/)
- **Interactive Playground**: [https://routewarden.github.io/docs/?playground=open](https://routewarden.github.io/docs/?playground=open)

---

## Ecosystem Links

| Resource | Link | Description |
|---|---|---|
| **Interactive Playground** | [routewarden.github.io/docs/?playground=open](https://routewarden.github.io/docs/?playground=open) | Test URLs against normalization rules and generate gateway configs |
| **Traefik Plugin (Core)** | [github.com/routewarden/traefik-warden](https://github.com/routewarden/traefik-warden) | Source code, unit tests, benchmarks, and Yaegi compatibility |
| **Caddy Plugin (caddy-warden)** | [github.com/routewarden/caddy-warden](https://github.com/routewarden/caddy-warden) | Official Caddy v2 security module and Caddyfile directive |
| **Traefik Plugin Catalog** | [plugins.traefik.io](https://plugins.traefik.io) | Official Traefik Plugin listing |
| **Documentation Portal** | [routewarden.github.io/docs](https://routewarden.github.io/docs/) | Installation guides, architecture, and configuration options |
| **Caddy Integration Guide** | [routewarden.github.io/docs/guide/caddy](https://routewarden.github.io/docs/guide/caddy) | Build instructions with xcaddy and Caddyfile examples |
| **Examples Cookbook** | [Documentation Examples](https://routewarden.github.io/docs/examples/overview) | Ready-to-use Docker Compose and Kubernetes configurations |
| **Issue Tracker** | [RouteWarden Issues](https://github.com/routewarden/traefik-warden/issues) | Bug reports and feature discussions |

---

## What is RouteWarden?

**RouteWarden** is a lightweight, zero-dependency middleware written in Go for **Traefik** and **Caddy v2**. It inspects incoming HTTP requests at the reverse proxy layer and blocks unauthorized attempts to reach sensitive files, hidden directories, or administrative endpoints before requests reach your application containers:

- **Sensitive Path Protection**: Blocks access to `.env`, `.git`, `.aws`, `.ssh`, `.sql`, database dumps, and server configuration files (`enableDefaultPatterns: true` / `enable_default_patterns`).
- **Anti-Evasion Normalization**: Resolves multi-layer URL encoding (`%252e%252e`), semicolon matrix parameters (`/;param/.env`), backslashes (`\`), and null bytes (`%00`) before evaluating rules.
- **IP and Subnet Allowlisting**: Lets corporate VPNs, internal networks, or trusted IP addresses bypass checks using `X-Forwarded-For`, `X-Real-IP`, or client socket addresses.
- **Custom Responses**: Returns custom JSON, static HTML error pages, Cloudflare Turnstile / hCaptcha challenges, immediate TCP resets, or honeypot redirects.
- **Interactive Playground**: Test URL patterns, inspect anti-evasion transformations, and generate gateway configurations directly in your browser.

### Interactive Playground Deeplinks

You can test how RouteWarden processes and normalizes requests using these sample links:

- [Double URL-Encoded Traversal (`/%252e%252e/.env`)](https://routewarden.github.io/docs/?playground=open&path=%2F%25252e%25252e%2F.env)
- [Matrix Semicolon Evasion (`/static;p=1/.git/config`)](https://routewarden.github.io/docs/?playground=open&path=%2Fstatic%3Bp%3D1%2F.git%2Fconfig)
- [Allowlist Override (`/robots.txt`)](https://routewarden.github.io/docs/?playground=open&path=%2Frobots.txt)
- [Gzip Bomb Active Response (`/backup.sql`)](https://routewarden.github.io/docs/?playground=open&path=%2Fbackup.sql&mode=gzipBomb&gzipMB=15)
- [IP Allowlist Bypass (`/.env` from `10.5.0.25`)](https://routewarden.github.io/docs/?playground=open&path=%2F.env&ip=10.5.0.25)

### Quick Usage

#### Traefik

```yaml
# traefik.yml (Static Configuration)
experimental:
  plugins:
    routewarden:
      moduleName: github.com/routewarden/traefik-warden
      version: v0.3.0
```

```yaml
# dynamic_conf.yml (Dynamic Configuration)
http:
  middlewares:
    shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          response:
            mode: json
            statusCode: 404
            body: '{"error":"Not Found"}'
```

#### Caddy

Build Caddy with `xcaddy`:
```bash
xcaddy build --with github.com/routewarden/caddy-warden@v0.3.0
```

Configure `Caddyfile`:
```caddyfile
{
    order routewarden first
}

:80 {
    routewarden {
        enable_default_patterns
        response json {
            status 404
            body "{\"error\":\"Not Found\"}"
        }
    }
    reverse_proxy app:8080
}
```

---

## Developing Documentation Locally

The documentation is powered by **[VitePress](https://vitepress.dev/)**.

### Prerequisites
- Node.js 18+ (Node.js 22 recommended)
- npm 9+

### Quick Start
```bash
# 1. Clone the docs repository
git clone https://github.com/routewarden/docs.git routewarden-docs
cd routewarden-docs

# 2. Install dependencies
npm install

# 3. Start local development server
npm run docs:dev
```
Open **`http://localhost:5173/docs/`** in your browser.

### Available Scripts

| Command | Description |
|---|---|
| `npm run docs:dev` | Starts the VitePress live-reload development server |
| `npm run docs:build` | Validates markdown links and compiles the static site into `docs/.vitepress/dist` |
| `npm run docs:preview` | Locally previews the compiled production build |
| `npm run sync-version` | Syncs `docs/version.json` with repository `package.json` |
| `npm run docs:release <version>` | Generates a versioned snapshot (e.g. `npm run docs:release v0.3.0`) |
| `npm test` | Runs internal Node.js unit tests for scripts |

---

## Contributing

Contributions to improve RouteWarden's documentation, case studies, and guides are welcomed.

1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/new-case-study`).
3. Validate tests and build locally:
   ```bash
   npm test
   npm run docs:build
   ```
4. Commit your changes and open a Pull Request against `develop`.

---

## License

This documentation and RouteWarden are open-source software licensed under the [MIT License](https://github.com/routewarden/traefik-warden/blob/main/LICENSE).
