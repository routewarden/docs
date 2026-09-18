# Caddy Cookbook & Recipes (v0.2.4)

::: warning Legacy Version Notice
You are viewing archived documentation for **v0.2.4 (v0.2.x)**. [Switch to Latest ➔](/traefik/getting-started)
:::

Production blueprints and ready-to-run configurations for deploying Caddy-Warden on **Caddy Web Server**.

---

## 1. Zero-Trust Admin & API Cloaking

Allow corporate VPN (`10.0.0.0/8`) and office IP (`192.168.1.100`) access to `/admin` and `/metrics` while returning a stealth 404 to public crawlers:

```nginx
{
    order route_warden before reverse_proxy
}

app.example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/admin(/.*)?$" "(?i)^/metrics$"
        allow_patterns "(?i)^/admin/health$"
        allowed_ips "10.0.0.0/8" "192.168.1.100"
        response {
            mode json
            status_code 404
            body "{\"error\":\"Not Found\"}"
        }
    }

    reverse_proxy backend:8080
}
```

---

## 2. Interactive Cloudflare Turnstile Verification

Challenge visitors accessing sensitive routes with Turnstile before reaching backend applications:

```nginx
{
    order route_warden before reverse_proxy
}

portal.example.com {
    route_warden {
        path_patterns "(?i)^/portal/sensitive(/.*)?$"
        response {
            mode captcha
            captcha {
                provider turnstile
                site_key "0x4AAAAAAAxxyyzz"
            }
        }
    }

    reverse_proxy portal-backend:3000
}
```

---

## 3. Active Defense Decompression Trap (Gzip Bomb)

When automated crawlers probe for WordPress, `.env`, or PHP exploits, respond with a compressed zero-byte stream that expands ~1000x in RAM:

```nginx
{
    order route_warden before reverse_proxy
}

honeypot.example.com {
    route_warden {
        path_patterns "(?i)^/(wp-login\.php|\.env|\.git.*|xmlrpc\.php)$"
        response {
            mode gzip_bomb
            status_code 200
            gzip_bomb_mb 10
        }
    }

    reverse_proxy dummy-upstream:80
}
```

---

## 4. Case Study: Dual-Site Architecture for Immich Photos

Run public photo sharing alongside protected administrative access:

```nginx
{
    order route_warden before reverse_proxy
}

# 1. PUBLIC SITE: Shielded from login and administration probes
photos.example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$"
        response {
            mode json
            status_code 404
            body "{\"error\":\"Not Found\",\"message\":\"Endpoint unavailable on public router\"}"
        }
    }

    reverse_proxy immich-server:2283
}

# 2. PRIVATE SITE: Accessible strictly via internal VPN / Tailscale
photos-internal.example.com {
    # Full access without RouteWarden restrictions
    reverse_proxy immich-server:2283
}
```

---

## 5. Case Study: Zero-Trust Webhook Ingress (Stripe CIDR Whitelist)

Lock down Stripe webhook ingress using official provider IP CIDRs and silent TCP resets:

```nginx
{
    order route_warden before reverse_proxy
}

api.example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/webhooks(/.*)?$"
        allow_patterns "(?i)^/webhooks/stripe/v1$"
        allowed_ips "3.18.12.63/32" "3.130.192.231/32" "13.235.14.237/32" "13.235.122.149/32" "35.154.171.200/32"
        response {
            mode silent_drop
        }
    }

    reverse_proxy webhook-service:8080
}
```

---

## 6. Case Study: Prometheus & Actuator Telemetry Cloaking

Hide Prometheus metrics and Spring Boot diagnostic dumps from unauthorized crawlers:

```nginx
{
    order route_warden before reverse_proxy
}

app.example.com {
    route_warden {
        enable_default_patterns true
        path_patterns "(?i)^/(metrics|server-metrics|telemetry)(/.*)?$" "(?i)^/actuator(/.*)?$"
        allowed_ips "10.0.0.50/32" "10.244.0.0/16" "127.0.0.1"
        response {
            mode json
            status_code 404
            body "{\"error\":\"Not Found\"}"
        }
    }

    reverse_proxy app-service:8080
}
```
