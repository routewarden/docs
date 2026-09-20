# Example 6: Kubernetes IngressRoute (Traefik CRD)

Deploy RouteWarden inside Kubernetes clusters using Traefik's Custom Resource Definitions (`Middleware` and `IngressRoute`).

---

## Traefik Kubernetes (IngressRoute CRD)

### 1. Static Cluster Configuration

Ensure the plugin is enabled in Traefik's Helm chart values:

```yaml
additionalArguments:
  - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
  - "--experimental.plugins.routewarden.version={{version}}"
```

### 2. Manifests

#### `middleware.yaml`
```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: routewarden-k8s-shield
  namespace: default
spec:
  plugin:
    routewarden:
      enabled: true
      enableDefaultPatterns: true
      checkQuery: true
      allowedIps:
        - "10.0.0.0/8"
        - "172.16.0.0/12"
      response:
        mode: json
        statusCode: 403
        body: '{"error":"Forbidden","source":"k8s-routewarden-crd"}'
```

#### `ingressroute.yaml`
```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: secured-app-ingress
  namespace: default
spec:
  entryPoints:
    - web
    - websecure
  routes:
    - match: Host(`production.example.com`)
      kind: Rule
      services:
        - name: app-service
          port: 80
      middlewares:
        - name: routewarden-k8s-shield
```

---

## Caddy Kubernetes (Caddy Ingress / ConfigMap)

When running Caddy in Kubernetes (via the official Caddy Ingress Controller or custom Caddy DaemonSet/Deployment built with `xcaddy --with github.com/routewarden/caddy-warden@{{version}}`), manage RouteWarden via a mounted `ConfigMap`:

### `caddy-configmap.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: caddy-config
  namespace: default
data:
  Caddyfile: |
    {
        order route_warden before reverse_proxy
    }

    production.example.com {
        route_warden {
            enable_default_patterns true
            check_query true
            allowed_ips "10.0.0.0/8" "172.16.0.0/12"
            response {
                mode json
                status_code 403
                body "{\"error\":\"Forbidden\",\"source\":\"caddy-k8s\"}"
            }
        }

        reverse_proxy app-service.default.svc.cluster.local:80
    }
```

### `caddy-ingress.yaml` (Standard Kubernetes Ingress)
If using Caddy Ingress with Ingress annotations:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production-ingress
  namespace: default
  annotations:
    caddy.community/order: "route_warden before reverse_proxy"
spec:
  ingressClassName: caddy
  rules:
    - host: production.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
```

---

## NGINX Kubernetes (Ingress-NGINX ConfigMap & Snippets)

When using **ingress-nginx** (or custom OpenResty Ingress), mount the RouteWarden Lua library and inject inspection via the `configuration-snippet` or global server snippets:

### `nginx-ingress-snippet.yaml`
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secured-nginx-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/server-snippet: |
      lua_package_path "/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";
      init_by_lua_block {
        local routewarden = require("resty.routewarden")
        warden = routewarden.new({
          enable_default_patterns = true,
          check_query = true,
          allowed_ips = { "10.0.0.0/8", "172.16.0.0/12" },
          response = {
            mode = "json",
            status_code = 403,
            body = '{"error":"Forbidden","source":"k8s-nginx-ingress"}'
          }
        })
      }
    nginx.ingress.kubernetes.io/configuration-snippet: |
      access_by_lua_block {
        warden:check()
      }
spec:
  ingressClassName: nginx
  rules:
    - host: production.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
```

---

## Deployment Commands

```bash
# Apply both CRDs
kubectl apply -f middleware.yaml
kubectl apply -f ingressroute.yaml

# Inspect middleware status
kubectl get middleware routewarden-k8s-shield -o yaml
```
