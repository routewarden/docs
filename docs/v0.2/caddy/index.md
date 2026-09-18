# Caddy-Warden for Caddy (v0.2.4)

::: warning Legacy Version Notice
You are viewing archived documentation for **v0.2.4 (v0.2.x)**. [Switch to Latest ➔](/traefik/getting-started)
:::

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
| [**Getting Started**]/v0.2/caddy/getting-started) | Build Caddy with `xcaddy` or run with Docker. |
| [**Caddyfile Reference**]/v0.2/caddy/caddyfile) | Directive ordering, syntax schema, and configuration options. |
| [**JSON API Reference**]/v0.2/caddy/json-api) | Native Caddy REST API schema and zero-downtime reconfiguration. |
| [**Caddy Recipes & Examples**]/v0.2/caddy/examples) | Real-world Caddyfile recipes (Honeypot bombs, Turnstile, VPN allowlists). |

---

## 30-Second Caddyfile Preview

```nginx
{
    order route_warden before reverse_proxy
}

example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/admin(/.*)?$"
        allowed_ips "10.0.0.0/8" "192.168.1.100"
        response {
            mode json
            status_code 404
            body "{\"error\":\"Not Found\",\"message\":\"Endpoint unavailable\"}"
        }
    }

    reverse_proxy localhost:8080
}
```
