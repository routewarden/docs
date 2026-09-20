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

## 30-Second Quick Start

::: code-group

```nginx [Caddy (Caddyfile)]
# Caddyfile
{
    order route_warden before reverse_proxy
}

example.com {
    route_warden {
        enable_default_patterns true
    }

    reverse_proxy localhost:8080
}
```

```json [routewarden.json]
// Generate Caddy directives:
//   CLI:    rwarden generate --target caddy --config routewarden.json
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target caddy --config /routewarden.json
{
  "$schema": "https://routewarden.github.io/cli/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true
}
```

```json [Caddy (JSON API)]
{
  "handler": "route_warden",
  "enabled": true,
  "enable_default_patterns": true
}
```

:::

