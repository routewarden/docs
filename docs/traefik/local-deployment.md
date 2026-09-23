---
title: Local Development & Deployment
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Directory Tree ────────────────────────────────────────────────────────
const dirTree = buildSnippet({
  lang: 'plaintext',
  code: `plugins-local/
└── src/
    └── github.com/
        └── routewarden/
            └── traefik-warden/
                ├── .traefik.yml
                ├── config.go
                ├── ip_filter.go
                ├── path_normalizer.go
                ├── response_handler.go
                └── routewarden.go`,
})

const dirSnippets = computed(() => ({
  traefik: [
    { filename: 'Directory Structure', lang: 'plaintext', code: dirTree.cleanCode, html: dirTree.html, hasDiff: false },
  ],
}))

// ─── 2. Configuration Preview ─────────────────────────────────────────────────
const cfg_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static)
experimental: # [!code ++]
  localPlugins: # [!code ++]
    routewarden: # [!code ++]
      moduleName: github.com/routewarden/traefik-warden # [!code ++]

# dynamic_conf.yml (Dynamic Middleware & Router)
http:
  middlewares:
    local-warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","environment":"local-dev"}'

  routers:
    app-router:
      rule: "Host(\`localhost\`)"
      entryPoints:
        - web
      middlewares:
        - local-warden
      service: app-service`,
})

const cfg_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static)
[experimental.localPlugins.routewarden] # [!code ++]
  moduleName = "github.com/routewarden/traefik-warden" # [!code ++]

# dynamic_conf.toml (Dynamic Middleware & Router)
[http.routers.app-router]
  rule = "Host(\`localhost\`)"
  entryPoints = ["web"]
  middlewares = ["local-warden"]
  service = "app-service"

[http.middlewares.local-warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.middlewares.local-warden.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","environment":"local-dev"}'`,
})

const cfg_cli = buildSnippet({
  lang: 'bash',
  code: `# Traefik CLI flags
traefik \\
  --api.insecure=true \\
  --providers.docker=true \\
  --entrypoints.web.address=:80 \\
  --experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden \\ # [!code ++]
  --log.level=DEBUG`,
})

const configPreviewSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: cfg_yaml.cleanCode, html: cfg_yaml.html, hasDiff: cfg_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: cfg_toml.cleanCode, html: cfg_toml.html, hasDiff: cfg_toml.hasDiff },
    { filename: 'CLI Flags', lang: 'bash', code: cfg_cli.cleanCode, html: cfg_cli.html, hasDiff: cfg_cli.hasDiff },
  ],
}))

// ─── 3. Local Docker Compose Setup ────────────────────────────────────────────
const compose_setup = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.1
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      
      # Declare RouteWarden as a LOCAL plugin:
      - "--experimental.localPlugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      
      # Log level debug helps verify plugin loading
      - "--log.level=DEBUG"
    ports:
      - "80:80"
      - "8080:8080" # Traefik Web UI & Middleware Explorer
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      # Mount your local repository directory into Traefik's plugins-local path:
      - ".:/plugins-local/src/github.com/routewarden/traefik-warden:ro" # [!code ++]

  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(\`localhost\`)"
      - "traefik.http.routers.webapp.entrypoints=web"
      - "traefik.http.routers.webapp.middlewares=local-warden"

      # Middleware configuration
      - "traefik.http.middlewares.local-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.local-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.local-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.local-warden.plugin.routewarden.response.statusCode=403" # [!code ++]
      - 'traefik.http.middlewares.local-warden.plugin.routewarden.response.body={"error":"Forbidden","environment":"local-dev"}' # [!code ++]`,
})

const composeSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: compose_setup.cleanCode, html: compose_setup.html, hasDiff: compose_setup.hasDiff },
  ],
}))

// ─── 4. Walkthrough Commands & Verification ───────────────────────────────────
const walk_start = buildSnippet({
  lang: 'bash',
  code: `docker compose up`,
})

const walk_startSnippets = computed(() => ({
  traefik: [
    { filename: 'Terminal', lang: 'bash', code: walk_start.cleanCode, html: walk_start.html, hasDiff: false },
  ],
}))

const walk_logs = buildSnippet({
  lang: 'plaintext',
  code: `level=info msg="Loading plugin: routewarden with module: github.com/routewarden/traefik-warden"
level=info msg="Plugin routewarden loaded successfully"`,
})

const walk_logsSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.log', lang: 'plaintext', code: walk_logs.cleanCode, html: walk_logs.html, hasDiff: false },
  ],
}))

const walk_test_normal = buildSnippet({
  lang: 'bash',
  code: `curl -I http://localhost/
# HTTP/1.1 200 OK`,
})

const walk_test_sensitive = buildSnippet({
  lang: 'bash',
  code: `curl -i http://localhost/.env
# HTTP/1.1 403 Forbidden
# {"error":"Forbidden","environment":"local-dev"}`,
})

const walk_test_evasion = buildSnippet({
  lang: 'bash',
  code: `curl -i "http://localhost/%2eenv"
# HTTP/1.1 403 Forbidden`,
})

const walk_testSnippets = computed(() => ({
  traefik: [
    { filename: 'Normal Request', lang: 'bash', code: walk_test_normal.cleanCode, html: walk_test_normal.html, hasDiff: false },
    { filename: 'Sensitive Route (.env)', lang: 'bash', code: walk_test_sensitive.cleanCode, html: walk_test_sensitive.html, hasDiff: false },
    { filename: 'URL-Encoded Evasion', lang: 'bash', code: walk_test_evasion.cleanCode, html: walk_test_evasion.html, hasDiff: false },
  ],
}))

const walk_restart = buildSnippet({
  lang: 'bash',
  code: `docker compose restart traefik`,
})

const walk_restartSnippets = computed(() => ({
  traefik: [
    { filename: 'Terminal', lang: 'bash', code: walk_restart.cleanCode, html: walk_restart.html, hasDiff: false },
  ],
}))
</script>

# Local Development & Deployment

This guide explains how to develop, test, and run RouteWarden locally as a Traefik plugin without publishing to GitHub or the Traefik Plugin Catalog.

---

## 1. How Traefik Local Plugins Work

Traefik allows loading plugins directly from a local directory on your filesystem using the `experimental.localPlugins` configuration key.

When using `localPlugins`, Traefik requires the source code to be mounted in a specific directory structure matching Go's module namespace:

<CodeViewer :snippets="dirSnippets" />

---

## 2. Local Traefik Configuration Preview

<CodeViewer :snippets="configPreviewSnippets" />

---

## 3. Local Docker Compose Setup

Here is a complete, ready-to-run `docker-compose.yml` for developing and testing RouteWarden locally:

<CodeViewer :snippets="composeSnippets" />

---

## 4. Step-by-Step Local Walkthrough

### Step 1: Start the Cluster
From the root of the RouteWarden repository:

<CodeViewer :snippets="walk_startSnippets" />

### Step 2: Verify Plugin Initialization
Watch the Traefik startup logs. You should see Traefik's Yaegi interpreter successfully compiling the local plugin:

<CodeViewer :snippets="walk_logsSnippets" />

### Step 3: Inspect via Traefik Dashboard
Open your browser to: `http://localhost:8080/dashboard/#/http/middlewares`

You will see `local-warden@docker` listed with its active configuration.

### Step 4: Test Blocking Live

<CodeViewer :snippets="walk_testSnippets" />

### Step 5: Live Code Iteration
Because the repository root is mounted with `- .:/plugins-local/src/github.com/routewarden/traefik-warden:ro`, whenever you modify Go code, simply restart Traefik to recompile:

<CodeViewer :snippets="walk_restartSnippets" />

*(No Docker rebuild or external plugin download required!)*
