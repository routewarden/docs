import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractCandidatePaths,
  isIpWhitelisted,
  matchRegex,
  escapeRegex,
  smartCompileRegex
} from '../docs/.vitepress/theme/components/playground/engine.ts'
import {
  DEFAULT_BLOCK_RULES,
  DEFAULT_ALLOW_RULES,
  PRESETS
} from '../docs/.vitepress/theme/components/playground/rules.ts'
import { generateGatewaySnippet } from '../docs/.vitepress/theme/components/playground/generator.ts'

test('playground engine: URL extraction & anti-evasion normalization', async (t) => {
  await t.test('handles empty input gracefully', () => {
    const res = extractCandidatePaths('')
    assert.equal(res.normalized, '/')
    assert.ok(res.candidates.includes('/'))
  })

  await t.test('decodes multi-layer percent encoding', () => {
    // Double encoded .. (%252e%252e) -> .. -> catches .env
    const res = extractCandidatePaths('/%252e%252e/.env')
    assert.ok(res.candidates.some(c => c.includes('../.env') || c.includes('/.env')))
    assert.ok(res.transformations.some(t => t.includes('percent-encoding')))
  })

  await t.test('strips semicolon matrix parameters', () => {
    const res = extractCandidatePaths('/app;jsessionid=12345/.env')
    assert.ok(res.candidates.some(c => c.includes('/app/.env') || c.includes('/.env')))
    assert.ok(res.transformations.some(t => t.includes('matrix params')))
  })

  await t.test('normalizes backslashes to forward slashes', () => {
    const res = extractCandidatePaths('\\admin\\config.json')
    assert.ok(res.candidates.some(c => c.startsWith('/admin/config.json')))
    assert.ok(res.transformations.some(t => t.includes('Converted \\ to /')))
  })

  await t.test('resolves directory traversal segments', () => {
    const res = extractCandidatePaths('/public/../.git/config')
    assert.ok(res.candidates.some(c => c === '/.git/config'))
    assert.ok(res.transformations.some(t => t.includes('traversal')))
  })

  await t.test('extracts query string when checkQuery is enabled', () => {
    const res = extractCandidatePaths('/search?q=.env', true)
    assert.equal(res.rawQuery, 'q=.env')
    assert.ok(res.candidates.some(c => c.includes('.env')))
  })
})

test('playground engine: regex matching & wildcards', async (t) => {
  await t.test('matches exact regex and case-insensitive (?i)', () => {
    assert.ok(matchRegex('(?i)^/\\.env', '/.ENV'))
    assert.ok(matchRegex('(?i)^/\\.env', '/.env.production'))
    assert.ok(!matchRegex('^/\\.env', '/.ENV'))
  })

  await t.test('expands wildcards * to .* cleanly', () => {
    assert.ok(matchRegex('/admin/*', '/admin/users/edit'))
    assert.ok(matchRegex('*.sql', '/backups/db.sql'))
  })

  await t.test('handles invalid regex gracefully without throwing', () => {
    assert.equal(matchRegex('[unclosed-bracket', '/test'), false)
  })
})

test('playground engine: smartCompileRegex heuristics', async (t) => {
  await t.test('compiles wildcard extensions (*.sql, *.bak)', () => {
    const rx = smartCompileRegex('*.sql')
    assert.ok(matchRegex(rx, '/db/dump.sql'))
    assert.ok(!matchRegex(rx, '/db/dump.sql.safe'))
  })

  await t.test('compiles hidden dotfiles (.env)', () => {
    const rx = smartCompileRegex('.env')
    assert.ok(matchRegex(rx, '/.env'))
    assert.ok(matchRegex(rx, '/sub/.env'))
  })

  await t.test('compiles directory wildcards (/admin/*)', () => {
    const rx = smartCompileRegex('/admin/*')
    assert.ok(matchRegex(rx, '/admin/settings'))
  })
})

test('playground engine: isIpWhitelisted CIDR & exact matching', async (t) => {
  await t.test('matches exact IP', () => {
    assert.ok(isIpWhitelisted('10.0.0.5', '192.168.1.1, 10.0.0.5'))
    assert.ok(!isIpWhitelisted('10.0.0.6', '192.168.1.1, 10.0.0.5'))
  })

  await t.test('matches CIDR subnets (e.g. /24, /16)', () => {
    assert.ok(isIpWhitelisted('192.168.1.42', '192.168.1.0/24'))
    assert.ok(!isIpWhitelisted('192.168.2.1', '192.168.1.0/24'))
    assert.ok(isIpWhitelisted('10.5.20.1', '10.5.0.0/16'))
  })

  await t.test('returns false for empty input or empty whitelist', () => {
    assert.equal(isIpWhitelisted('', '192.168.1.0/24'), false)
    assert.equal(isIpWhitelisted('192.168.1.1', ''), false)
  })
})

test('playground generator: generateGatewaySnippet', async (t) => {
  const baseOpts = {
    snippetFormat: 'traefik_yaml',
    enabled: true,
    debug: false,
    securityLog: true,
    enableDefaultPatterns: false,
    enableDefaultAllowPatterns: false,
    checkQuery: false,
    blockList: ['(?i)^/admin'],
    allowList: ['(?i)^/\\.well-known'],
    ipList: ['10.0.0.0/8'],
    methodsList: [],
    hasCustomMethods: false,
    responseMode: 'json',
    statusCode: 403,
    customBody: '{"error":"Blocked"}',
    redirectUrl: 'https://example.com/blocked',
    proxyUrl: 'http://honeypot:8080',
    gzipBombMB: 10,
    tarpitDelayMs: 5000,
    tarpitMaxDurationSeconds: 30,
    retryAfterSeconds: 60,
    streamSizeMB: 100,
    captchaProvider: 'turnstile',
    captchaSiteKey: '0x4AAAAAA',
    captchaTitle: 'Verify you are human',
    testMethod: 'GET',
    testPath: '/.env',
    testIp: '198.51.100.42'
  }

  await t.test('generates valid Traefik YAML configuration snippet', () => {
    const yaml = generateGatewaySnippet({ ...baseOpts, snippetFormat: 'traefik_yaml' })
    assert.ok(yaml.includes('plugin:'))
    assert.ok(yaml.includes('routewarden:'))
    assert.ok(yaml.includes('enableDefaultPatterns: false'))
  })

  await t.test('generates valid Caddy Caddyfile snippet', () => {
    const caddy = generateGatewaySnippet({ ...baseOpts, snippetFormat: 'caddy' })
    assert.ok(caddy.includes('route_warden'))
    assert.ok(caddy.includes('enable_default_patterns false'))
  })

  await t.test('generates valid Nginx Lua snippet', () => {
    const nginx = generateGatewaySnippet({ ...baseOpts, snippetFormat: 'nginx' })
    assert.ok(nginx.includes('resty.routewarden'))
    assert.ok(nginx.includes('enable_default_patterns = false'))
  })

  await t.test('generates CLI test command and JSON config', () => {
    const cliCmd = generateGatewaySnippet({ ...baseOpts, snippetFormat: 'cli_cmd' })
    assert.ok(cliCmd.includes('rwarden test'))
    assert.ok(cliCmd.includes('/.env'))

    const cliJson = generateGatewaySnippet({ ...baseOpts, snippetFormat: 'cli_json' })
    const parsed = JSON.parse(cliJson)
    assert.equal(parsed.enabled, true)
    assert.equal(parsed.response.mode, 'json')
  })
})
