import fs from 'node:fs'
import path from 'node:path'
import { createMarkdownRenderer } from 'vitepress'

export async function generateSetupSnippets(options = {}) {
  // Determine the docs directory (where package.json and scripts/ live)
  let docsPackageDir = options.rootDir || process.cwd()
  if (path.basename(docsPackageDir) !== 'docs' && fs.existsSync(path.join(docsPackageDir, 'docs/package.json'))) {
    docsPackageDir = path.join(docsPackageDir, 'docs')
  }

  const versionFilePath = path.join(docsPackageDir, 'docs/version.json')
  let currentVersion = 'v1.1.0'
  if (fs.existsSync(versionFilePath)) {
    const vData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))
    currentVersion = vData.version.startsWith('v') ? vData.version : `v${vData.version}`
  }

  const docsDir = path.join(docsPackageDir, 'docs')
  const md = await createMarkdownRenderer(docsDir)

  // Helper: render code with diff-add highlights on specific lines.
  // Uses the Shiki line-range meta `{1,2,5}` which produces class="line highlighted"
  // then we rename to class="line diff add" and add has-diff to the pre.
  function renderSnippet(code, lang, diffLines) {
    const hasDiff = diffLines && diffLines.length > 0
    const meta = hasDiff ? `{${diffLines.join(',')}}` : ''
    let html = md.options.highlight(code, lang, meta)
    if (hasDiff) {
      html = html.replace(/class="line highlighted"/g, 'class="line diff add"')
      html = html.replace('<pre class="', '<pre class="has-diff ')
    }
    return html
  }

  const setupSnippets = {
    traefik: [
      {
        filename: 'docker-compose.yml',
        lang: 'yaml',
        // Lines 5,6 = routewarden plugin args; 9 = global entrypoint middleware; 17,18 = routewarden middleware definition
        diffLines: [5, 6, 9, 17, 18],
        code: `services:
  traefik:
    image: traefik:v3.3
    command:
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version=${currentVersion}"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=warden@docker"
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      - "traefik.enable=true"
      # Global EntryPoint Shield: protects ALL services automatically
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"

  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=PathPrefix(\`/\`)"
      - "traefik.http.routers.app.entrypoints=web"`
      },
      {
        filename: 'traefik.yaml',
        lang: 'yaml',
        // Line 6 = - warden@file; Lines 10-12 = plugin definition; Lines 16-20 = dynamic middleware block
        diffLines: [6, 10, 11, 12, 16, 17, 18, 19, 20],
        code: `entryPoints:
  web:
    address: ":80"
    http:
      middlewares:
        - warden@file

experimental:
  plugins:
    routewarden:
      moduleName: github.com/routewarden/traefik-warden
      version: ${currentVersion}

# Dynamic Configuration:
http:
  middlewares:
    warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true`
      },
      {
        filename: 'traefik.toml',
        lang: 'toml',
        // Line 4 = middlewares; Lines 6-8 = plugin definition; Lines 12-13 = dynamic middleware block
        diffLines: [4, 6, 7, 8, 12, 13],
        code: `[entryPoints.web]
  address = ":80"
  [entryPoints.web.http]
    middlewares = ["warden@file"]

[experimental.plugins.routewarden]
  moduleName = "github.com/routewarden/traefik-warden"
  version = "${currentVersion}"

# Dynamic Configuration:
[http.middlewares.warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true`
      }
    ],
    caddy: [
      {
        filename: 'docker-compose.yml',
        lang: 'yaml',
        // Line 7 = xcaddy build with routewarden plugin
        diffLines: [7],
        code: `services:
  caddy:
    build:
      context: .
      dockerfile_inline: |
        FROM caddy:2-builder AS builder
        RUN xcaddy build --with github.com/routewarden/caddy-warden@${currentVersion}
        FROM caddy:2-alpine
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:`
      },
      {
        filename: 'Caddyfile',
        lang: 'caddy',
        // Lines 2 = order directive; 6,7,8 = route_warden block
        diffLines: [2, 6, 7, 8],
        code: `{
    order route_warden before reverse_proxy
}

:80 {
    route_warden {
        enable_default_patterns true
    }
    respond "OK" 200
}`
      }
    ],
    nginx: [
      {
        filename: 'docker-compose.yml',
        lang: 'yaml',
        // Line 8 = routewarden lua volume mount
        diffLines: [8],
        code: `services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro`
      },
      {
        filename: 'nginx.conf',
        lang: 'nginx',
        // Lines 1-7 = init_by_lua_block (routewarden init); line 14 = warden:check()
        diffLines: [1, 2, 3, 4, 5, 6, 7, 14],
        code: `init_by_lua_block {
    local routewarden = require("resty.routewarden")
    warden = routewarden.new({
        enabled = true,
        enable_default_patterns = true
    })
}

server {
    listen 80;
    server_name example.com;

    access_by_lua_block {
        warden:check()
    }

    location / {
        proxy_pass http://localhost:8080;
    }
}`
      }
    ],
    cli: [
      {
        filename: 'terminal',
        lang: 'bash',
        diffLines: [],
        code: `# 1. Install rwarden CLI (macOS / Linux)
curl -fsSL https://routewarden.github.io/cli/install.sh | bash

# 2. Validate configuration rules offline
rwarden validate --config routewarden.json

# 3. Test a probing attack path against your rules
rwarden test --path "/%252e%252e/.env"`
      },
      {
        filename: 'generate',
        lang: 'bash',
        diffLines: [],
        code: `# Generate native gateway configurations from routewarden.json:

# 1. Traefik Dynamic YAML
rwarden generate --target traefik-yaml --config routewarden.json > dynamic.yml

# 2. Traefik Dynamic TOML
rwarden generate --target traefik-toml --config routewarden.json > dynamic.toml

# 3. Traefik Docker Compose Labels
rwarden generate --target traefik-labels --config routewarden.json

# 4. Caddy Caddyfile Directive
rwarden generate --target caddy --config routewarden.json > Caddyfile

# 5. NGINX / OpenResty Lua init block
rwarden generate --target nginx --config routewarden.json`
      },
      {
        filename: 'routewarden.json',
        lang: 'json',
        diffLines: [],
        code: `{
  "$schema": "https://routewarden.github.io/cli/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "enableDefaultAllowPatterns": true,
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Access Denied by RouteWarden\\"}"
  }
}`
      }
    ]
  }

  const result = {}
  for (const [gw, files] of Object.entries(setupSnippets)) {
    result[gw] = files.map(f => {
      const hasDiff = Boolean(f.diffLines && f.diffLines.length > 0)
      const html = renderSnippet(f.code, f.lang, f.diffLines)
      return {
        filename: f.filename,
        lang: f.lang,
        code: f.code,
        html,
        hasDiff
      }
    })
  }

  const targetPath = path.join(docsPackageDir, 'docs/.vitepress/theme/components/setup-snippets.json')
  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2) + '\n', 'utf8')
  return targetPath
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const target = await generateSetupSnippets()
  console.log(`✨ Generated highlighted snippets in: ${target}`)
}
