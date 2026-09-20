import { defineConfig } from 'vitepress'
import versionData from '../version.json' with { type: 'json' }
import versionsRegistry from '../versions.json' with { type: 'json' }

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
    ['meta', { name: 'twitter:image', content: 'https://routewarden.github.io/docs/banner.png' }]
  ],
  themeConfig: {
    logo: '/icon.svg',
    siteTitle: 'RouteWarden',
    nav: [
      {
        text: 'Gateways',
        activeMatch: '^/(traefik|caddy|nginx)/',
        items: [
          { text: 'Traefik Plugin', link: '/traefik/' },
          { text: 'Caddy Module', link: '/caddy/' },
          { text: 'NGINX & OpenResty', link: '/nginx/' }
        ]
      },
      {
        text: 'Core Engine',
        link: '/core/architecture',
        activeMatch: '^/core/'
      },

      {
        text: 'Case Studies',
        link: '/examples/case-study-immich',
        activeMatch: '^/examples/'
      },
      {
        text: versionsRegistry.current,
        activeMatch: '^/v(0|1)\\.',
        items: [
          ...versionsRegistry.versions.map(v => ({ text: v.text, link: v.link })),
          { text: 'Changelog', link: '/core/changelog' },
          { text: 'Traefik Plugin Catalog', link: 'https://plugins.traefik.io' }
        ]
      }
    ],
    sidebar: {
      '/v0.3/': [
        {
          text: 'RouteWarden v0.3.x',
          collapsed: false,
          items: [
            { text: 'Traefik Gateway (v0.3.x)', link: '/v0.3/traefik/getting-started' },
            { text: 'Traefik Config (v0.3.x)', link: '/v0.3/traefik/configuration' },
            { text: 'Caddy Gateway (v0.3.x)', link: '/v0.3/caddy/getting-started' },
            { text: 'Caddyfile Reference (v0.3.x)', link: '/v0.3/caddy/caddyfile' },
            { text: 'Core Architecture (v0.3.x)', link: '/v0.3/core/architecture' },
            { text: 'Response Modes (v0.3.x)', link: '/v0.3/core/response-modes' },
            { text: 'Custom Patterns (v0.3.x)', link: '/v0.3/core/custom-patterns' },
            { text: 'Switch to Latest (v1.0.x) ➔', link: '/traefik/getting-started' }
          ]
        }
      ],
      '/v0.2/': [
        {
          text: 'RouteWarden v0.2.x',
          collapsed: false,
          items: [
            { text: 'Traefik Gateway (v0.2.x)', link: '/v0.2/traefik/getting-started' },
            { text: 'Traefik Config (v0.2.x)', link: '/v0.2/traefik/configuration' },
            { text: 'Caddy Gateway (v0.2.x)', link: '/v0.2/caddy/getting-started' },
            { text: 'Caddyfile Reference (v0.2.x)', link: '/v0.2/caddy/caddyfile' },
            { text: 'Core Architecture (v0.2.x)', link: '/v0.2/core/architecture' },
            { text: 'Response Modes (v0.2.x)', link: '/v0.2/core/response-modes' },
            { text: 'Switch to Latest (v1.0.x) ➔', link: '/traefik/getting-started' }
          ]
        }
      ],
      '/v0.1/': [
        {
          text: 'RouteWarden v0.1.x',
          collapsed: false,
          items: [
            { text: 'Overview & Setup (v0.1.x)', link: '/v0.1/guide/getting-started' },
            { text: 'Configuration (v0.1.x)', link: '/v0.1/reference/configuration' },
            { text: 'Switch to Latest (v1.0.x) ➔', link: '/traefik/getting-started' }
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
