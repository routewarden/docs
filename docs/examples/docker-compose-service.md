# Example 3: Service-Level Docker Compose

When individual microservices require custom regex rules, sensitive directory exceptions, query inspection, or dedicated error payloads, configure RouteWarden at the service router level.

---

## Configuration Preview

::: code-group

```yaml [Traefik (File YAML)]
# dynamic_conf.yml
http:
  middlewares:
    service-warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          checkQuery: true
          pathPatterns:
            - '(?i)^/admin(/.*)?$'
            - '(?i)^/api/internal(/.*)?$'
          allowPatterns:
            - '(?i)^/robots\.txt$'
            - '(?i)^/\.well-known(/.*)?$'
          allowedIps:
            - "192.168.1.0/24"
            - "10.10.0.0/16"
          response:
            mode: json
            statusCode: 403
            body: '{"error":"access_denied","service":"web"}'
            headers:
              X-Protected-By: "RouteWarden"

  routers:
    web-router:
      rule: "Host(`example.com`)"
      entryPoints:
        - web
      middlewares:
        - service-warden
      service: web-service
```

```nginx [Caddy (Caddyfile)]
# Caddyfile: Service-specific custom rules and allowlist exceptions
{
    order route_warden before reverse_proxy
}

example.com {
    route_warden {
        enable_default_patterns true
        check_query true
        path_patterns "(?i)^/admin(/.*)?$" "(?i)^/api/internal(/.*)?$"
        allow_patterns "(?i)^/robots\.txt$" "(?i)^/\.well-known(/.*)?$"
        allowed_ips "192.168.1.0/24" "10.10.0.0/16"
        response {
            mode json
            status_code 403
            body "{\"error\":\"access_denied\",\"service\":\"web\"}"
        }
    }

    reverse_proxy web:80
}
```

```bash [Traefik (Docker Compose Labels)]
# Docker Compose Labels / CLI equivalent
- "traefik.enable=true"
- "traefik.http.routers.web.rule=Host(`example.com`)"
- "traefik.http.routers.web.entrypoints=web"
- "traefik.http.routers.web.middlewares=service-warden"
- "traefik.http.middlewares.service-warden.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.service-warden.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.service-warden.plugin.routewarden.checkQuery=true"
- "traefik.http.middlewares.service-warden.plugin.routewarden.pathPatterns=(?i)^/admin(/.*)?$,(?i)^/api/internal(/.*)?$"
- "traefik.http.middlewares.service-warden.plugin.routewarden.allowPatterns=(?i)^/robots\\.txt$,(?i)^/\\.well-known(/.*)?$"
- "traefik.http.middlewares.service-warden.plugin.routewarden.allowedIps=192.168.1.0/24,10.10.0.0/16"
- "traefik.http.middlewares.service-warden.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.service-warden.plugin.routewarden.response.statusCode=403"
- 'traefik.http.middlewares.service-warden.plugin.routewarden.response.body={"error":"access_denied","service":"web"}'
- "traefik.http.middlewares.service-warden.plugin.routewarden.response.headers.X-Protected-By=RouteWarden"
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.routers.web-router]
  rule = "Host(`example.com`)"
  entryPoints = ["web"]
  middlewares = ["service-warden"]
  service = "web-service"

[http.middlewares.service-warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true
  checkQuery = true
  pathPatterns = ["(?i)^/admin(/.*)?$", "(?i)^/api/internal(/.*)?$"]
  allowPatterns = ["(?i)^/robots\\.txt$", "(?i)^/\\.well-known(/.*)?$"]
  allowedIps = ["192.168.1.0/24", "10.10.0.0/16"]

[http.middlewares.service-warden.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"access_denied","service":"web"}'

[http.middlewares.service-warden.plugin.routewarden.response.headers]
  X-Protected-By = "RouteWarden"
```

:::

---

## Docker Compose Example

::: code-group

```yaml [Traefik (Docker Compose)]
services:
  web:
    image: my-web-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`example.com`)"
      - "traefik.http.routers.web.entrypoints=web"
      # Attach service-specific middleware
      - "traefik.http.routers.web.middlewares=service-warden"

      # RouteWarden Middleware Definition
      - "traefik.http.middlewares.service-warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.service-warden.plugin.routewarden.enableDefaultPatterns=true"
      - "traefik.http.middlewares.service-warden.plugin.routewarden.checkQuery=true"
      # Block internal/debug routes specifically for this application
      - "traefik.http.middlewares.service-warden.plugin.routewarden.pathPatterns=(?i)^/admin(/.*)?$,(?i)^/api/internal(/.*)?$"
      # Safe exceptions for public robot & ACME challenges
      - "traefik.http.middlewares.service-warden.plugin.routewarden.allowPatterns=(?i)^/robots\\.txt$,(?i)^/\\.well-known(/.*)?$"
      # Trusted internal office network
      - "traefik.http.middlewares.service-warden.plugin.routewarden.allowedIps=192.168.1.0/24,10.10.0.0/16"
      # Custom JSON response structure
      - "traefik.http.middlewares.service-warden.plugin.routewarden.response.mode=json"
      - "traefik.http.middlewares.service-warden.plugin.routewarden.response.statusCode=403"
      - "traefik.http.middlewares.service-warden.plugin.routewarden.response.body={\"error\":\"access_denied\",\"service\":\"web\"}"
      - "traefik.http.middlewares.service-warden.plugin.routewarden.response.headers.X-Protected-By=RouteWarden"
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
      - web

  web:
    image: my-web-app:latest
```

:::
