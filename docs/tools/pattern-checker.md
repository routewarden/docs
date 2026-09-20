---
title: Pattern & Anti-Evasion Checker
description: Interactive simulation tool for testing RouteWarden regex patterns, evasion techniques, and allowlist overrides.
---

# Pattern & Response Playground

Use this interactive playground to test RouteWarden's URL path normalization, built-in sensitive file blocking, allowlist bypasses, and custom regex rules. Simulate the live HTTP response returned by RouteWarden (including deceptive honeypots, gzip bombs, tarpits, and custom payloads) and export ready-to-use configurations for **Caddy**, **NGINX (Lua / OpenResty)**, **Traefik (YAML & TOML)**, **Docker Compose**, or **Kubernetes**.

> **Shareable Playground URLs**: Click the **Share** button below the path bar to generate a direct link containing your current test path, HTTP method, client IP, custom rules, and response settings. Anyone opening the link will reproduce the exact simulation state.

<PatternChecker />

---

## How RouteWarden Evaluates Requests

The simulator follows the canonical evaluation sequence implemented identically across RouteWarden's Go core and OpenResty Lua modules:

```
Incoming Request
       │
       ▼
┌─────────────────────────┐
│ 1. IP Whitelist Match?  │ ─── (Matches allowedIps / CIDRs) ───► Bypassed & Forwarded
└─────────────────────────┘
       │ No
       ▼
┌─────────────────────────┐
│ 2. Anti-Evasion Engine  │
│ - Multi-layer Unescape  │ ─── (%252e ➔ .)
│ - Semicolon Stripping   │ ─── (/path;param/.. ➔ /path/..)
│ - Backslash Convert     │ ─── (\ ➔ /)
│ - Traversal Canonical   │ ─── (/static/../.env ➔ /.env)
└─────────────────────────┘
       │ Normalized Candidate Path
       ▼
┌─────────────────────────┐
│ 3. Allowlist Check      │
│ - Built-in Safe Rules   │ ─── (/robots.txt, /.well-known/*, etc.) ──► Allowed & Forwarded
│ - Custom allowPatterns  │
└─────────────────────────┘
       │ No
       ▼
┌─────────────────────────┐
│ 4. Blocklist Check      │
│ - Built-in Dictionaries │ ─── (Matches .env, .git, dumps, etc.) ──► Intercepted & Challenged
│ - Custom pathPatterns   │
└─────────────────────────┘
       │ No
       ▼
┌─────────────────────────┐
│ 5. Clean Request        │ ─── Forwarded to Upstream Backends
└─────────────────────────┘
```

---

## Related Documentation

- **[Using routewarden.json](/core/cli#using-routewarden-json-in-production)**: Universal schema configuration and production usage across gateways.
- **[RouteWarden CLI (`rwarden`)](/core/cli)**: Command-line tool for linting, testing, validating, and converting `routewarden.json`.
- **[Custom Path Regex Guide](/core/custom-patterns)**: Syntax, cheat sheets, and production blueprints for popular frameworks.
- **[Anti-Evasion Engine](/core/anti-evasion)**: Technical breakdown of defeated evasion attacks.
- **[Response Modes Engine](/core/response-modes)**: All 13 response behaviors (JSON, Captcha, Gzip Bomb, Tarpit, etc.).
- **[Traefik Configuration](/traefik/configuration)**, **[Caddyfile Reference](/caddy/caddyfile)** & **[NGINX Configuration](/nginx/configuration)**: Gateway-specific syntax.
