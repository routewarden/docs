# Example 2: Global EntryPoint Shield

Attaching RouteWarden directly to Traefik's entrypoint provides unified, cluster-wide protection across all services without requiring repetitive labels on individual containers.

---

## Configuration Preview

::: code-group

```yaml [Traefik (File YAML)]
# traefik.yml (Static EntryPoint Attachment)
entryPoints:
  web:
    address: ":80"
    http:
      middlewares:
        - global-warden@file

# dynamic_conf.yml (Middleware Definition)
http:
  middlewares:
    global-warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          allowedIps:
            - "127.0.0.1"
            - "10.0.0.0/8"
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","scope":"global-shield"}'
```

```nginx [Caddy (Caddyfile Snippet)]
# Caddyfile: Global RouteWarden Snippet applied across all sites
(global_warden_shield) {
    route_warden {
        enable_default_patterns true
        allowed_ips "127.0.0.1" "10.0.0.0/8"
        response {
            mode json
            status_code 403
            body '{"error":"Forbidden","scope":"global-shield"}'
        }
    }
}

{
    order route_warden before reverse_proxy
}

frontend.localhost {
    import global_warden_shield
    reverse_proxy frontend:80
}

api.localhost {
    import global_warden_shield
    reverse_proxy backend:80
}
```

```bash [Traefik (Docker CLI)]
# CLI / Traefik Arguments
traefik \
  --entrypoints.web.address=:80 \
  --entrypoints.web.http.middlewares=global-warden@docker \
  --experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden \
  --experimental.plugins.routewarden.version={{version}}
```

```toml [Traefik (TOML)]
# traefik.toml (Static EntryPoint Attachment)
[entryPoints.web]
  address = ":80"

[entryPoints.web.http]
  middlewares = ["global-warden@file"]

# dynamic_conf.toml (Middleware Definition)
[http.middlewares.global-warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true
  allowedIps = ["127.0.0.1", "10.0.0.0/8"]

[http.middlewares.global-warden.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","scope":"global-shield"}'
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
      # Attach global-warden middleware to all incoming traffic on entrypoint
      - "--entrypoints.web.http.middlewares=global-warden@docker"
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
    labels:
      - "traefik.enable=true"
      - "traefik.http.middlewares.global-warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.global-warden.plugin.routewarden.enableDefaultPatterns=true"
      - "traefik.http.middlewares.global-warden.plugin.routewarden.allowedIps=127.0.0.1,10.0.0.0/8"
      - "traefik.http.middlewares.global-warden.plugin.routewarden.response.mode=json"
      - "traefik.http.middlewares.global-warden.plugin.routewarden.response.statusCode=403"
      - "traefik.http.middlewares.global-warden.plugin.routewarden.response.body={\"error\":\"Forbidden\",\"scope\":\"global-shield\"}"

  service-frontend:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`frontend.localhost`)"
      - "traefik.http.routers.frontend.entrypoints=web"

  service-backend:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.localhost`)"
      - "traefik.http.routers.backend.entrypoints=web"
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
      - service-frontend
      - service-backend

  service-frontend:
    image: nginx:alpine

  service-backend:
    image: nginx:alpine
```

:::

Both `frontend.localhost` and `api.localhost` are guarded immediately across all incoming entrypoints.
