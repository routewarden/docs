# Caddyfile Directive & JSON Reference

Comprehensive syntax and configuration options for **Caddy-Warden** (`github.com/routewarden/caddy-warden`).

---

## 1. Directive Ordering

Caddy evaluates HTTP handler directives strictly according to order. Because RouteWarden acts as an edge security boundary to neutralize attacks before backend processing or authentication, configure directive ordering in global options:

```nginx
{
    order route_warden before basicauth
}
```

Or before `reverse_proxy` if you do not use Caddy's built-in `basicauth`:

```nginx
{
    order route_warden before reverse_proxy
}
```

---

## 2. Complete Caddyfile Schema

```nginx
route_warden {
    # Boolean Flags
    enabled <true|false>                        # Default: true
    debug <true|false>                          # Default: false (verbose diagnostic logs)
    security_log <true|false>                   # Default: true (emit structured JSON audit events on stdout)
    enable_default_patterns <true|false>        # Default: true (.env, .git, backups, keys, etc.)
    enable_default_allow_patterns <true|false>  # Default: true (/robots.txt, /favicon.ico, etc.)
    check_query <true|false>                    # Default: false (inspect URI query strings)
    check_headers <headers...>                  # Optional: inspect forwarded headers (e.g. X-Forwarded-Uri X-Rewrite-URL)

    # Path Patterns to Block or Challenge (Go RE2 Regular Expressions)
    path_patterns <regex...>

    # Safe Whitelist Patterns (Overrides blocking)
    allow_patterns <regex...>

    # IP / CIDR Subnet Allowlist (Bypasses all checks)
    allowed_ips <ip_or_cidr...>

    # HTTP Methods to Inspect (Default: GET)
    methods <methods...>

    # Response Actions
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

## 3. Configuration Properties

| Directive | Type | Default | Description |
|---|---|---|---|
| `enabled` | `bool` | `true` | Enables or disables RouteWarden inspection. |
| `debug` | `bool` | `false` | Enables verbose diagnostic logging in Caddy's logger. |
| `security_log` | `bool` | `true` | Emits single-line structured JSON security events on stdout for CrowdSec, SIEMs, or log aggregators on blocked requests. |
| `enable_default_patterns` | `bool` | `true` | Blocks high-risk files (`.env`, `.git`, `.aws`, `.ssh`, `.sql`, `.bak`, etc.). |
| `enable_default_allow_patterns` | `bool` | `true` | Whitelists standard files like `/robots.txt`, `/favicon.ico`, `/sitemap.xml`. |
| `check_query` | `bool` | `false` | When enabled, also evaluates query parameters for sensitive file targets. |
| `path_patterns` | `list` | `[]` | Additional regex patterns to intercept. |
| `allow_patterns` | `list` | `[]` | Regex patterns that should always be allowed through. |
| `allowed_ips` | `list` | `[]` | IPv4, IPv6, or CIDR blocks exempted from checks. |
| `methods` | `list` | `["GET"]` | HTTP verbs to inspect (e.g. `methods GET POST`). Non-matching verbs bypass inspection. |

> [!TIP]
> **CrowdSec Integration**: For automated attacker remediation using `security_log`, see the **[CrowdSec Integration Guide](/examples/crowdsec)**.

---

## 4. Response Modes Matrix

| Mode | Options | Typical Use Case |
|---|---|---|
| `json` | `status_code`, `body` | REST API protection with clean JSON error |
| `html` | `status_code`, `body` | Custom branded 404 or 403 error page |
| `text` | `status_code`, `body` | Minimal plain-text rejection |
| `redirect` | `status_code`, `redirect_url` | Deflect scanners to honeypot or warning page |
| `captcha` | `captcha.provider`, `captcha.site_key` | Challenge suspicious visits via Cloudflare Turnstile/hCaptcha |
| `silent_drop` | None | Reset TCP connection immediately |
| `gzip_bomb` | `status_code`, `gzip_bomb_mb` | Active defense memory-exhaustion trap |
| `tarpit` | `tarpit_delay_ms` | Slowloris defense trickling bytes to tie up scanner concurrency |
| `ratelimit` | `status_code`, `retry_after_seconds` | 429 Too Many Requests response |
| `proxy` | `proxy_url` | Transparent canary/forensics honeypot mirror |
| `fake_success` | `status_code`, `body` | Synthetic decoy responses (`wp-login`, fake `.env`) |

---

## 5. JSON Configuration (Caddy REST API)

For zero-downtime environments configured via Caddy's dynamic API:

```json
{
  "handler": "route_warden",
  "enabled": true,
  "enable_default_patterns": true,
  "allowed_ips": ["10.0.0.0/8", "192.168.1.50"],
  "methods": ["GET", "POST"],
  "path_patterns": ["(?i)^/admin(/.*)?$"],
  "allow_patterns": ["(?i)^/admin/health$"],
  "response": {
    "mode": "json",
    "status_code": 403,
    "body": "{\"error\":\"Forbidden: Authorized Access Only\"}"
  }
}
```
