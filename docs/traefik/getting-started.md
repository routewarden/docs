# Getting Started with RouteWarden

**RouteWarden** is a high-performance Traefik middleware plugin written in pure Go, designed to intercept and block unauthorized reconnaissance, directory probing, and access to sensitive files before requests ever hit your backend services.

---

## Key Capabilities

- **Automated Sensitive Asset Shielding**: Blocks attempts to access environment configurations (`.env`), VCS repositories (`.git`, `.svn`), credentials (`.aws`, `.ssh`), database dumps (`.sql`, `.bak`), application configurations (`.yaml`, `.conf`, `.ini`), and debug panels (`phpinfo.php`, `/actuator`).
- **Anti-Evasion Engine**: Proactively detects and decodes layered URL encoding tricks (`%252e%252e`), semicolon path matrix parameters (`/;param/.env`), backslash separators (`\..\`), and null bytes (`%00`).
- **IP & CIDR Subnet Allowlisting**: Exempts internal networks, VPN gateways, and developer machines from path blocking.
- **Custom Responses & Captcha**: Return custom JSON error structures, custom branded HTML 404 pages, or challenge clients via **Cloudflare Turnstile**, **hCaptcha**, or **reCAPTCHA**.

---

## Supported Traefik Versions

| Traefik Version | Compatibility | Notes |
|---|---|---|
| **Traefik v3.x** (v3.0, v3.1, v3.2+) | **Supported** | Full support for Traefik v3 runtime, CLI flags, Docker Compose labels, and IngressRoute CRDs. |
| **Traefik v2.x** (v2.8 – v2.11+) | **Supported** | Fully compatible with Traefik v2 plugin mechanism. |
| **Traefik v1.x** | **Not Supported** | External Yaegi middleware plugins are not available in Traefik v1. |

---

## Installation & Traefik Setup

### 1. Static Configuration

Declare RouteWarden in Traefik's plugins configuration:

::: code-group

```yaml [File (YAML)]
# traefik.yml
experimental:
  plugins:
    routewarden:
      moduleName: github.com/routewarden/traefik-warden
      version: {{version}}
```

```toml [File (TOML)]
# traefik.toml
[experimental.plugins.routewarden]
  moduleName = "github.com/routewarden/traefik-warden"
  version = "{{version}}"
```

```bash [CLI]
traefik \
  --experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden \
  --experimental.plugins.routewarden.version={{version}}
```

:::

> **Local Development (`localPlugins`)**:
> ::: code-group
> ```yaml [File (YAML)]
> experimental:
>   localPlugins:
>     routewarden:
>       moduleName: github.com/routewarden/traefik-warden
> ```
> ```toml [File (TOML)]
> [experimental.localPlugins.routewarden]
>   moduleName = "github.com/routewarden/traefik-warden"
> ```
> ```bash [CLI]
> traefik --experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden
> ```
> :::

---

### 2. Dynamic Configuration

RouteWarden can be configured using **`routewarden.json`** as your universal security schema, or directly in Traefik dynamic file/label configurations. 

#### How `routewarden.json` Works with Traefik

Because `routewarden.json` adheres to the official RouteWarden JSON Schema, every field in `routewarden.json` maps directly 1-to-1 to Traefik's `plugin.routewarden` configuration keys. You maintain security rules in a single `routewarden.json` file with IDE schema validation, and deploy the corresponding keys into your Traefik router middleware:

::: code-group

```json [routewarden.json (Source of Truth)]
// Validate: rwarden validate --config routewarden.json (or via docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json)
// Generate Traefik dynamic.yml:
//   CLI:    rwarden generate --target traefik --config routewarden.json > dynamic.yml
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik --config /routewarden.json > dynamic.yml
// Generate Docker Compose labels:
//   CLI:    rwarden generate --target traefik-labels --config routewarden.json
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik-labels --config /routewarden.json
{
  "$schema": "https://routewarden.github.io/cli/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "enableDefaultAllowPatterns": true,
  "checkQuery": false,
  "checkHeaders": ["X-Forwarded-Uri", "X-Rewrite-URL"],
  "allowedIps": ["127.0.0.1", "10.0.0.0/8"],
  "methods": ["GET", "POST"],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\"error\":\"Forbidden\",\"message\":\"Sensitive route protected by RouteWarden\"}"
  }
}
```

```yaml [Traefik (Dynamic YAML)]
# dynamic_conf.yml — Direct 1:1 mapping from routewarden.json
http:
  middlewares:
    route-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          enableDefaultAllowPatterns: true
          checkQuery: false
          checkHeaders:
            - "X-Forwarded-Uri"
            - "X-Rewrite-URL"
          allowedIps:
            - "127.0.0.1"
            - "10.0.0.0/8"
          methods:
            - "GET"
            - "POST"
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","message":"Sensitive route protected by RouteWarden"}'

  routers:
    app-router:
      rule: "Host(`app.example.com`)"
      entryPoints:
        - web
      middlewares:
        - route-shield
      service: app-service
```

```toml [Traefik (Dynamic TOML)]
# dynamic_conf.toml — TOML representation of routewarden.json
[http.routers.app-router]
  rule = "Host(`app.example.com`)"
  entryPoints = ["web"]
  middlewares = ["route-shield"]
  service = "app-service"

[http.middlewares.route-shield.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true
  enableDefaultAllowPatterns = true
  checkQuery = false
  checkHeaders = ["X-Forwarded-Uri", "X-Rewrite-URL"]
  allowedIps = ["127.0.0.1", "10.0.0.0/8"]
  methods = ["GET", "POST"]

[http.middlewares.route-shield.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","message":"Sensitive route protected by RouteWarden"}'
```

```bash [Traefik (Docker Compose Labels)]
# Docker Compose labels representation of routewarden.json
- "traefik.http.routers.app.rule=Host(`app.example.com`)"
- "traefik.http.routers.app.middlewares=route-shield"
- "traefik.http.middlewares.route-shield.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.route-shield.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.route-shield.plugin.routewarden.methods=GET,POST"
- "traefik.http.middlewares.route-shield.plugin.routewarden.allowedIps=127.0.0.1,10.0.0.0/8"
- "traefik.http.middlewares.route-shield.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.route-shield.plugin.routewarden.response.statusCode=403"
```

:::

> **Offline CI/CD Validation with `rwarden`**:
> Validate your `routewarden.json` schema before deploying to Traefik using the [RouteWarden CLI (`rwarden`)](/core/cli):
> 
> ::: code-group
> 
> ```bash [CLI]
> # Validate schema compliance, regex patterns, and CIDRs
> rwarden validate --config routewarden.json
> ```
> 
> ```bash [Docker]
> docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json
> ```
> 
> :::

---

## Next Steps

- Explore [System Architecture](/core/architecture) to understand the request inspection pipeline.
- View the complete [Configuration Reference](/traefik/configuration).
- Manage centralized rules with [Using routewarden.json in Production](/core/cli#using-routewarden-json-in-production).
- Check the [Examples & Wiki Cookbook](/examples/overview) for production Docker Compose & Kubernetes blueprints.
