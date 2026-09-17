# Examples & Cookbook Overview (v0.2.4)

::: warning Legacy Version Notice
You are viewing archived documentation for **v0.2.4 (v0.2.x)**. [Switch to Latest ➔](/traefik/getting-started)
:::

Browse ready-to-run configurations and production blueprints for RouteWarden across different deployment targets.

---

## Scenario Index

| Scenario | Description | Target |
|---|---|---|
| [1. Basic Sensitive Files]/v0.2/examples/basic-sensitive-files) | Shield `.env`, `.git`, backups, and configs with custom JSON errors. | Traefik & Caddy |
| [2. Global EntryPoint Shield]/v0.2/examples/docker-compose-global) | Protect all microservices and routes automatically at the proxy gateway. | Traefik & Caddy |
| [3. Service-Level Docker Compose]/v0.2/examples/docker-compose-service) | Tailor rules, custom regexes, and safe allowlists per service. | Traefik & Caddy |
| [4. IP / Subnet Whitelisting]/v0.2/examples/ip-whitelisting) | Allow internal corporate VPNs, office IPs, and developer subnets. | Traefik & Caddy |
| [5. Captcha Verification Challenge]/v0.2/examples/captcha) | Challenge clients via Cloudflare Turnstile or hCaptcha on sensitive routes. | Traefik & Caddy |
| [6. Kubernetes IngressRoute]/v0.2/examples/kubernetes) | Production Ingress and Middleware setups for Traefik CRDs & Caddy Ingress. | Kubernetes (Traefik & Caddy) |

---

## Production Case Studies

| Case Study | Focus & Threat Model | Protection Pattern |
|---|---|---|
| [1. Immich Dual-Router Shield]/v0.2/examples/case-study-immich) | Public photo/video sharing without exposing login/admin APIs. | Dual Traefik Routers + 404 Masking |
| [2. Zero-Trust Webhooks]/v0.2/examples/case-study-webhooks) | Secure Stripe/GitHub webhook ingress from unauthorized HTTP injection. | Provider CIDR Whitelisting + Silent Drop |
| [3. Observability & Metrics Cloaking]/v0.2/examples/case-study-observability) | Prevent public harvesting of Prometheus `/metrics` and `/actuator`. | VPC / Internal Scraper IP Exemption |
| [4. CMS & WordPress Brute-Force Shield]/v0.2/examples/case-study-cms-shield) | Eliminate credential-stuffing on `wp-login.php`, `xmlrpc.php`, and `/admin`. | Cloudflare Turnstile / hCaptcha Challenge |
| [5. Password Vaults (Vaultwarden)]/v0.2/examples/case-study-vaultwarden) | Public mobile password sync while restricting `/admin` to Tailscale/WireGuard. | VPN Subnet Filter + 404 Error Cloaking |
| [6. Honeypots & Staging Cloaking]/v0.2/examples/case-study-honeypot-staging) | Neutralize scanning bots and hide pull-request preview clusters from crawlers. | TCP RST (`silentDrop`) & 307 Deflection |

---

## In-Repo Runnable Code

All examples are checked directly into the [`examples/`](https://github.com/routewarden/traefik-warden/tree/main/examples) directory of the RouteWarden GitHub repository. You can clone the repo and run any scenario in seconds:

```bash
git clone https://github.com/routewarden/traefik-warden.git
cd routewarden/examples/01-basic-sensitive-files
docker compose up -d
```
