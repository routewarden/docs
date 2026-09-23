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
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro`,
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static YAML)
experimental: # [!code ++]
  plugins: # [!code ++]
    routewarden: # [!code ++]
      moduleName: github.com/routewarden/traefik-warden # [!code ++]
      version: {{version}} # [!code ++]`,
})

const install_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static TOML)
[experimental.plugins.routewarden] # [!code ++]
  moduleName = "github.com/routewarden/traefik-warden" # [!code ++]
  version = "{{version}}" # [!code ++]`,
})

const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Traefik CLI arguments
traefik \\
  --experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden \\ # [!code ++]
  --experimental.plugins.routewarden.version={{version}} # [!code ++]`,
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
    app-router:
      rule: "Host(\`example.com\`)"
      entryPoints:
        - web
      middlewares:
        - warden
      service: app-service`,
})

const quick_toml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.routers.app-router]
  rule = "Host(\`example.com\`)"
  entryPoints = ["web"]
  middlewares = ["warden"]
  service = "app-service"

[http.middlewares.warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true`,
})

const quick_labels = buildSnippet({
  lang: 'yaml',
  code: `# Docker Compose Labels on your backend container:
services:
  app:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`example.com\`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.routers.app.middlewares=warden"
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"`,
})

const quickStartSnippets = computed(() => ({
  traefik: [
    { filename: 'Traefik(YAML)', lang: 'yaml', code: quick_yaml.cleanCode, html: quick_yaml.html, hasDiff: false },
    { filename: 'Traefik(TOML)', lang: 'toml', code: quick_toml.cleanCode, html: quick_toml.html, hasDiff: false },
    { filename: 'Traefik(Labels)', lang: 'yaml', code: quick_labels.cleanCode, html: quick_labels.html, hasDiff: false },
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

