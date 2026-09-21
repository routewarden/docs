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

---

### Updating to the Latest Version

To upgrade `rwarden` to the newest release:

::: code-group

```bash [One-Liner Re-installation]
# Automatically detects and downloads the newest release from GitHub:
curl -fsSL https://routewarden.github.io/cli/install.sh | bash

# Or into ~/.local/bin:
curl -fsSL https://routewarden.github.io/cli/install.sh | INSTALL_DIR=$HOME/.local/bin bash
```

```bash [Docker Image]
# Pull the newest container image:
docker pull ghcr.io/routewarden/cli:latest
```

```bash [From Source (Go)]
# Pull updates and rebuild:
cd cli && git pull origin main && go build -o /usr/local/bin/rwarden .
```

:::

Verify the updated version:
```bash
rwarden version
```

---

### Uninstallation

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

# Test query string inspection
docker run --rm ghcr.io/routewarden/cli:latest test --path "/search" --query "file=secret.conf"

# Test against a custom config with client IP whitelisting
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest test --config /routewarden.json --path "/admin" --ip "10.0.0.1"
```

---

## 3. Test Paths & Queries (`test`)

Simulate candidate path extraction, normalization, and pattern matching offline without running gateway instances:

::: code-group

```bash [CLI]
# Test a sensitive file path
rwarden test --path "/.env"

# Test double URL encoding evasion
rwarden test --path "/static/%252e%252e/.env"

# Test query string inspection
rwarden test --path "/search" --query "file=secret.conf"

# Test custom HTTP methods
rwarden test --method POST --path "/wp-config.php"

# Test custom HTTP headers
rwarden test --path "/api" --header "X-Forwarded-Uri: /.env"

# Test against a custom RouteWarden config file
rwarden test --config routewarden.json --path "/admin/dashboard"

# Test client IP whitelisting
rwarden test --config routewarden.json --path "/admin" --ip "10.0.0.1"

# Pipe configuration via stdin
cat routewarden.json | rwarden test --config - --path "/admin"
```

```bash [Docker]
# Test a sensitive path
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"

# Test evasion via query inspection
docker run --rm ghcr.io/routewarden/cli:latest test --path "/search" --query "file=secret.conf"

# Test with mounted configuration and client IP
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest test --config /routewarden.json --path "/admin" --ip "10.0.0.1"
```

:::

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `--path` | string | `""` | **Required**. Request path to evaluate (e.g. `/.env` or `/api/v1`) |
| `--config` | string | `""` | Optional path to `routewarden.json` (or `-` for stdin) |
| `--query` | string | `""` | Optional request query string to evaluate |
| `--method` | string | `"GET"` | HTTP method (e.g. `GET`, `POST`, `HEAD`) |
| `--ip` | string | `""` | Optional client IP address to evaluate against `allowedIps` |
| `--header` | string | `""` | Optional header in `Key:Value` format to test |
| `--check-query` | bool | `true` | Enable or disable query string inspection |

---

## 4. Official JSON Schema

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

## 5. Generate Gateway Configs (`generate`)

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

### Generated Configuration Examples

::: code-group

```yaml [Traefik (dynamic.yml)]
# Traefik dynamic configuration generated by RouteWarden CLI
http:
  middlewares:
    routewarden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          enableDefaultAllowPatterns: true
          allowedIps:
            - '10.0.0.0/8'
            - '192.168.1.0/24'
          methods:
            - 'GET'
          response:
            mode: text
            statusCode: 403
            body: "403 Forbidden: Access to sensitive endpoint is blocked"
```

```yaml [Traefik (Docker Labels)]
labels:
  - "traefik.enable=true"
  - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
  - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"
  - "traefik.http.middlewares.warden.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.0/24"
  - "traefik.http.middlewares.warden.plugin.routewarden.methods=GET"
  - "traefik.http.middlewares.warden.plugin.routewarden.response.mode=text"
  - "traefik.http.middlewares.warden.plugin.routewarden.response.statusCode=403"
  - "traefik.http.middlewares.warden.plugin.routewarden.response.body=403 Forbidden: Access to sensitive endpoint is blocked"
```

```caddyfile [Caddyfile Directive]
routewarden {
    allowed_ip 10.0.0.0/8
    allowed_ip 192.168.1.0/24
    methods GET
    response {
        mode text
        status 403
        body "403 Forbidden: Access to sensitive endpoint is blocked"
    }
}
```

```lua [NGINX / OpenResty (Lua Table)]
-- RouteWarden OpenResty configuration table
local routewarden_config = {
    enabled = true,
    enable_default_patterns = true,
    allowed_ips = {
        "10.0.0.0/8",
        "192.168.1.0/24",
    },
    methods = {
        "GET",
    },
    response = {
        mode = "text",
        status_code = 403,
        body = "403 Forbidden: Access to sensitive endpoint is blocked",
    },
}
```

:::

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

## Structure of `routewarden.json`

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

## 6. Offline CI/CD Validation (`validate`)

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

## 7. Passing Configuration via Docker & Docker Compose

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

## Versioning & Release Automation

The CLI repository maintains automated version synchronization across `version.json`, Go source files (`main.go`), installer scripts, and documentation via `scripts/update-version.sh`:

::: code-group

```bash [Update Script]
# Synchronize version across all files:
./scripts/update-version.sh v1.1.0
```

```bash [npm Script]
# Alternatively via npm:
npm run version:update v1.1.0
```

:::

For the full release workflow, see the [CLI Versioning Guide](https://github.com/routewarden/cli/blob/main/VERSIONING.md).

---

## Learn More

For complete reference on path evasion testing, CI/CD linting recipes, and IDE autocomplete setup, visit:
- 📖 [RouteWarden CLI Documentation](https://routewarden.github.io/cli/)
- 💻 [GitHub Repository (`routewarden/cli`)](https://github.com/routewarden/cli)


