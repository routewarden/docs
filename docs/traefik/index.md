---
title: RouteWarden for Traefik
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Installation & Setup Snippets ───────────────────────────────────────────
const install_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.3
    command:
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version={{version}}" # [!code ++]
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=warden@docker" # [!code ++]
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels: # [!code ++]
      - "traefik.enable=true" # [!code ++]
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]`,
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static YAML)
entryPoints: # [!code ++]
  web: # [!code ++]
    address: ":80" # [!code ++]
    http: # [!code ++]
      middlewares: # [!code ++]
        - warden@file # [!code ++]

experimental: # [!code ++]
  plugins: # [!code ++]
    routewarden: # [!code ++]
      moduleName: github.com/routewarden/traefik-warden # [!code ++]
      version: {{version}} # [!code ++]`,
})

const install_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static TOML)
[entryPoints.web] # [!code ++]
  address = ":80" # [!code ++]
  [entryPoints.web.http] # [!code ++]
    middlewares = ["warden@file"] # [!code ++]

[experimental.plugins.routewarden] # [!code ++]
  moduleName = "github.com/routewarden/traefik-warden" # [!code ++]
  version = "{{version}}" # [!code ++]`,
})

const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Traefik CLI arguments
traefik \\
  --experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden \\ # [!code ++]
  --experimental.plugins.routewarden.version={{version}} \\ # [!code ++]
  --entrypoints.web.http.middlewares=warden@docker # [!code ++]`,
})

const installSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yaml', lang: 'yaml', code: install_compose.cleanCode, html: install_compose.html, hasDiff: install_compose.hasDiff },
    { filename: 'traefik.yml', lang: 'yaml', code: install_yaml.cleanCode, html: install_yaml.html, hasDiff: install_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: install_toml.cleanCode, html: install_toml.html, hasDiff: install_toml.hasDiff },
    { filename: 'CLI Flags', lang: 'bash', code: install_cli.cleanCode, html: install_cli.html, hasDiff: install_cli.hasDiff },
  ],
}))

// ─── 30-Second Quick Start Snippets ──────────────────────────────────────────
const quick_compose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml: Global protection on entryPoint
services:
  traefik:
    image: traefik:v3.3
    command:
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version={{version}}"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=warden@docker" # [!code ++]
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      - "traefik.enable=true"
      # Global EntryPoint Shield: protects ALL services automatically
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]

  # All services are now shielded automatically without router labels:
  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=PathPrefix(\`/\`)"
      - "traefik.http.routers.app.entrypoints=web"`,
})

const quick_yaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true

  routers:
    # Router requires no middleware labels when attached to entryPoints:
    app-router:
      rule: "Host(\`example.com\`)"
      entryPoints:
        - web
      service: app-service`,
})

const quick_toml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.middlewares.warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.routers.app-router]
  rule = "Host(\`example.com\`)"
  entryPoints = ["web"]
  service = "app-service"`,
})

const quickStartSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: quick_compose.cleanCode, html: quick_compose.html, hasDiff: quick_compose.hasDiff },
    { filename: 'traefik.yaml', lang: 'yaml', code: quick_yaml.cleanCode, html: quick_yaml.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: quick_toml.cleanCode, html: quick_toml.html, hasDiff: false },
  ],
}))

</script>

# RouteWarden for Traefik

**RouteWarden** (`github.com/routewarden/traefik-warden`) is an ultra-fast, zero-dependency Traefik middleware plugin built in pure Go. It acts as an **in-line security shield** deployed at your Traefik reverse proxy or ingress controller.

---

## Capabilities Overview

- **Automatic Probing Defense**: Blocks automated vulnerability bots probing for `.env`, `.git`, `.aws/credentials`, database dumps, and server diagnostic endpoints.
- **Path Anti-Evasion Engine**: Normalizes double percent-encoding, semicolon matrix parameters, Windows/IIS backslashes, and null bytes before regex evaluation.
- **IP & CIDR Whitelisting**: Allows trusted corporate VPNs, office IPs, or developer subnets (`allowedIps`) to bypass inspection using `X-Forwarded-For`, `X-Real-IP`, or socket `RemoteAddr`.
- **Pure Go & Yaegi Native**: 100% standard library compliance with Traefik's Yaegi dynamic interpreter. Zero external dependencies.
- **Container & Orchestrator Native**: Supports Docker Compose labels (global entrypoints and per-service), file dynamic configurations (YAML/TOML), and Kubernetes IngressRoute CRDs.

---

## Quick Navigation

| Guide | Description |
|---|---|
| [**Getting Started**](/traefik/getting-started) | Install RouteWarden on Traefik v2/v3 in under 5 minutes. |
| [**Configuration Reference**](/traefik/configuration) | Static, dynamic, and container label configuration parameters. |
| [**Local Deployment**](/traefik/local-deployment) | Test and develop plugins locally using `experimental.localPlugins`. |
| [**Testing & CI**](/traefik/testing) | Verification routines, unit testing, and Docker Compose test suites. |
| [**Traefik Recipes & Examples**](/traefik/examples) | Real-world blueprints (Docker Compose, Kubernetes IngressRoute, Immich). |

---

## Installation & Setup

Declare the RouteWarden plugin in Traefik's static configuration or container launch arguments:

<CodeViewer :snippets="installSnippets" />

---

## 30-Second Quick Start

Attach the RouteWarden middleware to your routers:

<CodeViewer :snippets="quickStartSnippets" />

