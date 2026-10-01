---
title: JSON Schema & Production CI/CD — RouteWarden CLI
description: Formal JSON Schema definitions and automated CI/CD policy validation pipelines for RouteWarden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Official Schema URLs ────────────────────────────────────────────────
const http_schema_url = buildSnippet({
  lang: 'plaintext',
  code: `https://routewarden.github.io/schema.json`,
})

const httpSchemaSnippets = computed(() => ({
  cli: [
    { filename: 'HTTP Gateway Schema', lang: 'plaintext', code: http_schema_url.cleanCode, html: http_schema_url.html, hasDiff: false },
  ],
}))

const tcp_schema_url = buildSnippet({
  lang: 'plaintext',
  code: `https://routewarden.github.io/tcp-warden.schema.json`,
})

const tcpSchemaSnippets = computed(() => ({
  cli: [
    { filename: 'TCP Warden Schema', lang: 'plaintext', code: tcp_schema_url.cleanCode, html: tcp_schema_url.html, hasDiff: false },
  ],
}))

// ─── 2. VS Code Settings ────────────────────────────────────────────────────
const vscode_settings = buildSnippet({
  lang: 'json',
  code: `{
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
}`,
})

const vscodeSnippets = computed(() => ({
  cli: [
    { filename: '.vscode/settings.json', lang: 'json', code: vscode_settings.cleanCode, html: vscode_settings.html, hasDiff: false },
  ],
}))

// ─── 3. Gateway Configuration Examples ──────────────────────────────────────
const traefik_yaml = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/schema.json
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
  body: '{"error":"Forbidden: Sensitive access blocked"}'`,
})

const traefikYamlSnippets = computed(() => ({
  cli: [
    { filename: 'dynamic_conf.yml', lang: 'yaml', code: traefik_yaml.cleanCode, html: traefik_yaml.html, hasDiff: false },
  ],
}))

const caddy_json = buildSnippet({
  lang: 'json',
  code: `{
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
}`,
})

const caddyJsonSnippets = computed(() => ({
  cli: [
    { filename: 'caddy.json', lang: 'json', code: caddy_json.cleanCode, html: caddy_json.html, hasDiff: false },
  ],
}))

// ─── 4. CI/CD Validation Commands ───────────────────────────────────────────
const cicd_cli = buildSnippet({
  lang: 'bash',
  code: `# Offline syntax, regex, and CIDR validation
rwarden validate --config routewarden.json

# Simulate request evaluation against the rules
rwarden test --path "/.env"
rwarden test --path "/dashboard" --header "X-Forwarded-Uri:/.env"`,
})

const cicd_docker = buildSnippet({
  lang: 'bash',
  code: `# Offline syntax, regex, and CIDR validation via container
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Simulate request evaluation against the rules
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"
docker run --rm ghcr.io/routewarden/cli:latest test --path "/dashboard" --header "X-Forwarded-Uri:/.env"`,
})

const cicdLintSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: cicd_cli.cleanCode, html: cicd_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: cicd_docker.cleanCode, html: cicd_docker.html, hasDiff: false },
  ],
}))

// ─── 5. GitHub Actions Workflow ─────────────────────────────────────────────
const github_docker = buildSnippet({
  lang: 'yaml',
  code: `name: Verify Security Rules

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
        run: docker run --rm -v \${{ github.workspace }}/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json`,
})

const github_binary = buildSnippet({
  lang: 'yaml',
  code: `name: Verify Security Rules

on:
  pull_request:
    paths:
      - 'routewarden.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.25'
      - name: Install RouteWarden CLI
        run: go install github.com/routewarden/cli@latest
      - name: Validate Configuration
        run: rwarden validate --config routewarden.json`,
})

const githubActionsSnippets = computed(() => ({
  cli: [
    { filename: 'Docker Container (Zero Setup)', lang: 'yaml', code: github_docker.cleanCode, html: github_docker.html, hasDiff: false },
    { filename: 'Go Tool / Binary', lang: 'yaml', code: github_binary.cleanCode, html: github_binary.html, hasDiff: false },
  ],
}))

// ─── 6. NGINX Dynamic Ingestion ─────────────────────────────────────────────
const nginx_conf = buildSnippet({
  lang: 'nginx',
  code: `http {
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
}`,
})

const nginxSnippets = computed(() => ({
  cli: [
    { filename: 'nginx.conf', lang: 'nginx', code: nginx_conf.cleanCode, html: nginx_conf.html, hasDiff: false },
  ],
}))

const nginx_reload = buildSnippet({
  lang: 'bash',
  code: `nginx -s reload`,
})

const nginxReloadSnippets = computed(() => ({
  cli: [
    { filename: 'Terminal', lang: 'bash', code: nginx_reload.cleanCode, html: nginx_reload.html, hasDiff: false },
  ],
}))
</script>

# JSON Schema & Production CI/CD

RouteWarden publishes formal JSON Schemas for HTTP gateways and Layer 4 security configurations. Using schemas unlocks real-time IDE validation, inline autocomplete, and automated CI/CD policy linting.

---

## Official JSON Schemas

The official schemas are hosted on the documentation site:

- **HTTP Middleware (Traefik, Caddy, NGINX)**:
  <CodeViewer :snippets="httpSchemaSnippets" />
  *(Also mirrored at `https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json`)*

- **Layer 4 TCP Security Proxy (TCP Warden)**:
  <CodeViewer :snippets="tcpSchemaSnippets" />

---

## 1. Visual Studio Code Setup

Add schema mappings to your workspace `.vscode/settings.json`:

<CodeViewer :snippets="vscodeSnippets" />

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

<CodeViewer :snippets="traefikYamlSnippets" />

### Caddy JSON Configuration

When configuring Caddy via the REST API or JSON files, map the `route_warden` handler directly:

<CodeViewer :snippets="caddyJsonSnippets" />

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

<CodeViewer :snippets="cicdLintSnippets" />

#### GitHub Actions Workflow (`.github/workflows/verify-rules.yml`)

<CodeViewer :snippets="githubActionsSnippets" />

---

### Dynamic NGINX / OpenResty Ingestion

Instead of hardcoding rules in `nginx.conf`, mount `routewarden.json` into your container and load it dynamically during worker startup:

<CodeViewer :snippets="nginxSnippets" />

To update rules without restarting NGINX, simply modify `routewarden.json` and reload:

<CodeViewer :snippets="nginxReloadSnippets" />
