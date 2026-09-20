---
layout: home

hero:
  name: "RouteWarden"
  text: "High-Performance Edge Defense for Traefik, Caddy & NGINX"
  tagline: "Stop sensitive file leaks (.env, .git, backups), neutralize path-evasion attacks, whitelist IPs, and challenge threats before requests reach your upstream services."
  image:
    src: /icon.svg
    alt: RouteWarden Logo
  actions:
    - theme: brand
      text: Traefik Plugin ➔
      link: /traefik/
    - theme: brand
      text: Caddy Module ➔
      link: /caddy/
    - theme: brand
      text: NGINX & OpenResty ➔
      link: /nginx/
    - theme: alt
      text: Core Security Engine
      link: /core/architecture
    - theme: alt
      text: View on GitHub
      link: https://github.com/routewarden

features:
  - title: Scanner Defense
    details: Intercepts automated crawlers probing for exposed credentials, source repositories, backups, and administrative endpoints.
  - title: Path Normalization
    details: Normalizes double URL encoding, directory traversal, backslashes, semicolon matrix parameters, and null bytes before evaluation.
  - title: IP Allowlisting
    details: Allows trusted subnets, VPNs, or developer IPs to bypass path checks using socket RemoteAddr, X-Forwarded-For, or X-Real-IP.
  - title: Configurable Responses
    details: Supports custom JSON, HTML error pages, Cloudflare Turnstile or hCaptcha verification, redirects, silent drops, or gzip bombs.
  - title: Pure Go & Lua Engines
    details: Native pure Go implementations for Traefik and Caddy, alongside high-performance LuaJIT module for NGINX and OpenResty.
  - title: Multi-Gateway Native
    details: Drop-in support for Traefik dynamic configs, Docker labels, Kubernetes CRDs, Caddyfile directives, and NGINX Lua blocks.
---

## What is RouteWarden?

**RouteWarden** is a security middleware for **Traefik**, **Caddy**, and **NGINX / OpenResty**. It runs at your edge router or ingress controller, evaluating inbound requests and blocking reconnaissance scans before they reach backend application containers.

Internet-connected servers receive continuous automated scans looking for `.env` files, `.git` trees, database dumps, backup archives, and administrative interfaces. RouteWarden matches these attempts at the proxy level and responds according to your configuration.

---

## Request Inspection Lifecycle

RouteWarden evaluates inbound HTTP requests in five stages:

<div class="home-pipeline">
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 1</div>
    <div class="pipeline-title">HTTP Verb Filtering</div>
    <div class="pipeline-desc">Checks the request method against configured <code>methods</code> (default: <code>["GET"]</code>). Non-matching methods bypass inspection immediately.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 2</div>
    <div class="pipeline-title">IP Allowlist Check</div>
    <div class="pipeline-desc">Checks client IP against <code>allowedIps</code> via socket <code>RemoteAddr</code>, <code>X-Forwarded-For</code>, or <code>X-Real-IP</code>. Trusted addresses bypass checks immediately.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 3</div>
    <div class="pipeline-title">Anti-Evasion Normalization</div>
    <div class="pipeline-desc">Decodes multi-layer percent-encoding (<code>%252e%252e</code>), strips matrix parameters (<code>/;param/.env</code>), normalizes backslashes (<code>\</code>), and removes null bytes.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 4</div>
    <div class="pipeline-title">Rule Evaluation</div>
    <div class="pipeline-desc">Evaluates safe exemptions (<code>allowPatterns</code>) first. If not exempted, checks built-in sensitive dictionaries and custom <code>pathPatterns</code>.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 5</div>
    <div class="pipeline-title">Response Generation</div>
    <div class="pipeline-desc">Executes the configured response mode: custom JSON, HTML, redirect, silent drop, challenge verification, or gzip compression response.</div>
  </div>
</div>

---

## Default Protection Rules

With `enableDefaultPatterns: true` active, RouteWarden blocks common exposure paths without requiring custom rules:

<div class="attack-grid">
  <div class="attack-card">
    <h4>Environment & Secrets</h4>
    <p>Blocks <code>/.env</code>, <code>/.env.local</code>, <code>/.env.production</code>, <code>/.aws/credentials</code>, and <code>/.ssh/id_rsa</code>.</p>
  </div>
  <div class="attack-card">
    <h4>Version Control Repositories</h4>
    <p>Prevents source disclosure via <code>/.git/config</code>, <code>/.git/HEAD</code>, <code>/.svn/entries</code>, and <code>/.hg/</code>.</p>
  </div>
  <div class="attack-card">
    <h4>Database Dumps & Backups</h4>
    <p>Catches accidental exposure of <code>/dump.sql</code>, <code>/db.bak</code>, <code>/backup.tar.gz</code>, and <code>/site.zip</code>.</p>
  </div>
  <div class="attack-card">
    <h4>Configuration & Debug Files</h4>
    <p>Guards server manifests like <code>/config.yaml</code>, <code>/app.ini</code>, <code>/phpinfo.php</code>, and Spring <code>/actuator/*</code>.</p>
  </div>
</div>

---

## Anti-Evasion Normalization

Attackers often obfuscate request paths to bypass string matching. RouteWarden normalizes paths before evaluation:

| Evasion Technique | Raw Attacker Payload | RouteWarden Normalized Candidate | Action |
|---|---|---|---|
| **Double URL Encoding** | `/%252e%252e/%252eenv` | `/.env` | Blocked |
| **Semicolon Matrix Traversal** | `/public;param=1/..;param=2/.env` | `/.env` | Blocked |
| **Windows / Backslash** | `/static\..\.git\config` | `/.git/config` | Blocked |
| **Null Byte Injection** | `/.env%00.png` | `/.env` | Blocked |
| **Dot-Segment Traversal** | `/images/../.aws/credentials` | `/.aws/credentials` | Blocked |

---

## Response Modes

When a path matches a block rule, RouteWarden can respond with:

- **`json`**: Structured JSON payload with customizable status code and body.
- **`html`**: Custom HTML error page.
- **`text`**: Plain text error message.
- **`xml`**: XML-formatted error document.
- **`captcha`**: Human challenge verification using Cloudflare Turnstile, hCaptcha, or Google reCAPTCHA.
- **`redirect`**: HTTP redirect to an external sink or notice page.
- **`silentDrop`**: Immediate TCP connection closure.
- **`gzipBomb`**: Returns a compressed gzip payload that expands in client memory.
- **`tarpit`**: Delivers bytes slowly to hold client connections open.
- **`fakeSuccess`**: Decoy response returning synthetic data with a 200 OK.
- **`rateLimitChallenge`**: Returns HTTP 429 with a standard `Retry-After` header.
- **`proxy`**: Forwards matching traffic to an internal inspection or canary service.
- **`infiniteStream`**: Continuous stream of pseudorandom data.

## 30-Second Quick Start

Deploy RouteWarden in under 30 seconds with minimal configuration:

::: code-group

```json [routewarden.json]
// Generate gateway configs:
//   CLI:    rwarden generate --target [traefik|caddy|nginx] --config routewarden.json
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target [traefik|caddy|nginx] --config /routewarden.json
{
  "$schema": "https://routewarden.github.io/cli/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true
}
```

```yaml [Traefik (Dynamic YAML)]
# dynamic_conf.yml
http:
  middlewares:
    warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true

  routers:
    app-router:
      rule: "Host(`example.com`)"
      entryPoints:
        - web
      middlewares:
        - warden
      service: app-service
```

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

```bash [Traefik (Docker Compose)]
# docker-compose.yml
labels:
  - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
  - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"
```

```json [Caddy (JSON API)]
{
  "handler": "route_warden",
  "enabled": true,
  "enable_default_patterns": true
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf
init_by_lua_block {
    local routewarden = require("resty.routewarden")
    warden = routewarden.new({
        enabled = true,
        enable_default_patterns = true
    })
}

server {
    listen 80;
    server_name example.com;

    access_by_lua_block {
        warden:check()
    }

    location / {
        proxy_pass http://localhost:8080;
    }
}
```

:::

---

## Production Case Studies

Real-world deployment patterns demonstrating how engineering teams and self-hosters protect their applications using RouteWarden:

<div class="attack-grid">
  <div class="attack-card">
    <h4><a href="/docs/examples/case-study-immich">Immich Photo Sharing</a></h4>
    <p>Public photo/album sharing while strictly cloaking administrative, login, and user management APIs under a 404.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/docs/examples/case-study-webhooks">Zero-Trust Webhooks</a></h4>
    <p>Lock down Stripe/GitHub payment webhook ingress using official provider IP CIDRs and silent TCP drops.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/docs/examples/case-study-observability">Metrics & Actuator Cloaking</a></h4>
    <p>Shield Prometheus <code>/metrics</code> and Spring Boot <code>/actuator</code> from public scanners while keeping internal scrapers active.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/docs/examples/case-study-cms-shield">WordPress & CMS Shield</a></h4>
    <p>Defeat brute-force and XML-RPC attacks on <code>wp-login.php</code> using interactive Cloudflare Turnstile / hCaptcha challenges.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/docs/examples/case-study-vaultwarden">Password Vaults (Bitwarden)</a></h4>
    <p>Allow public mobile password sync while restricting <code>/admin</code> strictly to WireGuard or Tailscale subnets.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/docs/examples/case-study-honeypot-staging">Honeypots & Active Defense</a></h4>
    <p>Crash scanning bots with <code>gzipBomb</code> decompression traps, reset TCP connections with <code>silentDrop</code>, and cloak staging preview clusters.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/docs/examples/crowdsec">CrowdSec Integration & Auto-Ban</a></h4>
    <p>Emit structured JSON security audit events directly into CrowdSec to automatically ban attacker IPs across your firewall on their first request.</p>
  </div>
</div>

---

## Ready to Explore?

- Deploy on [Traefik Proxy](/traefik/) with our step-by-step setup guides and Docker Compose templates.
- Deploy on [Caddy Web Server](/caddy/) with native Caddyfile directives and xcaddy builds.
- Deploy on [NGINX & OpenResty](/nginx/) with in-memory Lua inspection.
- Learn about the [Core System Architecture](/core/architecture) and [Anti-Evasion Engine](/core/anti-evasion).
- Browse real-world recipes in the [Cookbook & Case Studies](/examples/overview).
