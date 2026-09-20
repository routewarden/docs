# Example 4: IP & CIDR Subnet Whitelisting

RouteWarden allows you to declare trusted IPs and subnets (`allowedIps`) to bypass path blocking. This is ideal for internal management portals, company VPN gateways, and authorized vulnerability scanners.

---

## How IP Resolution Works

RouteWarden evaluates client IPs in the following priority order:
1. **`X-Forwarded-For`** header (first IP in list)
2. **`X-Real-IP`** header
3. Socket **`RemoteAddr`**

Both exact IPv4/IPv6 addresses (`127.0.0.1`, `2001:db8::1`) and CIDR blocks (`10.0.0.0/8`, `192.168.1.0/24`) are supported.

---

## Configuration Preview

::: code-group

```json [routewarden.json]
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "pathPatterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/metrics(/.*)?$"
  ],
  "allowedIps": [
    "10.0.0.0/8",
    "192.168.1.100"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\"error\":\"Forbidden\",\"message\":\"Restricted to authorized IP/VPN\"}"
  }
}
```

```yaml [Traefik (YAML)]
# dynamic_conf.yml
http:
  middlewares:
    admin-shield:
      plugin:
        routewarden:
          enabled: true
          pathPatterns:
            - '(?i)^/admin(/.*)?$'
            - '(?i)^/metrics(/.*)?$'
          allowedIps:
            - "10.0.0.0/8"
            - "192.168.1.100"
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'

  routers:
    admin-router:
      rule: "Host(`admin.localhost`)"
      entryPoints:
        - web
      middlewares:
        - admin-shield
      service: admin-service
```

```nginx [Caddy (Caddyfile)]
# Caddyfile
{
    order route_warden before reverse_proxy
}

admin.localhost {
    route_warden {
        path_patterns "(?i)^/admin(/.*)?$" "(?i)^/metrics(/.*)?$"
        allowed_ips "10.0.0.0/8" "192.168.1.100"
        response {
            mode json
            status_code 403
            body "{\"error\":\"Forbidden\",\"message\":\"Restricted to authorized IP/VPN\"}"
        }
    }

    reverse_proxy admin-service:80
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: IP & CIDR Subnet Allowlisting
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        admin_warden = routewarden.new({
            path_patterns = {
                "(?i)^/admin(/.*)?$",
                "(?i)^/metrics(/.*)?$"
            },
            allowed_ips = {
                "10.0.0.0/8",
                "192.168.1.100"
            },
            response = {
                mode = "json",
                status_code = 403,
                body = '{"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'
            }
        })
    }

    server {
        listen 80;
        server_name admin.localhost;

        access_by_lua_block {
            admin_warden:check()
        }

        location / {
            proxy_pass http://admin-service:80;
        }
    }
}
```

```bash [Traefik (Docker Compose)]
# Docker Compose Labels / CLI equivalent
- "traefik.enable=true"
- "traefik.http.routers.admin.rule=Host(`admin.localhost`)"
- "traefik.http.routers.admin.entrypoints=web"
- "traefik.http.routers.admin.middlewares=admin-shield"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.pathPatterns=(?i)^/admin(/.*)?$,(?i)^/metrics(/.*)?$"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.100"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.response.statusCode=403"
- 'traefik.http.middlewares.admin-shield.plugin.routewarden.response.body={"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.routers.admin-router]
  rule = "Host(`admin.localhost`)"
  entryPoints = ["web"]
  middlewares = ["admin-shield"]
  service = "admin-service"

[http.middlewares.admin-shield.plugin.routewarden]
  enabled = true
  pathPatterns = ["(?i)^/admin(/.*)?$", "(?i)^/metrics(/.*)?$"]
  allowedIps = ["10.0.0.0/8", "192.168.1.100"]

[http.middlewares.admin-shield.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'
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
      - "--entrypoints.web.address=:80"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version={{version}}"
    ports:
      - "80:80"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

  admin-service:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`admin.localhost`)"
      - "traefik.http.routers.admin.entrypoints=web"
      - "traefik.http.routers.admin.middlewares=admin-shield"

      # RouteWarden Configuration with IP Whitelist
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.pathPatterns=(?i)^/admin(/.*)?$,(?i)^/metrics(/.*)?$"
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.100"
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.response.mode=json"
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.response.statusCode=403"
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.response.body={\"error\":\"Forbidden\",\"message\":\"Restricted to authorized IP/VPN\"}"
```

```yaml [Caddy (Docker Compose)]
services:
  caddy:
    image: caddy:2-alpine
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
      - admin-service

  admin-service:
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
      - admin-service

  admin-service:
    image: nginx:alpine
```

:::

---

## Testing Verification

```bash
# Request without whitelisted IP (Blocked)
curl -i -H "Host: admin.localhost" http://localhost/admin
# HTTP/1.1 403 Forbidden

# Request originating from allowed corporate subnet via proxy (Allowed)
curl -i -H "Host: admin.localhost" -H "X-Forwarded-For: 10.5.20.1" http://localhost/admin
# Passes cleanly to upstream container!
```
