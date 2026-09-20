# Example 1: Basic Sensitive File Blocking

This scenario protects a web application against reconnaissance and exposure of critical infrastructure files using RouteWarden's built-in rule dictionary.

---

## Configuration Preview

::: code-group

```yaml [Traefik (YAML)]
# dynamic_conf.yml
http:
  middlewares:
    warden-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'

  routers:
    webapp-router:
      rule: "Host(`localhost`)"
      entryPoints:
        - web
      middlewares:
        - warden-shield
      service: webapp-service

  services:
    webapp-service:
      loadBalancer:
        servers:
          - url: "http://webapp:80"
```

```nginx [Caddy (Caddyfile)]
# Caddyfile
{
    order route_warden before reverse_proxy
}

localhost {
    route_warden {
        enable_default_patterns true
        response {
            mode json
            status_code 403
            body "{\"error\":\"Forbidden\",\"message\":\"Sensitive path blocked by RouteWarden\"}"
        }
    }

    reverse_proxy webapp:80
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: Basic Sensitive File Shield
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            enable_default_patterns = true,
            response = {
                mode = "json",
                status_code = 403,
                body = '{"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'
            }
        })
    }

    server {
        listen 80;
        server_name localhost;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://webapp:80;
        }
    }
}
```

```bash [Traefik (Docker Compose)]
# Traefik Docker Compose Labels / CLI equivalent
- "traefik.enable=true"
- "traefik.http.routers.webapp.rule=Host(`localhost`)"
- "traefik.http.routers.webapp.entrypoints=web"
- "traefik.http.routers.webapp.middlewares=warden-shield"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.response.statusCode=403"
- 'traefik.http.middlewares.warden-shield.plugin.routewarden.response.body={"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.routers.webapp-router]
  rule = "Host(`localhost`)"
  entryPoints = ["web"]
  middlewares = ["warden-shield"]
  service = "webapp-service"

[http.services.webapp-service.loadBalancer]
  [[http.services.webapp-service.loadBalancer.servers]]
    url = "http://webapp:80"

[http.middlewares.warden-shield.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.middlewares.warden-shield.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'
```

:::

---

## Docker Compose Example

::: code-group

```yaml [Traefik (Docker Compose)]
services:
  traefik:
    image: traefik:v3.1
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version={{version}}"
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(`localhost`)"
      - "traefik.http.routers.webapp.entrypoints=web"
      - "traefik.http.routers.webapp.middlewares=warden-shield"

      # RouteWarden Setup
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.enableDefaultPatterns=true"
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.response.mode=json"
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.response.statusCode=403"
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.response.body={\"error\":\"Forbidden\",\"message\":\"Sensitive path blocked by RouteWarden\"}"
```

```yaml [Caddy (Docker Compose)]
services:
  caddy:
    image: caddy:2-alpine
    # Build with xcaddy or use a custom image with caddy-warden installed
    build:
      context: .
      dockerfile_inline: |
        FROM caddy:2-builder AS builder
        RUN xcaddy build --with github.com/routewarden/caddy-warden@{{version}}
        FROM caddy:2-alpine
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      - webapp

  webapp:
    image: nginx:alpine
```

```yaml [NGINX / OpenResty (Docker Compose)]
services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - webapp

  webapp:
    image: nginx:alpine
```

:::

---

## Verification Commands

```bash
# Legitimate homepage access (Allowed)
curl -I http://localhost/
# Output: HTTP/1.1 200 OK

# Probing for environment secrets (Blocked)
curl -i http://localhost/.env
# Output: HTTP/1.1 403 Forbidden
# {"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}

# Probing for Git repository details (Blocked)
curl -i http://localhost/.git/config
# Output: HTTP/1.1 403 Forbidden
```
