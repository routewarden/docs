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

## 30-Second Quick Start

::: code-group

```yaml [Traefik (Dynamic YAML)]
# dynamic_conf.yml
http:
  middlewares:
    warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
```

```json [routewarden.json]
// Generate Traefik dynamic.yml or labels:
//   CLI:    rwarden generate --target [traefik|traefik-labels] --config routewarden.json
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target [traefik|traefik-labels] --config /routewarden.json
{
  "$schema": "https://routewarden.github.io/cli/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true
}
```

```bash [Traefik (Docker Compose)]
# docker-compose.yml
labels:
  - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
  - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"
```

:::

