# RouteWarden CLI (`rwarden`)

`rwarden` is a developer CLI for simulating path normalization attacks offline, verifying RouteWarden configs, and emitting the official JSON Schema.

::: tip Dedicated CLI Documentation Site
The full documentation, command-line reference, installation guides, and interactive examples for `rwarden` are hosted in the official CLI documentation portal:

👉 **[Visit the RouteWarden CLI Documentation Site ↗](https://routewarden.github.io/cli/)**
:::

---

## Quick Start

### 1. One-Liner Installation (macOS & Linux)

::: code-group

```bash [GitHub Pages]
curl -fsSL https://routewarden.github.io/cli/install.sh | bash
```

```bash [GitHub Raw]
curl -fsSL https://raw.githubusercontent.com/routewarden/cli/main/install.sh | bash
```

:::

To install without `sudo` into `~/.local/bin`:

```bash
curl -fsSL https://routewarden.github.io/cli/install.sh | INSTALL_DIR=$HOME/.local/bin bash
```

To uninstall:
```bash
# System installation
sudo rm -f /usr/local/bin/rwarden
# User installation
rm -f ~/.local/bin/rwarden
```

---

### 2. Container Execution (Docker / CI/CD)

Run `rwarden` immediately without installing binaries:

```bash
# Validate configuration file
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Test path anti-evasion
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"
```

---

## 3. Official JSON Schema

The official RouteWarden JSON Schema is published at:

```text
https://routewarden.github.io/cli/schema.json
```
*(Mirrored raw at `https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json`)*

You can also emit the schema directly using the CLI:

```bash
rwarden schema > routewarden.schema.json
```

---

## 4. Generate Gateway Configs (`generate`)

Convert a `routewarden.json` into native gateway configuration — no manual translation required:

::: code-group

```bash [CLI]
# Traefik: dynamic YAML middleware definition
rwarden generate --target traefik --config routewarden.json > dynamic.yml

# Traefik: Docker Compose labels block
rwarden generate --target traefik-labels --config routewarden.json

# Caddy: Caddyfile directive block
rwarden generate --target caddy --config routewarden.json

# NGINX / OpenResty: Lua init table for nginx.conf
rwarden generate --target nginx --config routewarden.json
```

```bash [Docker]
# Traefik: dynamic YAML middleware definition
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik --config /routewarden.json > dynamic.yml

# Traefik: Docker Compose labels block
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik-labels --config /routewarden.json

# Caddy: Caddyfile directive block
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target caddy --config /routewarden.json

# NGINX / OpenResty: Lua init table for nginx.conf
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target nginx --config /routewarden.json
```

:::

| `--target` | Output |
| :--- | :--- |
| `traefik` | Traefik dynamic YAML middleware definition (`dynamic.yml`) |
| `traefik-labels` | Docker Compose `labels:` block |
| `caddy` | Caddyfile `routewarden { ... }` directive block |
| `nginx` | OpenResty Lua table for `init_by_lua_block` in `nginx.conf` |

---

## Why `routewarden.json`?

Gateways like Traefik, Caddy, and NGINX have very different configuration formats (Docker labels/YAML, Caddyfile, and Lua/nginx.conf). While you **do not need** to mount `routewarden.json` into every container (for example, Traefik can use container labels and Caddy uses `Caddyfile`), having a central `routewarden.json` provides three core capabilities:

1. **Single Source of Truth**: When you have multiple teams or multi-cloud setups running NGINX, Traefik, or Caddy, they can share the exact same ruleset, IP allowlists, and response policies without configuration drift.
2. **Offline CI/CD Validation**: Run `rwarden validate` or path-evasion testing before committing to Git or building container images, catching malformed regular expressions or invalid CIDRs before production.
3. **Automatic Target Generation**: Use `rwarden generate` or template scripts to output Traefik dynamic YAML/Docker labels, Caddy directives, or NGINX configurations automatically from one central specification.

---

## Do You Need to Mount `routewarden.json` into Containers?

| Gateway | Volume Mount Required? | Primary Configuration Methods |
| :--- | :---: | :--- |
| **Traefik** | ❌ **No** | Configured via **Docker Compose labels** on application containers or Traefik dynamic YAML (`dynamic.yml`). |
| **Caddy** | ❌ **No** | Configured directly in the **`Caddyfile`** with `routewarden { ... }` blocks (or pushed via Caddy's REST admin API). |
| **NGINX / OpenResty** | ⚠️ **Optional** | Can be loaded directly in memory inside `nginx.conf` (`routewarden.new({ ... })`), or mounted from `routewarden.json` using `cjson.decode()`. |

---

## 1. Minimal `routewarden.json`

```json
// --- Option A: Using Installed CLI (rwarden) ---
// Traefik: rwarden generate --target traefik --config routewarden.json > dynamic.yml
// Labels:  rwarden generate --target traefik-labels --config routewarden.json
// Caddy:   rwarden generate --target caddy --config routewarden.json
// NGINX:   rwarden generate --target nginx --config routewarden.json
//
// --- Option B: Using Docker Image (No CLI Installation) ---
// Traefik: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik --config /routewarden.json > dynamic.yml
// Labels:  docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik-labels --config /routewarden.json
// Caddy:   docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target caddy --config /routewarden.json
// NGINX:   docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target nginx --config /routewarden.json
{
  "$schema": "https://routewarden.github.io/cli/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "allowedIps": [
    "10.0.0.0/8",
    "192.168.1.0/24"
  ],
  "response": {
    "statusCode": 403,
    "mode": "text"
  }
}
```

---

## 2. Generating Gateway Configs from `routewarden.json`

Transform your universal `routewarden.json` into native gateway configurations using either the local binary or Docker:

::: code-group

```bash [Traefik (Dynamic YAML)]
# Installed CLI:
rwarden generate --target traefik --config routewarden.json > dynamic.yml

# Docker Image:
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik --config /routewarden.json > dynamic.yml
```

```bash [Traefik (Docker Labels)]
# Installed CLI:
rwarden generate --target traefik-labels --config routewarden.json

# Docker Image:
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik-labels --config /routewarden.json
```

```bash [Caddy (Caddyfile Block)]
# Installed CLI:
rwarden generate --target caddy --config routewarden.json

# Docker Image:
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target caddy --config /routewarden.json
```

```bash [NGINX (Lua Config Block)]
# Installed CLI:
rwarden generate --target nginx --config routewarden.json

# Docker Image:
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target nginx --config /routewarden.json
```

:::

### Generated Examples from `routewarden.json`

::: code-group

```yaml [Traefik (dynamic.yml)]
http:
  middlewares:
    route-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          allowedIps:
            - "10.0.0.0/8"
            - "192.168.1.0/24"
          statusCode: 403
```

```yaml [Traefik (Docker Labels)]
services:
  webapp:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.middlewares=warden"
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"
      - "traefik.http.middlewares.warden.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.0/24"
      - "traefik.http.middlewares.warden.plugin.routewarden.statusCode=403"
```

```caddyfile [Caddyfile Directive]
example.com {
    routewarden {
        enable_default_patterns
        allow_ips 10.0.0.0/8 192.168.1.0/24
        block_status 403
    }
    reverse_proxy app:8080
}
```

```nginx [NGINX / OpenResty (nginx.conf)]
init_by_lua_block {
    local routewarden = require("resty.routewarden")
    warden = routewarden.new({
        enable_default_patterns = true,
        allowed_ips = { "10.0.0.0/8", "192.168.1.0/24" },
        block_status = 403
    })
}
```

:::

---

## 3. Offline CI/CD Validation

Prevent malformed regexes or invalid CIDR blocks from breaking production before committing or deploying:

::: code-group

```bash [CLI]
rwarden validate --config routewarden.json
```

```bash [Docker]
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json
```

```yaml [GitHub Actions]
- name: Validate RouteWarden Config
  run: |
    curl -fsSL https://routewarden.github.io/cli/install.sh | bash
    rwarden validate --config routewarden.json
```

:::

---

## 4. Passing Configuration via Docker & Docker Compose

#### A. NGINX / OpenResty (Direct Volume Mount)

NGINX reads `/etc/nginx/routewarden.json` directly from container disk into worker memory on startup:

```yaml [docker-compose.yml]
services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
    volumes:
      # Mount routewarden.json into container
      - ./routewarden.json:/etc/nginx/routewarden.json:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

Inside your `nginx.conf`:
```nginx
init_by_lua_block {
    local cjson = require("cjson")
    local routewarden = require("resty.routewarden")
    local f = assert(io.open("/etc/nginx/routewarden.json", "r"))
    local cfg = cjson.decode(f:read("*all"))
    f:close()
    warden = routewarden.new(cfg)
}
```

---

#### B. Traefik (Volume Mount via Dynamic Provider)

Traefik consumes middleware configs from dynamic file providers. Mount your dynamic configuration file along with your static Traefik file or command:

```yaml [docker-compose.yml]
services:
  traefik:
    image: traefik:v3.3
    command:
      - "--providers.file.filename=/etc/traefik/dynamic.yml"
      - "--providers.file.watch=true"
      - "--experimental.plugins.routewarden.moduleName=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version=v1.1.0"
    ports:
      - "80:80"
    volumes:
      # Mount dynamic config generated from or mapped from routewarden.json
      - ./dynamic.yml:/etc/traefik/dynamic.yml:ro
```

`dynamic.yml`:
```yaml
http:
  middlewares:
    route-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          allowedIps:
            - "10.0.0.0/8"
```

*(Or pass settings via Docker labels directly on your application service without mounting extra files):*
```yaml
services:
  webapp:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`example.com`)"
      - "traefik.http.routers.app.middlewares=warden"
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"
```

---

#### C. Caddy (Caddyfile Volume Mount & JSON API)

Mount your `Caddyfile` or load JSON configuration via Caddy's REST endpoint:

```yaml [docker-compose.yml]
services:
  caddy:
    image: my-caddy-with-routewarden:latest
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
```

Or push the JSON payload directly into Caddy's `/load` API:
```bash
curl localhost:2019/load \
  -H "Content-Type: application/json" \
  -d @caddy-config.json
```

---

## Learn More

For complete reference on path evasion testing, CI/CD linting recipes, and IDE autocomplete setup, visit:
- 📖 [RouteWarden CLI Documentation](https://routewarden.github.io/cli/)
- 💻 [GitHub Repository (`routewarden/cli`)](https://github.com/routewarden/cli)

