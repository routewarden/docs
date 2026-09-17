<p align="center">
  <img src="docs/public/icon.svg" alt="RouteWarden Icon" width="160">
</p>

<p align="center">
  <strong>High-Performance Traefik Middleware for Sensitive Path Defense & Anti-Evasion</strong>
</p>

<p align="center">
  <a href="https://github.com/routewarden/traefik-warden/actions/workflows/ci.yml"><img src="https://github.com/routewarden/traefik-warden/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/routewarden/docs/actions/workflows/deploy-docs.yml"><img src="https://github.com/routewarden/docs/actions/workflows/deploy-docs.yml/badge.svg" alt="Docs Deployment"></a>
  <a href="https://plugins.traefik.io"><img src="https://img.shields.io/badge/Traefik-v2%20%7C%20v3-blue.svg" alt="Traefik v2/v3 Compatible"></a>
  <a href="https://routewarden.github.io/docs/"><img src="https://img.shields.io/badge/docs-vitepress-6366f1.svg" alt="Documentation Site"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
</p>

---

## 📖 RouteWarden Documentation Site

This repository (`routewarden/docs`) houses the official documentation, deployment guides, security research, interactive examples, and versioned releases for the **[RouteWarden](https://github.com/routewarden/traefik-warden)** Traefik middleware plugin.

🌐 **Live Documentation Site**: [https://routewarden.github.io/docs/](https://routewarden.github.io/docs/)

---

## 🔗 RouteWarden Ecosystem References

| Resource | Link | Description |
|---|---|---|
| **Traefik Plugin (Core)** | [github.com/routewarden/traefik-warden](https://github.com/routewarden/traefik-warden) | Source code, Go tests, benchmarks, and Yaegi compatibility suite |
| **Caddy Plugin (caddy-warden)** | [github.com/routewarden/caddy-warden](https://github.com/routewarden/caddy-warden) | Official Caddy v2 security module and Caddyfile directive |
| **Traefik Plugin Catalog** | [plugins.traefik.io](https://plugins.traefik.io) | Official Traefik Plugin directory registration |
| **Documentation Portal** | [routewarden.github.io/docs](https://routewarden.github.io/docs/) | Full guides, API references, and architecture blueprints |
| **Caddy Integration Guide** | [routewarden.github.io/docs/guide/caddy](https://routewarden.github.io/docs/guide/caddy) | xcaddy compilation, Dockerfile setup, and Caddyfile syntax |
| **Interactive Examples** | [Documentation Examples Cookbook](https://routewarden.github.io/docs/examples/overview) | Ready-to-run Docker Compose and Kubernetes configurations |
| **Issue Tracker** | [RouteWarden Issues](https://github.com/routewarden/traefik-warden/issues) | Bug reports and feature requests for RouteWarden |

---

## 🛡️ What is RouteWarden?

**RouteWarden** is an ultra-fast, zero-dependency Traefik middleware plugin written in pure Go. It acts as an **in-line security shield** deployed at your edge router or ingress controller, intercepting malicious bot crawlers and vulnerability scanners probing for sensitive assets before requests ever touch your upstream containers:

- **🔐 Sensitive Asset Shielding**: Blocks `.env`, `.git`, `.aws`, `.ssh`, `.sql`, database dumps, and server configs out-of-the-box (`enableDefaultPatterns: true`).
- **⚡ Anti-Evasion Normalization**: Defeats double URL encoding (`%252e%252e`), semicolon matrix paths (`/;param/.env`), Windows backslashes (`\`), and null bytes (`%00`).
- **🌐 IP & CIDR Whitelisting**: Grants immediate bypass for corporate VPNs, office subnets, or developer IPs with support for `X-Forwarded-For` and `X-Real-IP`.
- **🎭 Multi-Action Response Engine**: Emits custom JSON, branded HTML 404/403 pages, interactive **Cloudflare Turnstile** / **hCaptcha** / **reCAPTCHA** challenges, silent TCP drops, or bot-crashing **Gzip Bombs**.

### Quick Plugin Usage

```yaml
# traefik.yml (Static Configuration)
experimental:
  plugins:
    routewarden:
      moduleName: github.com/routewarden/traefik-warden
      version: v0.2.4
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

---

## 🛠️ Developing Documentation Locally

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

## 🤝 Contributing

Contributions to improve RouteWarden's documentation, case studies, and guides are warmly welcomed!

1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/new-case-study`).
3. Validate tests and build locally:
   ```bash
   npm test
   npm run docs:build
   ```
4. Commit your changes and open a Pull Request against `develop`.

---

## 📄 License

This documentation and RouteWarden are open-source software licensed under the [MIT License](https://github.com/routewarden/traefik-warden/blob/main/LICENSE).
