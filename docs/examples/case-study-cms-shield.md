# Case Study: CMS Admin & Brute-Force Shielding (WordPress & Ghost)

This case study demonstrates how to protect content management systems (WordPress, Ghost, Strapi, Drupal) against automated credential-stuffing bots, brute-force login attempts, and XML-RPC amplification attacks.

---

## The Threat Model

WordPress powers over 40% of the web, making it the number one target for automated scanner networks. The attack vectors are consistent across all deployments:
1. **`wp-login.php` Brute-Force**: Relentless dictionary attacks attempting common administrative passwords.
2. **`xmlrpc.php` Exploitation**: Used for multi-call brute force attacks where a single HTTP request can attempt hundreds of password combinations.
3. **Backup File Probing**: Scanners looking for `wp-config.php.bak`, `wp-config.old`, or database exports dumped into the webroot.

---

## The Solution: Two Tactical Approaches

### Approach A: Cloudflare Turnstile / hCaptcha Challenge
Rather than blocking login entirely, RouteWarden intercepts requests to `wp-login.php` or `/admin` and presents an interactive bot verification challenge. Once solved, legitimate humans proceed to login while bots are stopped dead.

### Approach B: Internal IP / VPN Bypass with 404 Cloaking
If content creators always connect via a corporate VPN or office IP, RouteWarden returns `404 Not Found` to the rest of the world and allows only whitelisted subnets to reach administrative paths.

---

## Middleware Configuration (Captcha Challenge Mode)

::: code-group

```yaml [Traefik (YAML)]
# dynamic_conf.yml
http:
  middlewares:
    wordpress-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true # Blocks wp-config.php.bak, .sql, .env
          pathPatterns:
            - '(?i)^/(wp-login\.php|xmlrpc\.php)$'
            - '(?i)^/wp-admin(/.*)?$'
          # Office IP bypasses captcha challenge automatically
          allowedIps:
            - "192.168.1.0/24"
            - "10.0.0.0/8"
          # Challenge all other external visitors
          response:
            mode: captcha
            statusCode: 403
            captcha:
              provider: turnstile
              siteKey: "0x4AAAAAAtestkey123"
              title: "Administrative Verification Required"

  routers:
    blog-router:
      rule: "Host(`blog.example.com`)"
      entryPoints:
        - websecure
      middlewares:
        - wordpress-shield
      service: wordpress-service
```

```nginx [Caddy (Caddyfile)]
# Caddyfile
{
    order route_warden before reverse_proxy
}

blog.example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/(wp-login\.php|xmlrpc\.php)$" "(?i)^/wp-admin(/.*)?$"
        allowed_ips "192.168.1.0/24" "10.0.0.0/8"
        response {
            mode captcha
            status_code 403
            captcha {
                provider turnstile
                site_key "0x4AAAAAAtestkey123"
            }
        }
    }

    reverse_proxy wordpress-service:80
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: WordPress & CMS Shield
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        wp_warden = routewarden.new({
            enable_default_patterns = true,
            path_patterns = {
                "(?i)^/(wp-login\\.php|xmlrpc\\.php)$",
                "(?i)^/wp-admin(/.*)?$"
            },
            allowed_ips = {
                "192.168.1.0/24",
                "10.0.0.0/8"
            },
            response = {
                mode = "captcha",
                status_code = 403,
                captcha = {
                    provider = "turnstile",
                    site_key = "0x4AAAAAAtestkey123",
                    title = "Administrative Verification Required"
                }
            }
        })
    }

    server {
        listen 80;
        server_name blog.example.com;

        access_by_lua_block {
            wp_warden:check()
        }

        location / {
            proxy_pass http://wordpress-service:80;
        }
    }
}
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.routers.blog-router]
  rule = "Host(`blog.example.com`)"
  entryPoints = ["websecure"]
  middlewares = ["wordpress-shield"]
  service = "wordpress-service"

[http.middlewares.wordpress-shield.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true
  pathPatterns = [
    "(?i)^/(wp-login\\.php|xmlrpc\\.php)$",
    "(?i)^/wp-admin(/.*)?$"
  ]
  allowedIps = ["192.168.1.0/24", "10.0.0.0/8"]

[http.middlewares.wordpress-shield.plugin.routewarden.response]
  mode = "captcha"
  statusCode = 403

[http.middlewares.wordpress-shield.plugin.routewarden.response.captcha]
  provider = "turnstile"
  siteKey = "0x4AAAAAAtestkey123"
  title = "Administrative Verification Required"
```

```bash [CLI]
# Docker Compose Labels equivalent
- "traefik.http.routers.blog.rule=Host(`blog.example.com`)"
- "traefik.http.routers.blog.middlewares=wordpress-shield"
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.pathPatterns=(?i)^/(wp-login\\.php|xmlrpc\\.php)$,(?i)^/wp-admin(/.*)?$"
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.allowedIps=192.168.1.0/24,10.0.0.0/8"
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.response.mode=captcha"
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.response.captcha.provider=turnstile"
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.response.captcha.siteKey=0x4AAAAAAtestkey123"
```

:::
