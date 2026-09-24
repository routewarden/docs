<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Static Configuration: Plugin Declaration ──────────────────────────────
const inst_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static Configuration)
experimental:
  plugins:
    routewarden: # [!code ++]
      moduleName: github.com/routewarden/traefik-warden # [!code ++]
      version: {{version}} # [!code ++]`,
})

const inst_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static Configuration)
[experimental.plugins.routewarden] # [!code ++]
  moduleName = "github.com/routewarden/traefik-warden" # [!code ++]
  version = "{{version}}" # [!code ++]`,
})

const inst_cli = buildSnippet({
  lang: 'bash',
  code: `traefik \\
  --experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden \\ # [!code ++]
  --experimental.plugins.routewarden.version={{version}} # [!code ++]`,
})

const installationSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: inst_yaml.lang, code: inst_yaml.cleanCode, html: inst_yaml.html, hasDiff: inst_yaml.hasDiff },
    { filename: 'traefik.toml', lang: inst_toml.lang, code: inst_toml.cleanCode, html: inst_toml.html, hasDiff: inst_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: inst_cli.lang, code: inst_cli.cleanCode, html: inst_cli.html, hasDiff: inst_cli.hasDiff },
  ],
}))

// ─── Local Development (localPlugins) ──────────────────────────────────────────
const local_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Local Development)
experimental:
  localPlugins:
    routewarden: # [!code ++]
      moduleName: github.com/routewarden/traefik-warden # [!code ++]`,
})

const local_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Local Development)
[experimental.localPlugins.routewarden] # [!code ++]
  moduleName = "github.com/routewarden/traefik-warden" # [!code ++]`,
})

const local_cli = buildSnippet({
  lang: 'bash',
  code: `traefik --experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden`,
})

const localPluginsSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: local_yaml.lang, code: local_yaml.cleanCode, html: local_yaml.html, hasDiff: local_yaml.hasDiff },
    { filename: 'traefik.toml', lang: local_toml.lang, code: local_toml.cleanCode, html: local_toml.html, hasDiff: local_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: local_cli.lang, code: local_cli.cleanCode, html: local_cli.html, hasDiff: false },
  ],
}))

// ─── File Provider (Static Configuration to load dynamic files) ──────────────
const provider_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static Configuration)
providers:
  file:
    filename: "/etc/traefik/dynamic_conf.yml"
    watch: true`,
})

const provider_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static Configuration)
[providers.file]
  filename = "/etc/traefik/dynamic_conf.toml"
  watch = true`,
})

const provider_cli = buildSnippet({
  lang: 'bash',
  code: `traefik \\
  --providers.file.filename=/etc/traefik/dynamic_conf.yml \\
  --providers.file.watch=true`,
})

const fileProviderSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: provider_yaml.lang, code: provider_yaml.cleanCode, html: provider_yaml.html, hasDiff: false },
    { filename: 'traefik.toml', lang: provider_toml.lang, code: provider_toml.cleanCode, html: provider_toml.html, hasDiff: false },
    { filename: 'CLI / Docker', lang: provider_cli.lang, code: provider_cli.cleanCode, html: provider_cli.html, hasDiff: false },
  ],
}))

// ─── 2. Dynamic Configuration ──────────────────────────────────────────────────
const dyn_json = buildSnippet({
  lang: 'json',
  code: `{
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
    "body": "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Sensitive route protected by RouteWarden\\"}"
  }
}`,
})

const dyn_yaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml — Direct 1:1 mapping from routewarden.json
http:
  middlewares:
    route-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          enableDefaultAllowPatterns: true # [!code ++]
          checkQuery: false # [!code ++]
          checkHeaders: # [!code ++]
            - "X-Forwarded-Uri" # [!code ++]
            - "X-Rewrite-URL" # [!code ++]
          allowedIps: # [!code ++]
            - "127.0.0.1" # [!code ++]
            - "10.0.0.0/8" # [!code ++]
          methods: # [!code ++]
            - "GET" # [!code ++]
            - "POST" # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 403 # [!code ++]
            body: '{"error":"Forbidden","message":"Sensitive route protected by RouteWarden"}' # [!code ++]`,
})

const dyn_toml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml — TOML representation of routewarden.json
[http.middlewares.route-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  enableDefaultAllowPatterns = true # [!code ++]
  checkQuery = false # [!code ++]
  checkHeaders = ["X-Forwarded-Uri", "X-Rewrite-URL"] # [!code ++]
  allowedIps = ["127.0.0.1", "10.0.0.0/8"] # [!code ++]
  methods = ["GET", "POST"] # [!code ++]

[http.middlewares.route-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 403 # [!code ++]
  body = '{"error":"Forbidden","message":"Sensitive route protected by RouteWarden"}' # [!code ++]`,
})

const dyn_labels = buildSnippet({
  lang: 'docker',
  code: `# Docker Compose labels mapping from routewarden.json
services:
  traefik:
    image: traefik:v3.3
    labels:
      - "traefik.enable=true"
      # RouteWarden middleware definition
      - "traefik.http.middlewares.route-shield.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.enableDefaultAllowPatterns=true" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.checkQuery=false" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.checkHeaders=X-Forwarded-Uri,X-Rewrite-URL" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.allowedIps=127.0.0.1,10.0.0.0/8" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.methods=GET,POST" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.route-shield.plugin.routewarden.response.statusCode=403" # [!code ++]
      - 'traefik.http.middlewares.route-shield.plugin.routewarden.response.body={"error":"Forbidden","message":"Sensitive route protected by RouteWarden"}' # [!code ++]`,
})

const dynamicSnippets = computed(() => ({
  traefik: [
    { filename: 'routewarden.json', lang: dyn_json.lang, code: dyn_json.cleanCode, html: dyn_json.html, hasDiff: false },
    { filename: 'dynamic_conf.yml', lang: dyn_yaml.lang, code: dyn_yaml.cleanCode, html: dyn_yaml.html, hasDiff: dyn_yaml.hasDiff },
    { filename: 'dynamic_conf.toml', lang: dyn_toml.lang, code: dyn_toml.cleanCode, html: dyn_toml.html, hasDiff: dyn_toml.hasDiff },
    { filename: 'docker-compose.yml', lang: dyn_labels.lang, code: dyn_labels.cleanCode, html: dyn_labels.html, hasDiff: dyn_labels.hasDiff },
  ],
}))

// ─── Direct Generation & CI/CD Pipeline ───────────────────────────────────────
const gen_cli = buildSnippet({
  lang: 'bash',
  code: `# 1. Validate schema compliance, regex patterns, and CIDRs
rwarden validate --config routewarden.json

# 2. Compile directly into Traefik dynamic YAML
rwarden generate --target traefik-yaml --config routewarden.json > dynamic_conf.yml

# Or compile into Traefik dynamic TOML
rwarden generate --target traefik-toml --config routewarden.json > dynamic_conf.toml

# Or compile into Docker Compose labels format
rwarden generate --target traefik-labels --config routewarden.json`,
})

const gen_docker = buildSnippet({
  lang: 'bash',
  code: `# Validate and generate without local installation
docker run --rm -v $(pwd):/workspace -w /workspace \\
  ghcr.io/routewarden/cli:latest validate --config routewarden.json

docker run --rm -v $(pwd):/workspace -w /workspace \\
  ghcr.io/routewarden/cli:latest generate --target traefik-yaml --config routewarden.json > dynamic_conf.yml`,
})

const gen_github = buildSnippet({
  lang: 'yaml',
  code: `# .github/workflows/deploy.yml
name: Deploy Traefik Security Rules
on:
  push:
    paths:
      - 'routewarden.json'

jobs:
  build-traefik-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install RouteWarden CLI
        run: curl -sSfL https://routewarden.github.io/install.sh | sh

      - name: Validate & Generate Traefik Dynamic Config
        run: |
          rwarden validate --config routewarden.json
          rwarden generate --target traefik-yaml --config routewarden.json > dynamic_conf.yml

      - name: Deploy dynamic_conf.yml
        run: |
          # Copy dynamic_conf.yml to Traefik file provider directory
          scp dynamic_conf.yml user@traefik-host:/etc/traefik/dynamic_conf.yml`,
})

const pipelineSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: gen_cli.lang, code: gen_cli.cleanCode, html: gen_cli.html, hasDiff: false },
    { filename: 'Docker', lang: gen_docker.lang, code: gen_docker.cleanCode, html: gen_docker.html, hasDiff: false },
    { filename: 'GitHub Actions', lang: gen_github.lang, code: gen_github.cleanCode, html: gen_github.html, hasDiff: false },
  ],
}))

// ─── 3. Global EntryPoint Protection ──────────────────────────────────────────
const ep_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static Configuration: Attach to EntryPoints)
entryPoints:
  web:
    address: ":80"
    http:
      middlewares:
        - routewarden@file # [!code ++]
  websecure:
    address: ":443"
    http:
      middlewares:
        - routewarden@file # [!code ++]`,
})

const ep_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static Configuration: Attach to EntryPoints)
[entryPoints.web]
  address = ":80"
  [entryPoints.web.http]
    middlewares = ["routewarden@file"] # [!code ++]

[entryPoints.websecure]
  address = ":443"
  [entryPoints.websecure.http]
    middlewares = ["routewarden@file"] # [!code ++]`,
})

const ep_cli = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml (Global EntryPoint protection via CLI flags)
services:
  traefik:
    image: traefik:v3.3
    command:
      - "--providers.docker=true"
      - "--providers.file.filename=/etc/traefik/dynamic.yml"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=routewarden@file" # [!code ++]
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.websecure.http.middlewares=routewarden@file" # [!code ++]
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version={{version}}" # [!code ++]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./dynamic.yml:/etc/traefik/dynamic.yml:ro

  # Zero-touch security: webapp is shielded automatically on web & websecure!
  webapp:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`app.example.com\`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      # No individual middleware declaration needed on services!`,
})

const entrypointSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: ep_yaml.lang, code: ep_yaml.cleanCode, html: ep_yaml.html, hasDiff: ep_yaml.hasDiff },
    { filename: 'traefik.toml', lang: ep_toml.lang, code: ep_toml.cleanCode, html: ep_toml.html, hasDiff: ep_toml.hasDiff },
    { filename: 'docker-compose.yml', lang: ep_cli.lang, code: ep_cli.cleanCode, html: ep_cli.html, hasDiff: ep_cli.hasDiff },
  ],
}))
</script>

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

<CodeViewer :snippets="installationSnippets" />

> **Local Development (`localPlugins`)**:
> 
> When testing locally without pulling from GitHub or Traefik Pilot, register the plugin in `localPlugins`:
> 
> <CodeViewer :snippets="localPluginsSnippets" />

---

### 2. Dynamic Configuration

In Traefik, middlewares, routers, and services are defined in **dynamic configuration** (via file provider or Docker labels), whereas plugins are declared in **static configuration** (`traefik.yml` or CLI flags).

To load dynamic configuration files into Traefik, enable the file provider in your static configuration:

<CodeViewer :snippets="fileProviderSnippets" />

RouteWarden can be configured using **`routewarden.json`** as your universal security schema, or directly in Traefik dynamic file/label configurations.

#### How `routewarden.json` Maps to Dynamic Configuration

Because `routewarden.json` adheres to the official RouteWarden JSON Schema, every field in `routewarden.json` maps directly 1-to-1 to Traefik's `plugin.routewarden` middleware configuration keys:

<CodeViewer :snippets="dynamicSnippets" />

#### Using `routewarden.json` Directly via Generate Pipeline

If you maintain `routewarden.json` as your single source of truth across Git repositories or multi-gateway environments, use the [RouteWarden CLI (`rwarden`)](https://routewarden.github.io/cli/) to validate rules offline and compile directly into Traefik configurations during your deployment pipeline:

<CodeViewer :snippets="pipelineSnippets" />

---

### 3. Global Protection via EntryPoints (Protect All Services)

Instead of manually attaching `routewarden` to every individual router across dozens of microservices or containers, you can attach RouteWarden directly to Traefik's **entryPoints** (such as `web` on `:80` and `websecure` on `:443`).

When attached to an entryPoint, RouteWarden enforces security inspection **globally for all incoming requests** before any router or service is reached:

<CodeViewer :snippets="entrypointSnippets" />

#### Why Use EntryPoint Protection?
- **Zero-Touch Service Protection**: Every newly deployed service or container inherits path traversal and asset protection automatically without modifying developer `docker-compose.yml` or Kubernetes manifests.
- **Provider Syntax (`@file` vs `@docker`)**: When referencing middleware in static entryPoints, suffix the middleware name with the provider that defined it:
  - `routewarden@file`: Middleware defined in dynamic file configuration (`dynamic.yml` or `dynamic.toml`).
  - `routewarden@docker`: Middleware declared via Docker labels on the Traefik service itself.
- **Defense in Depth**: Even if an application router is misconfigured or a developer forgets security labels, the gateway blocks sensitive probing at the entryPoint edge.

> **Complete Global Shield Blueprint**:
>
> For full multi-container production recipes and docker-compose configurations, see [Example 2: Global EntryPoint Shield](/examples/docker-compose-global).

---

## Next Steps

- Explore [Response Modes](/core/response-modes) to customize block behaviors (HTML, JSON, Captcha, Gzip Bomb).
- Configure [Anti-Evasion Engine](/core/anti-evasion) for advanced normalization rules.
- Check out the [Production Case Studies](/examples/overview) for real-world setups.
- Use the [RouteWarden CLI (`rwarden`)](https://routewarden.github.io/cli/) for offline path testing and schema generation.
- Check the [Examples & Wiki Cookbook](/examples/overview) for production Docker Compose & Kubernetes blueprints.

