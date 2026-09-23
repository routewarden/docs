import fs from 'node:fs'
import path from 'node:path'
import { createMarkdownRenderer } from 'vitepress'

export async function generateSetupSnippets(options = {}) {
  const rootDir = options.rootDir || process.cwd()
  const versionFilePath = path.join(rootDir, 'docs/version.json')
  let currentVersion = 'v1.1.0'
  if (fs.existsSync(versionFilePath)) {
    const vData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))
    currentVersion = vData.version.startsWith('v') ? vData.version : `v${vData.version}`
  }

  const md = await createMarkdownRenderer(path.join(rootDir, 'docs'))

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
        // Lines 5,6 = routewarden plugin args; 21,22 = routewarden middleware labels
        diffLines: [5, 6, 21, 22],
        code: `services:
  traefik:
    image: traefik:v3.3
    command:
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version=${currentVersion}"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=PathPrefix(\`/\`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.routers.app.middlewares=warden"
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true"`
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
        lang: 'nginx',
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
      const html = renderSnippet(f.code, f.lang, f.diffLines)
      return {
        filename: f.filename,
        lang: f.lang,
        code: f.code,
        html
      }
    })
  }

  const targetPath = path.join(rootDir, 'docs/.vitepress/theme/components/setup-snippets.json')
  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2) + '\n', 'utf8')
  return targetPath
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const target = await generateSetupSnippets()
  console.log(`✨ Generated highlighted snippets in: ${target}`)
}
