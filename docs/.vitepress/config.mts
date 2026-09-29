import { defineConfig } from 'vitepress'
import versionData from '../version.json' with { type: 'json' }
import versionsRegistry from '../versions.json' with { type: 'json' }

// Cloudflare Web Analytics token — only set in CI via GitHub Actions secret.
// When absent (local dev), the beacon script is NOT injected at all to avoid
// CORS errors from Cloudflare rejecting requests with an empty/invalid token.
const CF_ANALYTICS_TOKEN = process.env.CLOUDFLARE_ANALYTICS_TOKEN || ''

const caddyLanguage = {
  name: 'caddy',
  aliases: ['caddyfile', 'Caddyfile'],
  displayName: 'Caddyfile',
  scopeName: 'source.caddyfile',
  patterns: [
    {
      name: 'comment.line.number-sign.caddyfile',
      match: '#.*$'
    },
    {
      name: 'string.quoted.double.caddyfile',
      begin: '"',
      end: '"',
      patterns: [{ name: 'constant.character.escape.caddyfile', match: '\\\\.' }]
    },
    {
      name: 'constant.numeric.caddyfile',
      match: '\\b\\d+(\\.\\d+)?\\b'
    },
    {
      name: 'constant.language.boolean.caddyfile',
      match: '\\b(true|false|on|off)\\b'
    },
    {
      name: 'keyword.control.caddyfile',
      match: '\\b(order|route_warden|reverse_proxy|tls|respond|import|handle|handle_path|root|encode|log|rewrite|redir|header|request_header|basicauth|forward_auth|abort|error)\\b'
    },
    {
      name: 'entity.name.tag.caddyfile',
      match: '^[\\s]*([a-zA-Z0-9_.-]+)'
    }
  ]
}

export default defineConfig({
  title: 'RouteWarden',
  description: 'High-Performance Traefik Middleware for Sensitive Path Defense',
  base: '/docs/',
  cleanUrls: true,
  vite: {
    server: {
      host: true
    },
    plugins: [
      {
        name: 'redirect-root-to-docs',
        configureServer(server) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url === '/' || req.url === '') {
              res.writeHead(302, { Location: '/docs/' })
              res.end()
              return
            }
            if (req.url === '/favicon.ico') {
              res.writeHead(302, { Location: '/docs/favicon.ico' })
              res.end()
              return
            }
            next()
          })
        },
        configurePreviewServer(server) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url === '/' || req.url === '') {
              res.writeHead(302, { Location: '/docs/' })
              res.end()
              return
            }
            if (req.url === '/favicon.ico') {
              res.writeHead(302, { Location: '/docs/favicon.ico' })
              res.end()
              return
            }
            next()
          })
        }
      }
    ]
  },
  async buildEnd(siteConfig) {
    // Generate a fallback root index.html and 404.html redirecting to /docs/ if hosted at domain root
    // Dynamically import node modules via runtime loader to avoid TS static resolution errors when @types/node is not installed
    const importModule = (name: string) => new Function('n', 'return import(n)')(name)
    const fs = await importModule('node:fs')
    const path = await importModule('node:path')
    const outDir = siteConfig.outDir
    
    const rootRedirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Redirecting to RouteWarden Documentation...</title>
  <meta http-equiv="refresh" content="0; url=/docs/">
  <link rel="canonical" href="/docs/">
  <script>window.location.replace("/docs/" + window.location.search + window.location.hash);</script>
</head>
<body>
  <p>Redirecting to <a href="/docs/">RouteWarden Documentation</a>...</p>
</body>
</html>
`
    // If output dir exists, write root-redirect helper
    const targetFile = path.join(outDir, 'root-redirect.html')
    fs.writeFileSync(targetFile, rootRedirectHtml, 'utf8')
  },
  transformPageData(pageData) {
    // Provide version globally to markdown templates
    pageData.params = { ...pageData.params, version: versionData.version }
  },
  markdown: {
    languages: [
      caddyLanguage as any
    ],
    config(md) {
      const originalRender = md.render.bind(md)
      md.render = (src, env) => {
        let replaced = src.replace(/\{\{version\}\}/g, versionData.version)
        // Escape raw unescaped pipes and backslashes inside inline code spans (`...`) within markdown table lines
        // so that table columns are not prematurely split by regex alternation pipes (e.g. `(^|/)`)
        // and backslashes are not stripped by markdown HTML parsing
        replaced = replaced.replace(/^(\|.*?\|)$/gm, (tableLine) => {
          return tableLine.replace(/`([^`\r\n]+?)`/g, (_match, code) => {
            return '<code>' + code
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\\/g, '&#92;')
              .replace(/\|/g, '&#124;') + '</code>'
          })
        })
        return originalRender(replaced, env)
      }
    }
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/docs/icon.svg' }],
    ['link', { rel: 'alternate icon', type: 'image/x-icon', href: '/docs/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { name: 'author', content: 'RouteWarden Contributors' }],
    ['meta', { name: 'keywords', content: 'traefik, traefik plugin, middleware, security, anti-evasion, ip whitelist, sensitive files, env protection, reverse proxy waf' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'RouteWarden — High-Performance Traefik Middleware' }],
    ['meta', { property: 'og:description', content: 'Stop sensitive file leaks (.env, .git, backups), neutralize path evasion attacks, whitelist IPs, and challenge threats before requests reach your backend.' }],
    ['meta', { property: 'og:image', content: 'https://routewarden.github.io/docs/banner.png' }],
    ['meta', { property: 'og:url', content: 'https://routewarden.github.io/docs/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'RouteWarden — Traefik Security Middleware' }],
    ['meta', { name: 'twitter:description', content: 'Ultra-fast sensitive path defense, anti-evasion normalization, IP whitelisting, and multi-action responses for Traefik.' }],
    ['meta', { name: 'twitter:image', content: 'https://routewarden.github.io/docs/banner.png' }],
    // Cloudflare Web Analytics — only injected when the token secret is available at build time.
    // Omitting the script entirely when CF_ANALYTICS_TOKEN is empty avoids CORS rejections from
    // Cloudflare's RUM endpoint, which returns no Access-Control-Allow-Origin on invalid tokens.
    ...(CF_ANALYTICS_TOKEN ? [[
      'script' as const,
      {
        defer: '',
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': JSON.stringify({ token: CF_ANALYTICS_TOKEN })
      }
    ] as [string, Record<string, string>]] : [])
  ],
  themeConfig: {
    logo: '/icon.svg',
    siteTitle: 'RouteWarden',
    nav: [
      {
        text: 'Gateways',
        activeMatch: '^/(traefik|caddy|nginx|tcp)/',
        items: [
          { text: 'TCP Warden (L4 Proxy)', link: '/tcp/' },
          { text: 'Traefik Plugin', link: '/traefik/' },
          { text: 'Caddy Module', link: '/caddy/' },
          { text: 'NGINX & OpenResty', link: '/nginx/' }
        ]
      },
      {
        text: 'Core Engine',
        activeMatch: '^/core/',
        items: [
          { text: 'Architecture & Threat Model', link: '/core/architecture' },
          { text: 'Anti-Evasion Normalization', link: '/core/anti-evasion' },
          { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
          { text: 'Custom Regex Patterns', link: '/core/custom-patterns' }
        ]
      },
      {
        text: 'Solutions',
        activeMatch: '^/(examples|reference)/',
        items: [
          { text: 'Production Case Studies', link: '/examples/case-study-immich' },
          { text: 'Common Recipes & Compose', link: '/examples/basic-sensitive-files' },
          { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
          { text: 'Response Modes Reference', link: '/reference/response-modes' },
          { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
        ]
      },
      {
        text: 'Tools',
        activeMatch: '^/tools/',
        items: [
          { text: 'Pattern & Response Playground', link: '/tools/pattern-checker' },
          { text: 'RouteWarden CLI & Schema Portal', link: 'https://routewarden.github.io/cli/' }
        ]
      },
      {
        text: versionsRegistry.current,
        activeMatch: '^/v(0|1)\\.',
        items: [
          ...versionsRegistry.versions.map(v => ({ text: v.text, link: v.link })),
          { text: 'Changelog & Migrations', link: '/core/changelog' },
          { text: 'Traefik Plugin Catalog', link: 'https://plugins.traefik.io/plugins/6aae41dd5b5ee35d8bd24ca5/route-warden' }
        ]
      }
    ],
    sidebar: {
      '/tcp/': [
        {
          text: 'TCP Warden (L4 Proxy & Firewall)',
          collapsed: false,
          items: [
            { text: 'Overview & Architecture', link: '/tcp/' },
            { text: 'Getting Started & Docker', link: '/tcp/getting-started' },
            { text: 'Configuration Reference', link: '/tcp/configuration' },
            { text: 'Network & Firewall Integrations', link: '/tcp/network-integrations' },
            { text: 'Modular Protocol Plugins', link: '/tcp/plugins' },
            { text: 'Plugin Development Guide', link: '/tcp/plugin-development' },
            { text: 'CrowdSec Integration (Optional)', link: '/tcp/crowdsec' },
            { text: 'Management API & SSE', link: '/tcp/api' },
            { text: 'CLI Commands Reference', link: '/tcp/cli' },
            { text: 'Changelog & Releases', link: '/tcp/changelog' }
          ]
        },
        {
          text: 'Protocol Plugins Catalog',
          collapsed: false,
          items: [
            { text: 'SSH Guard', link: '/tcp/plugins/ssh' },
            { text: 'PostgreSQL Guard', link: '/tcp/plugins/postgres' },
            { text: 'MySQL & MariaDB Guard', link: '/tcp/plugins/mysql' },
            { text: 'Redis & Valkey Guard', link: '/tcp/plugins/redis' },
            { text: 'MongoDB Wire Guard', link: '/tcp/plugins/mongodb' },
            { text: 'HTTP & WebSocket Guard', link: '/tcp/plugins/http' },
            { text: 'TLS SNI Router & Filter', link: '/tcp/plugins/tls-sni' },
            { text: 'SMTP Mail Guard', link: '/tcp/plugins/smtp' },
            { text: 'POP3 Mail Guard', link: '/tcp/plugins/pop3' },
            { text: 'IMAP4 Mail Guard', link: '/tcp/plugins/imap' },
            { text: 'FTP Control Guard', link: '/tcp/plugins/ftp' },
            { text: 'LDAP & Active Directory', link: '/tcp/plugins/ldap' },
            { text: 'AMQP & RabbitMQ Guard', link: '/tcp/plugins/amqp' },
            { text: 'Memcached Cache Guard', link: '/tcp/plugins/memcached' },
            { text: 'MQTT IoT Broker Guard', link: '/tcp/plugins/mqtt' },
            { text: 'VNC Remote Desktop Guard', link: '/tcp/plugins/vnc' },
            { text: 'Minecraft Game Guard', link: '/tcp/plugins/minecraft' },
            { text: 'Generic Layer 4 Proxy', link: '/tcp/plugins/generic' },
            { text: 'Echo Stream Filter', link: '/tcp/plugins/echo-filter' }
          ]
        },
        {
          text: 'Gateways & Ecosystem',
          collapsed: false,
          items: [
            { text: 'Traefik Middleware', link: '/traefik/' },
            { text: 'Caddy Module', link: '/caddy/' },
            { text: 'NGINX & OpenResty', link: '/nginx/' },
            { text: 'Core Architecture', link: '/core/architecture' }
          ]
        }
      ],
      '/traefik/': [
        {
          text: 'Traefik Gateway',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/traefik/' },
            { text: 'Getting Started', link: '/traefik/getting-started' },
            { text: 'Configuration Reference', link: '/traefik/configuration' },
            { text: 'Local Deployment', link: '/traefik/local-deployment' },
            { text: 'Testing & Verification', link: '/traefik/testing' },
            { text: 'Recipes & Blueprints', link: '/traefik/examples' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Core Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' }
          ]
        }
      ],
      '/caddy/': [
        {
          text: 'Caddy Gateway',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/caddy/' },
            { text: 'Getting Started (xcaddy/Docker)', link: '/caddy/getting-started' },
            { text: 'Caddyfile Reference', link: '/caddy/caddyfile' },
            { text: 'JSON API Reference', link: '/caddy/json-api' },
            { text: 'Recipes & Blueprints', link: '/caddy/examples' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Site', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Core Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' }
          ]
        }
      ],
      '/nginx/': [
        {
          text: 'NGINX & OpenResty Gateway',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/nginx/' },
            { text: 'Getting Started (Docker/Lua)', link: '/nginx/getting-started' },
            { text: 'Configuration Reference', link: '/nginx/configuration' },
            { text: 'Recipes & Blueprints', link: '/nginx/examples' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Core Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' }
          ]
        }
      ],
      '/core/': [
        {
          text: 'Core Defense Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Normalization', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' },
            { text: 'RouteWarden CLI Portal ↗', link: 'https://routewarden.github.io/cli/' },
            { text: 'Changelog & Migrations', link: '/core/changelog' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Gateways',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin Docs ➔', link: '/traefik/' },
            { text: 'Caddy Module Docs ➔', link: '/caddy/' },
            { text: 'NGINX Module Docs ➔', link: '/nginx/' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/examples/overview' },
            { text: '1. Immich Dual-Router Shield', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'General Recipes',
          collapsed: false,
          items: [
            { text: '1. Basic Sensitive Files', link: '/examples/basic-sensitive-files' },
            { text: '2. Global EntryPoint Shield', link: '/examples/docker-compose-global' },
            { text: '3. Service-Level Compose', link: '/examples/docker-compose-service' },
            { text: '4. IP Whitelisting', link: '/examples/ip-whitelisting' },
            { text: '5. Captcha Challenge', link: '/examples/captcha' },
            { text: '6. Kubernetes IngressRoute', link: '/examples/kubernetes' }
          ]
        },
        {
          text: 'Gateways & Core',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin ➔', link: '/traefik/' },
            { text: 'Caddy Module ➔', link: '/caddy/' },
            { text: 'NGINX Module ➔', link: '/nginx/' },
            { text: 'Core Architecture ➔', link: '/core/architecture' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/examples/overview' },
            { text: '1. Immich Dual-Router Shield', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Gateways & Core',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin ➔', link: '/traefik/' },
            { text: 'Caddy Module ➔', link: '/caddy/' },
            { text: 'NGINX Module ➔', link: '/nginx/' },
            { text: 'Core Architecture ➔', link: '/core/architecture' }
          ]
        }
      ],
      '/tools/': [
        {
          text: 'Interactive Tools & Utilities',
          collapsed: false,
          items: [
            { text: 'Pattern & Response Playground', link: '/tools/pattern-checker' },
            { text: 'RouteWarden CLI Portal ↗', link: 'https://routewarden.github.io/cli/' }
          ]
        },
        {
          text: 'Gateways & Core',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin Docs ➔', link: '/traefik/' },
            { text: 'Caddy Module Docs ➔', link: '/caddy/' },
            { text: 'NGINX Module Docs ➔', link: '/nginx/' },
            { text: 'Core Architecture ➔', link: '/core/architecture' }
          ]
        }
      ],
      '/': [
        {
          text: 'Gateways',
          collapsed: false,
          items: [
            { text: 'RouteWarden for Traefik', link: '/traefik/' },
            { text: 'Caddy-Warden for Caddy', link: '/caddy/' },
            { text: 'RouteWarden for NGINX', link: '/nginx/' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Core Defense Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes Engine', link: '/core/response-modes' },
            { text: 'Custom Path Patterns', link: '/core/custom-patterns' },
            { text: 'Changelog & Migrations', link: '/core/changelog' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    notFound: {
      title: 'PAGE NOT FOUND',
      quote: 'RouteWarden caught an unmatched path or the resource has been moved.',
      linkLabel: 'Return to Documentation',
      linkText: 'Go to Home'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/routewarden' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 RouteWarden Contributors'
    }
  }
})
