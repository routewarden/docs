# Traefik Cookbook & Recipes

Production blueprints and ready-to-run configurations for deploying RouteWarden on **Traefik Proxy**.

---

## 1. Global EntryPoint Shield (Docker Compose)

Protect every microservice, API, and container automatically at Traefik's `web` or `websecure` entrypoints without needing to attach middleware labels to individual containers:

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=traefik-warden@docker"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version={{version}}"
    labels:
      - "traefik.enable=true"
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.enableDefaultPatterns=true"
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.response.mode=json"
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.response.statusCode=404"
      - 'traefik.http.middlewares.traefik-warden.plugin.routewarden.response.body={"error":"Not Found"}'
```

---

## 2. Service-Specific Defense with Allowlist Exceptions

Apply custom regex filters and safe whitelists on an individual web application:

```yaml
services:
  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(`app.example.com`)"
      - "traefik.http.routers.webapp.middlewares=app-warden"
      - "traefik.http.middlewares.app-warden.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.app-warden.plugin.routewarden.pathPatterns=(?i)^/admin(/.*)?$,(?i)^/metrics$"
      - "traefik.http.middlewares.app-warden.plugin.routewarden.allowPatterns=(?i)^/admin/health$"
      - "traefik.http.middlewares.app-warden.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.100"
```

---

## 3. Kubernetes IngressRoute (Traefik CRD)

Deploy RouteWarden in Kubernetes clusters using Traefik's Custom Resource Definitions:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: routewarden-middleware
  namespace: default
spec:
  plugin:
    routewarden:
      enabled: true
      enableDefaultPatterns: true
      pathPatterns:
        - '(?i)^/admin(/.*)?$'
      allowedIps:
        - "10.0.0.0/8"
      response:
        mode: json
        statusCode: 403
        body: '{"error":"Forbidden: Internal Cluster Only"}'
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: app-ingress
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`cluster.example.com`)
      kind: Rule
      middlewares:
        - name: routewarden-middleware
      services:
        - name: backend-service
          port: 80
```

---

## 4. Case Study: Dual-Router Defense for Immich

Safely expose public photo/video shares (`/share/*`) while strictly returning a 404 on administrative, login, and user management endpoints:

```yaml
http:
  middlewares:
    immich-public-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          pathPatterns:
            - '(?i)^/api/auth/login.*$'
            - '(?i)^/api/auth/admin-sign-up.*$'
            - '(?i)^/api/users.*$'
            - '(?i)^/api/admin.*$'
          response:
            mode: json
            statusCode: 404
            body: '{"error":"Not Found","message":"Endpoint unavailable on public router"}'

  routers:
    # Public Router: Exposes photo sharing with RouteWarden active
    immich-public:
      rule: "Host(`photos.example.com`)"
      entryPoints: ["websecure"]
      middlewares: ["immich-public-shield"]
      service: immich-service

    # Private Router: Full admin access via WireGuard or Tailscale VPN
    immich-private:
      rule: "Host(`photos-internal.example.com`)"
      entryPoints: ["internal"]
      service: immich-service
```

---

## 5. Case Study: WordPress / CMS Brute-Force Shield (Cloudflare Turnstile)

Neutralize automated dictionary crawlers probing `wp-login.php` or `xmlrpc.php`:

```yaml
http:
  middlewares:
    wordpress-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          pathPatterns:
            - '(?i)^/(wp-login\.php|xmlrpc\.php)$'
            - '(?i)^/wp-admin(/.*)?$'
          allowedIps:
            - "10.0.0.0/8"      # Internal office VPN bypasses captcha
          response:
            mode: captcha
            statusCode: 403
            captcha:
              provider: turnstile
              siteKey: "0x4AAAAAAtestkey123"
              title: "Administrative Verification Required"
```

---

## 6. Case Study: Active Defense Gzip Bomb Traps

Neutralize high-frequency bot crawlers (`dirsearch`, `nikto`) scanning for `.env` or backups:

```yaml
http:
  middlewares:
    honeypot-bomber:
      plugin:
        routewarden:
          enabled: true
          pathPatterns:
            - '(?i)(^|/)(\.env.*|\.git.*|wp-login\.php|phpmyadmin.*)$'
          response:
            mode: gzipBomb
            statusCode: 200
            gzipBombMB: 10
```
