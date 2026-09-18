# RouteWarden for Traefik (v0.2.4)

::: warning Legacy Version Notice
You are viewing archived documentation for **v0.2.4 (v0.2.x)**. [Switch to Latest ➔](/traefik/getting-started)
:::

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
| [**Getting Started**]/v0.2/traefik/getting-started) | Install RouteWarden on Traefik v2/v3 in under 5 minutes. |
| [**Configuration Reference**]/v0.2/traefik/configuration) | Static, dynamic, and container label configuration parameters. |
| [**Local Deployment**]/v0.2/traefik/local-deployment) | Test and develop plugins locally using `experimental.localPlugins`. |
| [**Testing & CI**]/v0.2/traefik/testing) | Verification routines, unit testing, and Docker Compose test suites. |
| [**Traefik Recipes & Examples**]/v0.2/traefik/examples) | Real-world blueprints (Docker Compose, Kubernetes IngressRoute, Immich). |

---

## 30-Second YAML Preview

```yaml
# dynamic_conf.yml
http:
  middlewares:
    warden-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          pathPatterns:
            - '(?i)^/admin(/.*)?$'
            - '(?i)^/api/internal(/.*)?$'
          allowedIps:
            - "10.0.0.0/8"
            - "192.168.1.100"
          response:
            mode: json
            statusCode: 404
            body: '{"error":"Not Found","message":"Endpoint unavailable"}'
```
