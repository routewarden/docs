---
title: Case Study – Dual-Router Security for Immich
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Traefik files ───────────────────────────────────────────────────────────

const traefikYaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    # RouteWarden shield applied ONLY to the public-facing router
    immich-public-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # Blocks .env, .git, config dumps # [!code ++]
          pathPatterns: # [!code ++]
            - '(?i)^/api/auth/login.*$' # [!code ++]
            - '(?i)^/api/auth/admin-sign-up.*$' # [!code ++]
            - '(?i)^/api/users.*$' # [!code ++]
            - '(?i)^/api/admin.*$' # [!code ++]
            - '(?i)^/api/server-info/stats.*$' # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

  routers:
    # 1. PUBLIC ROUTER: Accessible over the web for public photo/album sharing
    immich-public:
      rule: "Host(\`photos.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - immich-public-shield # [!code ++]
      service: immich-service

    # 2. PRIVATE ROUTER: Accessible only via internal VPN / Tailscale / LAN
    immich-private:
      rule: "Host(\`photos-internal.example.com\`)"
      entryPoints:
        - internal
      # No RouteWarden restriction: full admin and login functionality available
      service: immich-service

  services:
    immich-service:
      loadBalancer:
        servers:
          - url: "http://immich-server:2283"`,
})

const traefikToml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.routers.immich-public]
  rule = "Host(\`photos.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["immich-public-shield"] # [!code ++]
  service = "immich-service"

[http.routers.immich-private]
  rule = "Host(\`photos-internal.example.com\`)"
  entryPoints = ["internal"]
  service = "immich-service"

[http.middlewares.immich-public-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  pathPatterns = [ # [!code ++]
    "(?i)^/api/auth/login.*$", # [!code ++]
    "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
    "(?i)^/api/users.*$", # [!code ++]
    "(?i)^/api/admin.*$", # [!code ++]
    "(?i)^/api/server-info/stats.*$" # [!code ++]
  ] # [!code ++]

[http.middlewares.immich-public-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

[http.services.immich-service.loadBalancer]
  [[http.services.immich-service.loadBalancer.servers]]
    url = "http://immich-server:2283"`,
})

const traefikLabels = buildSnippet({
  lang: 'docker',
  code: `# docker-compose.yaml — label-based configuration on immich-server container

# Public Router with RouteWarden shield:
- "traefik.enable=true"
- "traefik.http.routers.immich-pub.rule=Host(\`photos.example.com\`)"
- "traefik.http.routers.immich-pub.entrypoints=websecure"
- "traefik.http.routers.immich-pub.middlewares=immich-public-shield" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.pathPatterns=(?i)^/api/auth/login.*$,(?i)^/api/auth/admin-sign-up.*$,(?i)^/api/users.*$,(?i)^/api/admin.*$,(?i)^/api/server-info/stats.*$" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.response.statusCode=404" # [!code ++]
- 'traefik.http.middlewares.immich-public-shield.plugin.routewarden.response.body={"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

# Private Router (Full Access over VPN / LAN):
- "traefik.http.routers.immich-priv.rule=Host(\`photos-internal.example.com\`)"
- "traefik.http.routers.immich-priv.entrypoints=internal"
- "traefik.http.services.immich-server.loadbalancer.server.port=2283"`,
})

const traefikK8s = buildSnippet({
  lang: 'yaml',
  code: `# traefik-middleware.yaml — Kubernetes CRD
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: immich-public-shield # [!code ++]
  namespace: default
spec: # [!code ++]
  plugin: # [!code ++]
    routewarden: # [!code ++]
      enabled: true # [!code ++]
      enableDefaultPatterns: true # [!code ++]
      pathPatterns: # [!code ++]
        - '(?i)^/api/auth/login.*$' # [!code ++]
        - '(?i)^/api/auth/admin-sign-up.*$' # [!code ++]
        - '(?i)^/api/users.*$' # [!code ++]
        - '(?i)^/api/admin.*$' # [!code ++]
        - '(?i)^/api/server-info/stats.*$' # [!code ++]
      response: # [!code ++]
        mode: json # [!code ++]
        statusCode: 404 # [!code ++]
        body: '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: immich-public
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(\`photos.example.com\`)
      kind: Rule
      middlewares:
        - name: immich-public-shield # [!code ++]
      services:
        - name: immich-service
          port: 2283`,
})

// ─── Caddy files ─────────────────────────────────────────────────────────────

const caddyFile = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile — Dual-Site Architecture
{
    order route_warden before reverse_proxy # [!code ++]
}

# 1. PUBLIC SITE: Shielded from login and administration probes
photos.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        path_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$" "(?i)^/api/server-info/stats.*$" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\"error\":\"Not Found\",\"message\":\"Endpoint unavailable on public router\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy immich-server:2283
}

# 2. PRIVATE SITE: Accessible only via internal VPN / Tailscale / LAN
photos-internal.example.com {
    # Full access: no RouteWarden restrictions
    reverse_proxy immich-server:2283
}`,
})

const caddyDockerCompose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yaml — Caddy with RouteWarden plugin
services:
  caddy:
    image: ghcr.io/routewarden/caddy:latest # [!code ++]
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile # [!code ++]
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - immich-net

  immich-server:
    image: ghcr.io/immich-app/immich-server:release
    container_name: immich-server
    restart: unless-stopped
    networks:
      - immich-net

networks:
  immich-net:

volumes:
  caddy_data:
  caddy_config:`,
})

const caddyDockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `# Dockerfile — Build Caddy with RouteWarden plugin
FROM caddy:2-builder AS builder # [!code ++]

RUN xcaddy build \\ # [!code ++]
    --with github.com/routewarden/caddy-routewarden # [!code ++]

FROM caddy:2

COPY --from=builder /usr/bin/caddy /usr/bin/caddy`,
})

const caddyK8s = buildSnippet({
  lang: 'yaml',
  code: `# caddy-configmap.yaml — Caddy Kubernetes ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: caddy-config
  namespace: default
data:
  Caddyfile: | # [!code ++]
    { # [!code ++]
        order route_warden before reverse_proxy # [!code ++]
    } # [!code ++]
    
    photos.example.com { # [!code ++]
        route_warden { # [!code ++]
            enable_default_patterns true # [!code ++]
            path_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$" "(?i)^/api/server-info/stats.*$" # [!code ++]
            response { # [!code ++]
                mode json # [!code ++]
                status_code 404 # [!code ++]
            } # [!code ++]
        } # [!code ++]
        reverse_proxy immich-service:2283 # [!code ++]
    } # [!code ++]`,
})

// ─── Nginx files ──────────────────────────────────────────────────────────────

const nginxConf = buildSnippet({
  lang: 'nginx',
  code: `# nginx.conf — Dual-Site Architecture with RouteWarden Lua module
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        public_warden = routewarden.new({ # [!code ++]
            enable_default_patterns = true, # [!code ++]
            path_patterns = { # [!code ++]
                "(?i)^/api/auth/login.*$", # [!code ++]
                "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
                "(?i)^/api/users.*$", # [!code ++]
                "(?i)^/api/admin.*$", # [!code ++]
                "(?i)^/api/server-info/stats.*$" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    # 1. PUBLIC SERVER: Shielded from login and administrative probing
    server {
        listen 80;
        server_name photos.example.com;

        access_by_lua_block {
            public_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://immich-server:2283;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }

    # 2. PRIVATE SERVER: Accessible only via internal VPN / Tailscale / LAN
    server {
        listen 80;
        server_name photos-internal.example.com;

        # Full access: no RouteWarden checks applied
        location / {
            proxy_pass http://immich-server:2283;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}`,
})

const nginxDockerCompose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yaml — OpenResty + RouteWarden Lua module
services:
  openresty:
    image: openresty/openresty:alpine # [!code ++]
    container_name: openresty
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf # [!code ++]
      - ./lua:/etc/nginx/lua # [!code ++]
    networks:
      - immich-net

  immich-server:
    image: ghcr.io/immich-app/immich-server:release
    container_name: immich-server
    restart: unless-stopped
    networks:
      - immich-net

networks:
  immich-net:`,
})

const nginxK8s = buildSnippet({
  lang: 'yaml',
  code: `# nginx-ingress.yaml — NGINX Ingress with RouteWarden Lua snippet
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: immich-public-ingress
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: | # [!code ++]
      access_by_lua_block { # [!code ++]
          local routewarden = require("resty.routewarden") # [!code ++]
          local warden = routewarden.new({ # [!code ++]
              enable_default_patterns = true, # [!code ++]
              path_patterns = { # [!code ++]
                  "(?i)^/api/auth/login.*$", # [!code ++]
                  "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
                  "(?i)^/api/users.*$", # [!code ++]
                  "(?i)^/api/admin.*$" # [!code ++]
              } # [!code ++]
          }) # [!code ++]
          warden:check() # [!code ++]
      } # [!code ++]
spec:
  rules:
    - host: photos.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: immich-service
                port:
                  number: 2283`,
})

// ─── Assemble snippets per gateway ────────────────────────────────────────────

const snippets = computed(() => ({
  traefik: [
    {
      filename: 'traefik.yaml',
      lang: 'yaml',
      code: traefikYaml.cleanCode,
      html: traefikYaml.html,
      hasDiff: traefikYaml.hasDiff,
    },
    {
      filename: 'traefik.toml',
      lang: 'toml',
      code: traefikToml.cleanCode,
      html: traefikToml.html,
      hasDiff: traefikToml.hasDiff,
    },
    {
      filename: 'docker-compose.yaml',
      lang: 'docker',
      code: traefikLabels.cleanCode,
      html: traefikLabels.html,
      hasDiff: traefikLabels.hasDiff,
    },
    {
      filename: 'traefik-ingress.yaml',
      lang: 'yaml',
      code: traefikK8s.cleanCode,
      html: traefikK8s.html,
      hasDiff: traefikK8s.hasDiff,
    },
  ],
  caddy: [
    {
      filename: 'Caddyfile',
      lang: 'caddy',
      code: caddyFile.cleanCode,
      html: caddyFile.html,
      hasDiff: caddyFile.hasDiff,
    },
    {
      filename: 'docker-compose.yaml',
      lang: 'yaml',
      code: caddyDockerCompose.cleanCode,
      html: caddyDockerCompose.html,
      hasDiff: caddyDockerCompose.hasDiff,
    },
    {
      filename: 'Dockerfile',
      lang: 'dockerfile',
      code: caddyDockerfile.cleanCode,
      html: caddyDockerfile.html,
      hasDiff: caddyDockerfile.hasDiff,
    },
    {
      filename: 'Caddy(K8s)',
      lang: 'yaml',
      code: caddyK8s.cleanCode,
      html: caddyK8s.html,
      hasDiff: caddyK8s.hasDiff,
    },
  ],
  nginx: [
    {
      filename: 'nginx.conf',
      lang: 'nginx',
      code: nginxConf.cleanCode,
      html: nginxConf.html,
      hasDiff: nginxConf.hasDiff,
    },
    {
      filename: 'docker-compose.yaml',
      lang: 'yaml',
      code: nginxDockerCompose.cleanCode,
      html: nginxDockerCompose.html,
      hasDiff: nginxDockerCompose.hasDiff,
    },
    {
      filename: 'Nginx(K8s)',
      lang: 'yaml',
      code: nginxK8s.cleanCode,
      html: nginxK8s.html,
      hasDiff: nginxK8s.hasDiff,
    },
  ],
}))

// ─── Alternative Single Router Snippet ────────────────────────────────────────

const altTraefikYaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    immich-smart-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          pathPatterns: # [!code ++]
            - '(?i)^/api/auth/login.*$' # [!code ++]
            - '(?i)^/api/auth/admin-sign-up.*$' # [!code ++]
            - '(?i)^/api/users.*$' # [!code ++]
            - '(?i)^/api/admin.*$' # [!code ++]
            - '(?i)^/api/server-info/stats.*$' # [!code ++]
          # Trusted Home / VPN Subnets bypass the shield:
          allowedIps: # [!code ++]
            - "10.0.0.0/8"          # Internal LAN # [!code ++]
            - "100.64.0.0/10"        # Tailscale CGNAT subnet # [!code ++]
            - "192.168.1.0/24"       # Home Office subnet # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"Resource unavailable"}' # [!code ++]`,
})

const altCaddyfile = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile: Single domain with IP allowlist bypass
photos.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        path_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$" "(?i)^/api/server-info/stats.*$" # [!code ++]
        # Whitelisted VPN and LAN subnets bypass the block:
        allowed_ips "10.0.0.0/8" "100.64.0.0/10" "192.168.1.0/24" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"Resource unavailable\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy immich-server:2283
}`,
})

const altNginxConf = buildSnippet({
  lang: 'nginx',
  code: `# nginx.conf: Single server with IP allowlist bypass
http {
    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]
        immich_warden = routewarden.new({ # [!code ++]
            enable_default_patterns = true, # [!code ++]
            path_patterns = { # [!code ++]
                "(?i)^/api/auth/login.*$", # [!code ++]
                "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
                "(?i)^/api/users.*$", # [!code ++]
                "(?i)^/api/admin.*$", # [!code ++]
                "(?i)^/api/server-info/stats.*$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"Resource unavailable"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name photos.example.com;

        access_by_lua_block {
            immich_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://immich-server:2283;
        }
    }
}`,
})

const alternativeSnippets = computed(() => ({
  traefik: [
    {
      filename: 'Traefik(YAML)',
      lang: 'yaml',
      code: altTraefikYaml.cleanCode,
      html: altTraefikYaml.html,
      hasDiff: altTraefikYaml.hasDiff,
    },
  ],
  caddy: [
    {
      filename: 'Caddyfile',
      lang: 'caddy',
      code: altCaddyfile.cleanCode,
      html: altCaddyfile.html,
      hasDiff: altCaddyfile.hasDiff,
    },
  ],
  nginx: [
    {
      filename: 'nginx.conf',
      lang: 'nginx',
      code: altNginxConf.cleanCode,
      html: altNginxConf.html,
      hasDiff: altNginxConf.hasDiff,
    },
  ],
}))

// ─── Verification Curl Test Snippets ─────────────────────────────────────────

const testPublicLogin = buildSnippet({
  lang: 'bash',
  code: `# Attempt to access login API from public internet
curl -i https://photos.example.com/api/auth/login

# Response:
# HTTP/2 404
# content-type: application/json
# {"error":"Not Found","message":"Endpoint unavailable on public router"}`,
})

const testPublicStats = buildSnippet({
  lang: 'bash',
  code: `# Attempt to probe server statistics or user list
curl -i https://photos.example.com/api/server-info/stats
curl -i https://photos.example.com/api/users

# Both return 404 Not Found immediately without touching Immich backend!`,
})

const testPublicShare = buildSnippet({
  lang: 'bash',
  code: `# Public shared album link accessed from the internet
curl -i https://photos.example.com/share/abcdef123456

# Response:
# HTTP/2 200 OK
# Immich serves shared album viewer successfully`,
})

const testInternalLogin = buildSnippet({
  lang: 'bash',
  code: `# Admin login from internal VPN router or whitelisted IP
curl -i https://photos-internal.example.com/api/auth/login

# Response:
# HTTP/2 200 OK (or backend response from Immich authentication handler)`,
})

const testPublicLoginSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testPublicLogin.cleanCode, html: testPublicLogin.html, hasDiff: false }],
}))

const testPublicStatsSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testPublicStats.cleanCode, html: testPublicStats.html, hasDiff: false }],
}))

const testPublicShareSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testPublicShare.cleanCode, html: testPublicShare.html, hasDiff: false }],
}))

const testInternalLoginSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testInternalLogin.cleanCode, html: testInternalLogin.html, hasDiff: false }],
}))
</script>

# Case Study: Dual-Router Security for Immich Self-Hosted Photos

This case study demonstrates a real-world production pattern: **securing a self-hosted web application with a dual-router architecture using RouteWarden**.

We use **[Immich](https://immich.app/)** (a self-hosted high-performance photo and video backup solution) as the primary example, though this pattern applies equally to Nextcloud, Jellyfin, Grafana, Home Assistant, and internal SaaS tools.

---

## The Challenge

You want to share public photo albums, shared timeline links, or public asset previews with family, friends, or clients over the internet (e.g., `photos.yourdomain.com`). 

However, exposing Immich directly to the public web introduces significant attack surface:
- **Authentication & Login APIs**: Brute-force credential stuffing against `/api/auth/login`.
- **Administrative Endpoints**: Potential exposure of `/api/admin/*` or `/api/server-info/stats`.
- **User Management**: Public scanning against user enumeration APIs like `/api/users*`.
- **Account Registration**: Public bot registrations against `/api/auth/admin-sign-up*`.

### The Goal
1. **Private Router (Admins / Family)**: Accessible via internal network / VPN (WireGuard, Tailscale, or corporate subnet). Has full access to all features, administration, background jobs, user management, and login.
2. **Public Router (Internet)**: Accessible publicly to view shared photos/albums, but **strictly intercepts and blocks** all sensitive login, administrative, and user management endpoints before they can ever be probed by internet scanners.

---

## Architecture Diagram

```
                              Internet / Public Traffic
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │    Traefik (Port 443) │
                             └───────────┬───────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │ Public Router         │                       │ Private / VPN Router  │
     │ Host(`photos.domain`) │                       │ Host(`photos-lan.vpn`)│
     │ EntryPoint: websecure │                       │ EntryPoint: internal  │
     └───────────┬───────────┘                       └───────────┬───────────┘
                 │                                               │
                 ▼                                               │ (Full Access)
     ┌───────────────────────┐                                   │
     │ RouteWarden Shield    │                                   │
     │ - /api/auth/login*    │                                   │
     │ - /api/auth/admin*    │                                   │
     │ - /api/users*         │                                   │
     │ - /api/admin*         │                                   │
     │ - /api/server-info/*  │                                   │
     └───────────┬───────────┘                                   │
                 │ (Passed: /share/*, /api/asset/*)              │
                 ▼                                               ▼
     ┌───────────────────────────────────────────────────────────────┐
     │               Immich Server (Upstream Backend)                │
     └───────────────────────────────────────────────────────────────┘
```

---

## Immich Configuration: Setting the External Domain

When Immich generates public share links (e.g. for photo albums or partner sharing), it must know which public domain to embed into the generated links instead of your internal/VPN IP.

1. Log into your Immich web interface as an Administrator (using your private/VPN router or internal IP).
2. Navigate to **Administration** ➔ **Settings** ➔ **Server Settings**.
3. Under **External domain**, enter your public router's URL (e.g., `https://photos.domain` or `https://photos.example.com`).
4. Click **Save**.

![Immich Server Settings](/immich-server-settings.png)

> [!TIP]
> Setting the **External domain** guarantees that whenever you create a public album or shareable link, Immich automatically prefixes links with your hardened public domain (`https://photos.domain/share/...`), which points to the RouteWarden-protected public router.

---

## RouteWarden Dual-Router Configuration

Select your gateway below to see the full configuration. Diff highlights show the RouteWarden-specific additions:

<CodeViewer :snippets="snippets" />

---

## Alternative: Single Router with IP Whitelisting Bypass

If you prefer using a single domain name (e.g. `photos.example.com`) without maintaining separate public and private hostnames or entrypoints, you can configure RouteWarden's **`allowedIps`** feature:

<CodeViewer :snippets="alternativeSnippets" />

With this approach:
- When you connect while connected to your **Tailscale / WireGuard VPN** or home Wi-Fi, `allowedIps` matches your client IP, allowing unrestricted login and administration.
- When an external user or scanner hits `photos.example.com` from the internet, login and admin endpoints return **404 Not Found**, while public album links continue working smoothly.

---

## Security Verification & Curl Tests

### 1. Test from Public Internet (Simulated Attack)

<CodeViewer :snippets="testPublicLoginSnippets" />

<CodeViewer :snippets="testPublicStatsSnippets" />

### 2. Test Public Photo Sharing (Allowed Traffic)

<CodeViewer :snippets="testPublicShareSnippets" />

### 3. Test from Internal / VPN Router

<CodeViewer :snippets="testInternalLoginSnippets" />

---

## Key Benefits of this Architecture

1. **Zero Exposure of Authentication Surfaces**: Attackers cannot brute-force passwords, credential-stuff, or discover admin endpoints.
2. **Cloaked Topology (404 Not Found)**: Scanners receive a standard 404, leading them to believe the API endpoints do not exist.
3. **Upstream Load Reduction**: Blocked requests are intercepted at the proxy level in microseconds, avoiding database queries and application CPU overhead on Immich.
4. **No Custom Forks**: No need to patch or fork the upstream application; security policy is maintained cleanly at the network perimeter.
