# Caddy-Warden for Caddy

**Caddy-Warden** (`github.com/routewarden/caddy-warden`) is the official **Caddy v2** security module. It provides native sensitive path protection, path anti-evasion normalization, IP allowlisting, and active deception defenses to Caddy web servers.

---

## Capabilities Overview

- **Native Caddy v2 Handler**: Implements Caddy's `caddyhttp.MiddlewareHandler` interface with zero-allocation path inspection.
- **Zero-Config File Shielding**: Blocks `.env`, `.git`, `.aws`, `.ssh`, `.sql`, database dumps, and server diagnostic endpoints out-of-the-box (`enable_default_patterns`).
- **Anti-Evasion Normalization**: Transparently strips semicolon parameters (`/;param/.env`), resolves percent-encoded dots (`%252e`), normalizes Windows backslashes (`\`), and strips null bytes.
- **Dual Configuration Support**: Fully configurable via standard `Caddyfile` directives or Caddy's dynamic JSON REST API (`/load` or `/config/apps/http/servers`).
- **Active Defense Modes**: Respond with custom JSON errors, branded HTML, interactive Turnstile/hCaptcha challenges, silent drops, or bot-neutralizing **Gzip Bombs**.

---

## Quick Navigation

| Guide | Description |
|---|---|
| [**Getting Started**](/caddy/getting-started) | Build Caddy with `xcaddy` or run with Docker. |
| [**Caddyfile Reference**](/caddy/caddyfile) | Directive ordering, syntax schema, and configuration options. |
| [**JSON API Reference**](/caddy/json-api) | Native Caddy REST API schema and zero-downtime reconfiguration. |
| [**Caddy Recipes & Examples**](/caddy/examples) | Real-world Caddyfile recipes (Honeypot bombs, Turnstile, VPN allowlists). |

---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Installation & Setup Snippets ───────────────────────────────────────────
const install_compose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml
services:
  caddy:
    build: # [!code ++]
      context: . # [!code ++]
      dockerfile_inline: | # [!code ++]
        FROM caddy:2-builder AS builder # [!code ++]
        RUN xcaddy build --with github.com/routewarden/caddy-warden@{{version}} # [!code ++]
        FROM caddy:2-alpine # [!code ++]
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:`,
})

const install_xcaddy = buildSnippet({
  lang: 'bash',
  code: `# Build custom Caddy binary with caddy-warden:
xcaddy build --with github.com/routewarden/caddy-warden@{{version}}`,
})

const install_dockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/routewarden/caddy-warden@{{version}} # [!code ++]

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]`,
})

const installSnippets = computed(() => ({
  caddy: [
    { filename: 'Docker Compose (Inline)', lang: 'yaml', code: install_compose.cleanCode, html: install_compose.html, hasDiff: install_compose.hasDiff },
    { filename: 'xcaddy', lang: 'bash', code: install_xcaddy.cleanCode, html: install_xcaddy.html, hasDiff: install_xcaddy.hasDiff },
    { filename: 'Dockerfile', lang: 'dockerfile', code: install_dockerfile.cleanCode, html: install_dockerfile.html, hasDiff: install_dockerfile.hasDiff },
  ],
}))

// ─── 30-Second Quick Start Snippets ──────────────────────────────────────────
const quick_caddyfile = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:8080
}`,
})

const quick_json = buildSnippet({
  lang: 'json',
  code: `{
  "handler": "route_warden", // [!code ++]
  "enabled": true, // [!code ++]
  "enable_default_patterns": true // [!code ++]
}`,
})

const quickStartSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: quick_caddyfile.cleanCode, html: quick_caddyfile.html, hasDiff: quick_caddyfile.hasDiff },
    { filename: 'Caddy (JSON API)', lang: 'json', code: quick_json.cleanCode, html: quick_json.html, hasDiff: quick_json.hasDiff },
  ],
}))
</script>

## Installation & Setup

Build a custom Caddy binary with `caddy-warden` or run via Docker:

<CodeViewer :snippets="installSnippets" />

---

## 30-Second Quick Start

Add RouteWarden directives to your Caddyfile or JSON API:

<CodeViewer :snippets="quickStartSnippets" />

