# JSON Schema & Production CI/CD

RouteWarden publishes formal JSON Schemas for HTTP gateways and Layer 4 security configurations. Using schemas unlocks real-time IDE validation, inline autocomplete, and automated CI/CD policy linting.

---

## Official JSON Schemas

The official schemas are hosted on the documentation site:

- **HTTP Middleware (Traefik, Caddy, NGINX)**:
  ```text
  https://routewarden.github.io/schema.json
  ```
  *(Also mirrored at `https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json`)*

- **Layer 4 TCP Security Proxy (TCP Warden)**:
  ```text
  https://routewarden.github.io/tcp-warden.schema.json
  ```

---

## 1. Visual Studio Code Setup

Add schema mappings to your workspace `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": [
        "routewarden*.json",
        "*traefik*.json",
        "caddy*.json"
      ],
      "url": "https://routewarden.github.io/schema.json"
    }
  ],
  "yaml.schemas": {
    "https://routewarden.github.io/schema.json": [
      "routewarden*.yml",
      "routewarden*.yaml",
      "dynamic_conf.yml",
      "traefik-dynamic*.yml"
    ],
    "https://routewarden.github.io/tcp-warden.schema.json": [
      "tcp-warden*.yml",
      "tcp-warden*.yaml"
    ]
  }
}
```

::: tip YAML Language Server
Ensure the official Red Hat YAML extension (`redhat.vscode-yaml`) is installed in VS Code for YAML file validation and autocomplete.
:::

---

## 2. JetBrains IDEs (IntelliJ, GoLand, WebStorm)

1. Open **Settings / Preferences** (`⌘,` on macOS or `Ctrl+Alt+S` on Linux/Windows).
2. Navigate to **Languages & Frameworks** → **Schemas and DTDs** → **JSON Schema Mappings**.
3. Configure mappings:
   - **RouteWarden HTTP**: `https://routewarden.github.io/schema.json` mapped to `routewarden*.json`, `routewarden*.yml`, `dynamic_conf.yml`, `caddy*.json`.
   - **TCP Warden**: `https://routewarden.github.io/tcp-warden.schema.json` mapped to `tcp-warden*.yaml`.

---

## 3. Gateway Configuration Examples

### Traefik Dynamic YAML Configuration

Use a top-of-file modeline comment to bind the schema directly without global IDE settings:

```yaml
# yaml-language-server: $schema=https://routewarden.github.io/schema.json
enabled: true
enableDefaultPatterns: true
checkQuery: true
checkHeaders:
  - X-Forwarded-Uri
  - X-Rewrite-URL
methods:
  - GET
  - POST
response:
  mode: json
  statusCode: 403
  body: '{"error":"Forbidden: Sensitive access blocked"}'
```

### Caddy JSON Configuration

When configuring Caddy via the REST API or JSON files, map the `route_warden` handler directly:

```json
{
  "$schema": "https://routewarden.github.io/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "checkQuery": false,
  "checkHeaders": ["X-Forwarded-Uri"],
  "methods": ["GET", "HEAD"],
  "response": {
    "mode": "json",
    "statusCode": 403
  }
}
```

---

## Using `routewarden.json` in Production

`routewarden.json` is a **universal, gateway-agnostic security configuration file**. It lets you decouple your security posture from web server configurations, allowing security and DevOps teams to maintain rules centrally.

### Workflow Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                   routewarden.json                       │
│  - Built with schema autocomplete ($schema)              │
│  - Tested & validated via rwarden in CI/CD               │
└────────────────────────────┬─────────────────────────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ NGINX / Lua  │      │   Traefik    │      │    Caddy     │
│ JSON Loader  │      │ File Provider│      │   REST API   │
└──────────────┘      └──────────────┘      └──────────────┘
```

---

### Automated CI/CD Pipeline Linting

Before pushing updates to production, use `rwarden` in CI/CD to validate your security rules:

::: code-group

```bash [CLI]
# Offline syntax, regex, and CIDR validation
rwarden validate --config routewarden.json

# Simulate request evaluation against the rules
rwarden test --path "/.env"
rwarden test --path "/dashboard" --header "X-Forwarded-Uri:/.env"
```

```bash [Docker]
# Offline syntax, regex, and CIDR validation via container
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Simulate request evaluation against the rules
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"
docker run --rm ghcr.io/routewarden/cli:latest test --path "/dashboard" --header "X-Forwarded-Uri:/.env"
```

:::

#### GitHub Actions Workflow (`.github/workflows/verify-rules.yml`)

::: code-group

```yaml [Docker Container (Zero Setup)]
name: Verify Security Rules

on:
  pull_request:
    paths:
      - 'routewarden.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Configuration via Docker
        run: docker run --rm -v ${{ github.workspace }}/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json
```

```yaml [Go Tool / Binary]
name: Verify Security Rules

on:
  pull_request:
    paths:
      - 'routewarden.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.25'
      - name: Install RouteWarden CLI
        run: go install github.com/routewarden/cli@latest
      - name: Validate Configuration
        run: rwarden validate --config routewarden.json
```

:::

---

### Dynamic NGINX / OpenResty Ingestion

Instead of hardcoding rules in `nginx.conf`, mount `routewarden.json` into your container and load it dynamically during worker startup:

```nginx
http {
    init_by_lua_block {
        local cjson = require("cjson")
        local routewarden = require("resty.routewarden")

        local f, err = io.open("/etc/nginx/routewarden.json", "r")
        if not f then
            ngx.log(ngx.ERR, "failed to read routewarden.json: ", err)
            return
        end
        local content = f:read("*all")
        f:close()

        local config = cjson.decode(content)
        warden = routewarden.new(config)
    }

    server {
        listen 80;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://backend_upstream;
        }
    }
}
```

To update rules without restarting NGINX, simply modify `routewarden.json` and reload:
```bash
nginx -s reload
```
