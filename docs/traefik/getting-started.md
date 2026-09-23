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
  routers:
    app-router:
      rule: "Host(\`app.example.com\`)"
      entryPoints:
        - web
      middlewares:
        - route-shield # [!code ++]
      service: app-service

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
[http.routers.app-router]
  rule = "Host(\`app.example.com\`)"
  entryPoints = ["web"]
  middlewares = ["route-shield"] # [!code ++]
  service = "app-service"

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
  code: `# Docker Compose labels representation of routewarden.json
services:
  app:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`app.example.com\`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.routers.app.middlewares=route-shield" # [!code ++]
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
    { filename: 'traefik.yaml', lang: dyn_yaml.lang, code: dyn_yaml.cleanCode, html: dyn_yaml.html, hasDiff: dyn_yaml.hasDiff },
    { filename: 'traefik.toml', lang: dyn_toml.lang, code: dyn_toml.cleanCode, html: dyn_toml.html, hasDiff: dyn_toml.hasDiff },
    { filename: 'docker-compose.yml', lang: dyn_labels.lang, code: dyn_labels.cleanCode, html: dyn_labels.html, hasDiff: dyn_labels.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: dyn_json.lang, code: dyn_json.cleanCode, html: dyn_json.html, hasDiff: false },
  ],
}))

// ─── Offline Validation Snippets ──────────────────────────────────────────────
const val_cli = buildSnippet({
  lang: 'bash',
  code: `# Validate schema compliance, regex patterns, and CIDRs
rwarden validate --config routewarden.json`,
})

const val_docker = buildSnippet({
  lang: 'bash',
  code: `# Mount configuration file and validate via container
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json \\
  ghcr.io/routewarden/cli:latest validate --config /routewarden.json`,
})

const validationSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: val_cli.lang, code: val_cli.cleanCode, html: val_cli.html, hasDiff: false },
    { filename: 'Docker', lang: val_docker.lang, code: val_docker.cleanCode, html: val_docker.html, hasDiff: false },
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

RouteWarden can be configured using **`routewarden.json`** as your universal security schema, or directly in Traefik dynamic file/label configurations. 

#### How `routewarden.json` Works with Traefik

Because `routewarden.json` adheres to the official RouteWarden JSON Schema, every field in `routewarden.json` maps directly 1-to-1 to Traefik's `plugin.routewarden` configuration keys. You maintain security rules in a single `routewarden.json` file with IDE schema validation, and deploy the corresponding keys into your Traefik router middleware:

<CodeViewer :snippets="dynamicSnippets" />

> **Offline CI/CD Validation with `rwarden`**:
> 
> Validate your `routewarden.json` schema before deploying to Traefik using the [RouteWarden CLI (`rwarden`)](https://routewarden.github.io/cli/):
> 
> <CodeViewer :snippets="validationSnippets" />

---

## Next Steps

- Explore [Response Modes](/core/response-modes) to customize block behaviors (HTML, JSON, Captcha, Gzip Bomb).
- Configure [Anti-Evasion Engine](/core/anti-evasion) for advanced normalization rules.
- Check out the [Production Case Studies](/examples/overview) for real-world setups.
- Use the [RouteWarden CLI (`rwarden`)](https://routewarden.github.io/cli/) for offline path testing and schema generation.
- Check the [Examples & Wiki Cookbook](/examples/overview) for production Docker Compose & Kubernetes blueprints.
