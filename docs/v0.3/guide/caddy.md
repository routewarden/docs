# Caddy-Warden: Caddy Security Module (v0.3.2)

::: warning Legacy Version Notice
You are viewing archived documentation for **v0.3.2**. [Switch to Latest ➔](/traefik/getting-started)
:::

**Caddy-Warden** (`github.com/routewarden/caddy-warden`) is the official **Caddy v2** security module from RouteWarden. It brings high-performance sensitive path defense, anti-evasion normalization, IP allowlisting, and active deception defenses to Caddy web servers.

---

## Key Capabilities

- **Zero-Config Sensitive File Shielding**: Blocks `.env`, `.git`, `.aws`, `.ssh`, `.sql`, database dumps, and server manifests out-of-the-box (`enable_default_patterns`).
- **Anti-Evasion Engine**: Normalizes multiple URL encodings (`%252e%252e`), semicolon matrix parameters (`/;param/.env`), Windows backslashes (`\`), and null bytes (`%00`) before pattern matching.
- **IP & CIDR Allowlisting**: Exempt trusted corporate subnets, office IPs, or VPNs (`allowed_ips`) using client IP detection or upstream proxy headers (`X-Forwarded-For`, `X-Real-IP`).
- **Multi-Action Defense Engine**: Respond with JSON errors, branded HTML, Cloudflare Turnstile/hCaptcha verification challenges, silent TCP resets (`silent_drop`), or bot-neutralizing **Gzip Bombs** (`gzip_bomb`).

---

## Installation & Building Caddy

Caddy uses [xcaddy](https://github.com/caddyserver/xcaddy) to compile custom builds with plugins:

### Using xcaddy (Recommended)

```bash
# Install xcaddy if you haven't already
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Build Caddy with caddy-warden
xcaddy build \
  --with github.com/routewarden/caddy-warden@v0.3.2
```

### Using Docker

```dockerfile
FROM caddy:2-builder AS builder

RUN xcaddy build \
    --with github.com/routewarden/caddy-warden@v0.3.2

FROM caddy:2

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

---

## Directive Ordering

In Caddy, custom HTTP handler modules must be ordered in the middleware chain. Add `order route_warden before basicauth` or `order route_warden before reverse_proxy` inside your Caddyfile global options block:

```nginx
{
    order route_warden before basicauth
}
```

---

## Caddyfile Syntax

```nginx
route_warden {
    enabled <true|false>
    enable_default_patterns <true|false>
    enable_default_allow_patterns <true|false>
    check_query <true|false>

    path_patterns <regex...>
    allow_patterns <regex...>
    allowed_ips <ip_or_cidr...>
    methods <methods...> # e.g. methods GET POST (default: GET)

    response {
        mode <json|html|text|xml|redirect|captcha|silent_drop|gzip_bomb|tarpit|fake_success|ratelimit|proxy|infinite_stream>
        status_code <int>
        body <string>
        redirect_url <url>
        proxy_url <url>
        gzip_bomb_mb <int>
        retry_after_seconds <int>
        tarpit_delay_ms <int>
        stream_size_mb <int>
        captcha {
            provider <turnstile|hcaptcha|recaptcha>
            site_key <key>
        }
    }
}
```

---

## Examples

### 1. Basic Production Shield (JSON 404)

Shield all sensitive paths and return a sterile JSON 404 response:

```nginx
{
    order route_warden before reverse_proxy
}

example.com {
    route_warden {
        enable_default_patterns true
        response {
            mode json
            status_code 404
            body "{\"error\":\"Not Found\"}"
        }
    }

    reverse_proxy localhost:8080
}
```

### 2. IP Whitelisting with Safe Admin Exceptions

Allow corporate VPN (`10.0.0.0/8`) and office IP (`192.168.1.100`) to access administrative endpoints while blocking external crawlers:

```nginx
{
    order route_warden before reverse_proxy
}

app.example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/admin(/.*)?$" "(?i)^/metrics$"
        allow_patterns "(?i)^/admin/health$"
        allowed_ips "10.0.0.0/8" "192.168.1.100"
        response {
            mode json
            status_code 403
            body "{\"error\":\"Access Denied: Internal Network Only\"}"
        }
    }

    reverse_proxy backend:3000
}
```

### 3. Active Defense: Gzip Bomb Decompression Trap

When automated scrapers scan for `.env` or WordPress admin endpoints, send an active defense gzip bomb stream that expands ~1000× in client RAM:

```nginx
{
    order route_warden before reverse_proxy
}

honeypot.example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/wp-login\.php$" "(?i)^/xmlrpc\.php$"
        response {
            mode gzip_bomb
            status_code 200
            gzip_bomb_mb 10
        }
    }

    reverse_proxy backend:80
}
```

### 4. Interactive Captcha Verification

Challenge visitors accessing sensitive URLs using Cloudflare Turnstile:

```nginx
{
    order route_warden before reverse_proxy
}

portal.example.com {
    route_warden {
        path_patterns "(?i)^/portal/sensitive(/.*)?$"
        response {
            mode captcha
            captcha {
                provider turnstile
                site_key "0x4AAAAAAAxxyyzz"
            }
        }
    }

    reverse_proxy backend:8080
}
```

---

## JSON Configuration (Caddy Native API)

If you configure Caddy via its native JSON API:

```json
{
  "apps": {
    "http": {
      "servers": {
        "srv0": {
          "listen": [":443"],
          "routes": [
            {
              "handle": [
                {
                  "handler": "route_warden",
                  "enabled": true,
                  "enable_default_patterns": true,
                  "allowed_ips": ["10.0.0.0/8"],
                  "response": {
                    "mode": "json",
                    "status_code": 404,
                    "body": "{\"error\":\"Not Found\"}"
                  }
                },
                {
                  "handler": "reverse_proxy",
                  "upstreams": [
                    { "dial": "localhost:8080" }
                  ]
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

---

## Related Links

- [RouteWarden Core Architecture & Anti-Evasion Engine](/guide/architecture)
- [Response Modes Deep Dive](/reference/response-modes)
- [Custom Path Patterns Reference](/reference/custom-paths)
- [Caddy-Warden GitHub Repository](https://github.com/routewarden/caddy-warden)
