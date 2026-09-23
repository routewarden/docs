# RouteWarden for NGINX & OpenResty

**RouteWarden for NGINX** (`github.com/routewarden/nginx-warden`) is the official OpenResty / NGINX Lua security module. It runs directly inside NGINX worker memory during the `access_by_lua` evaluation phase, intercepting reconnaissance bots, path traversal attacks, and probes for sensitive files before requests reach upstream applications.

---

## Capabilities Overview

- **In-Memory Lua Engine**: High-performance request inspection running on LuaJIT without upstream proxy latency or external network roundtrips.
- **Automated Asset Shielding**: Blocks scanner attempts targeting `.env`, `.git`, `.aws`, `.ssh`, database dumps (`.sql`, `.tar.gz`, `.bak`), server status endpoints (`/actuator`, `phpinfo.php`), and package manager manifests.
- **Anti-Evasion Normalization**: Transparently strips semicolon matrix parameters (`/;param/.env`), resolves nested percent-encoding (`%252e%252e`), converts Windows backslashes (`\`), and strips null bytes (`%00`).
- **Flexible Network Filtering**: Whitelists trusted CIDR subnets (`10.0.0.0/8`) and client IPs (`127.0.0.1`, `::1`) with native support for `X-Forwarded-For` and `X-Real-IP`.
- **Active Defense Modes**: Respond with custom JSON errors, branded HTML pages, interactive Turnstile/hCaptcha challenges, silent drops, or bot-neutralizing gzip decompression bombs.
- **Query Parameter Inspection**: Optional deep inspection of URI query strings for sensitive file targets.
- **CrowdSec-Compatible Logging**: Outputs structured JSON security events on stdout for SIEM threat monitoring and 1-strike firewall bans.

---

## Quick Navigation

| Guide | Description |
|---|---|
| [**Getting Started**](/nginx/getting-started) | Docker setup, OpenResty installation, and lua-nginx-module configuration. |
| [**Configuration Reference**](/nginx/configuration) | Directives, options, and response configurations for `nginx.conf`. |
| [**Recipes & Blueprints**](/nginx/examples) | Real-world NGINX configurations for API cloaking, honeypots, and allowlists. |

---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Installation & Setup Snippets ───────────────────────────────────────────
const install_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro # [!code ++]
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro`,
})

const install_docker_run = buildSnippet({
  lang: 'bash',
  code: `# Run with local Lua module mounted:
docker run -d -p 80:80 \\
  -v ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro \\ # [!code ++]
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro \\
  openresty/openresty:alpine`,
})

const install_dockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `FROM openresty/openresty:alpine

# Copy RouteWarden into OpenResty Lua search path
COPY lib/resty/routewarden /usr/local/openresty/site/lualib/resty/routewarden # [!code ++]
COPY nginx.conf /etc/nginx/conf.d/default.conf`,
})

const installSnippets = computed(() => ({
  nginx: [
    { filename: 'Docker Compose', lang: 'yaml', code: install_compose.cleanCode, html: install_compose.html, hasDiff: install_compose.hasDiff },
    { filename: 'Docker (OpenResty)', lang: 'bash', code: install_docker_run.cleanCode, html: install_docker_run.html, hasDiff: install_docker_run.hasDiff },
    { filename: 'Dockerfile', lang: 'dockerfile', code: install_dockerfile.cleanCode, html: install_dockerfile.html, hasDiff: install_dockerfile.hasDiff },
  ],
}))

// ─── 30-Second Quick Start Snippets ──────────────────────────────────────────
const quick_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            enabled = true,
            enable_default_patterns = true,
            path_patterns = {
                "(?i)^/admin(/.*)?$",
                "(?i)^/api/internal(/.*)?$"
            },
            allowed_ips = {
                "10.0.0.0/8",
                "192.168.1.100"
            }
        })
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://backend_upstream;
        }
    }
}`,
})

const quickStartSnippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: quick_nginx.cleanCode, html: quick_nginx.html, hasDiff: false },
  ],
}))
</script>

## Installation & Setup

Deploy the RouteWarden Lua module into OpenResty or NGINX with `lua-nginx-module`:

<CodeViewer :snippets="installSnippets" />

---

## 30-Second Quick Start

Initialize RouteWarden in `nginx.conf` and protect your location blocks:

<CodeViewer :snippets="quickStartSnippets" />

