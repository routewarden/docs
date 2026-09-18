<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// --- Built-in Rule Definitions (RouteWarden Go Core RE2 Regexes) ---
interface BuiltInRule {
  id: string
  pattern: string
  category: string
  description: string
}

const defaultBlockRules: BuiltInRule[] = [
  {
    id: 'block-env',
    pattern: '(?i)(^|/)(\\.env.*|.*\\.(txt|log|bak|backup|sql|conf|config|ini|yaml|yml))$',
    category: 'Environment & Configs',
    description: '.env, .env.production, .txt, .log, .bak, .backup, .sql, .conf, .config, .ini, .yaml, .yml'
  },
  {
    id: 'block-vcs',
    pattern: '(?i)(^|/)\\.(git|svn|hg|bzr|cvs)(/.*|$)',
    category: 'Source Control & VCS',
    description: '.git, .svn, .hg, .bzr, .cvs directories and files'
  },
  {
    id: 'block-cloud',
    pattern: '(?i)(^|/)\\.(aws|ssh|kube|docker)(/.*|$)',
    category: 'Cloud & Shell Keys',
    description: '.aws credentials, .ssh private keys, .kube configs, .docker tokens'
  },
  {
    id: 'block-archives',
    pattern: '(?i).*\\.(tar|tar\\.gz|tgz|zip|rar|7z|gz|bz2|iso|dump|sqlite|sqlite3|db)$',
    category: 'Archives & DB Dumps',
    description: '.tar, .zip, .gz, .dump, .sqlite, .sqlite3, .db database backups'
  },
  {
    id: 'block-admin',
    pattern: '(?i)(^|/)(phpinfo\\.php|info\\.php|server-status|server-info|actuator(/.*)?|metrics|heapdump|trace|env)$',
    category: 'Admin & Metrics Probing',
    description: 'phpinfo, server-status, Spring Boot actuator, heapdump, prometheus metrics'
  },
  {
    id: 'block-packages',
    pattern: '(?i)(^|/)(composer\\.(json|lock)|package-lock\\.json|yarn\\.lock|pnpm-lock\\.yaml|Pipfile|Pipfile\\.lock|requirements\\.txt)$',
    category: 'Package Locks & Manifests',
    description: 'package-lock.json, yarn.lock, composer.lock, requirements.txt, Pipfile'
  }
]

const defaultAllowRules: BuiltInRule[] = [
  {
    id: 'allow-robots',
    pattern: '(?i)^/robots\\.txt$',
    category: 'Robots.txt',
    description: 'Allows search engine crawlers to fetch robots.txt'
  },
  {
    id: 'allow-sitemap',
    pattern: '(?i)^/sitemap.*\\.xml$',
    category: 'Sitemaps',
    description: 'Allows sitemap.xml and sitemap_index.xml discovery'
  },
  {
    id: 'allow-ads',
    pattern: '(?i)^/ads\\.txt$',
    category: 'Ads.txt',
    description: 'Authorized digital advertising seller declarations'
  },
  {
    id: 'allow-security',
    pattern: '(?i)^/security\\.txt$',
    category: 'Security.txt',
    description: 'RFC 9116 security researcher reporting endpoint'
  },
  {
    id: 'allow-wellknown',
    pattern: '(?i)^/\\.well-known(/.*)?$',
    category: '.well-known',
    description: "Let's Encrypt TLS challenges and OpenID configuration"
  }
]

// 1. Input state
const testMethod = ref('GET')
const testPath = ref('/%252e%252e/.env')
const testIp = ref('198.51.100.42')

// 2. Patterns state
const pathPatternsInput = ref('')
const allowPatternsInput = ref('')
const newBlockInput = ref('')
const newAllowInput = ref('')

// 3. Flags state
const enabled = ref(true)
const enableDefaultPatterns = ref(true)
const enableDefaultAllowPatterns = ref(true)
const checkQuery = ref(false)
const allowedIpsInput = ref('127.0.0.1, 10.0.0.0/8')
const methodsInput = ref('GET')

const standardMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const

const inspectedMethods = computed(() => {
  const raw = methodsInput.value.trim()
  if (!raw) return ['GET']
  return raw.split(/[,\s]+/).map(m => m.trim().toUpperCase()).filter(Boolean)
})

function toggleInspectedMethod(m: string) {
  const current = inspectedMethods.value.slice()
  const idx = current.indexOf(m)
  if (idx >= 0) {
    if (current.length === 1) {
      // Keep at least GET rather than an empty list
      methodsInput.value = 'GET'
    } else {
      current.splice(idx, 1)
      methodsInput.value = current.join(', ')
    }
  } else {
    current.push(m)
    methodsInput.value = current.join(', ')
  }
}

const allStandardMethodsSelected = computed(() => {
  return standardMethods.every(m => inspectedMethods.value.includes(m))
})

function toggleAllMethods() {
  if (allStandardMethodsSelected.value) {
    methodsInput.value = 'GET'
  } else {
    methodsInput.value = standardMethods.join(', ')
  }
}

// 4. Response state
type ResponseMode =
  | 'json'
  | 'html'
  | 'text'
  | 'xml'
  | 'redirect'
  | 'captcha'
  | 'silentDrop'
  | 'gzipBomb'
  | 'tarpit'
  | 'fakeSuccess'
  | 'rateLimitChallenge'
  | 'proxy'
  | 'infiniteStream'

const responseMode = ref<ResponseMode>('json')
const statusCode = ref(403)
const customBody = ref('')
const redirectUrl = ref('https://honeypot.example.com/sinkhole')
const proxyUrl = ref('http://honeypot-internal:8080')
const captchaProvider = ref<'turnstile' | 'hcaptcha' | 'recaptcha'>('turnstile')
const captchaSiteKey = ref('0x4AAAAAAtestkey123')
const captchaTitle = ref('Security Verification Required')
const gzipBombMB = ref(10)
const retryAfterSeconds = ref(300)
const tarpitDelayMs = ref(1000)
const tarpitMaxDurationSeconds = ref(60)
const streamSizeMB = ref(50)

// 5. Snippet format
const snippetFormat = ref<'caddy' | 'traefik_yaml' | 'traefik_toml' | 'docker' | 'k8s_traefik' | 'k8s_caddy' | 'k8s'>('caddy')
const copySuccess = ref(false)

// Presets
const presets = [
  { label: '.env', method: 'GET', path: '/%252e%252e/.env', ip: '198.51.100.42' },
  { label: '.git', method: 'GET', path: '/static;p=1/.git/config', ip: '198.51.100.42' },
  { label: 'db.sql', method: 'GET', path: '\\backups\\db.sql%00', ip: '198.51.100.42' },
  { label: 'phpinfo', method: 'GET', path: '/phpinfo.php', ip: '198.51.100.42' },
  { label: 'POST Bypass', method: 'POST', path: '/.env', ip: '198.51.100.42' },
  { label: 'robots.txt', method: 'GET', path: '/robots.txt', ip: '198.51.100.42' },
  { label: '.well-known', method: 'GET', path: '/.well-known/acme-challenge/token', ip: '198.51.100.42' },
  { label: 'IP Bypass', method: 'GET', path: '/.env', ip: '10.5.0.25' }
]

function applyPreset(p: { path: string; ip: string; method?: string }) {
  testPath.value = p.path
  testIp.value = p.ip
  if (p.method) testMethod.value = p.method
}

// Anti-Evasion Normalization & Candidate Extraction
interface CandidateExtractionResult {
  normalized: string
  candidates: string[]
  rawPathOnly: string
  rawQuery: string
  transformations: string[]
}

function extractCandidatePaths(rawPath: string, shouldCheckQuery = false): CandidateExtractionResult {
  const transformations: string[] = []
  const candidatesSet = new Set<string>()

  let input = (rawPath || '').trim()
  if (!input) {
    return {
      normalized: '/',
      candidates: ['/'],
      rawPathOnly: '/',
      rawQuery: '',
      transformations: ['Empty path resolved to /']
    }
  }

  // 1. Separate path and query string
  let pathPart = input
  let queryPart = ''
  const qIdx = input.indexOf('?')
  if (qIdx >= 0) {
    pathPart = input.substring(0, qIdx)
    queryPart = input.substring(qIdx + 1)
    transformations.push(`Separated query string: ?${queryPart}`)
  }

  if (!pathPart.startsWith('/')) {
    pathPart = '/' + pathPart
  }

  candidatesSet.add(pathPart)

  // 2. Multi-layer URL decoding
  let prev = pathPart
  let passes = 0
  while (passes < 5) {
    try {
      const unescaped = decodeURIComponent(prev)
      if (unescaped === prev) break
      prev = unescaped
      passes++
    } catch {
      break
    }
  }
  if (passes > 0) {
    transformations.push(`Decoded ${passes} layer(s) percent-encoding`)
    candidatesSet.add(prev)
  }

  let working = prev

  // 3. Null bytes stripping
  if (working.includes('\0') || working.includes('%00')) {
    working = working.replace(/\0|%00/gi, '')
    transformations.push('Stripped null bytes (\\x00 / %00)')
    candidatesSet.add(working)
  }

  // 4. Backslash conversion
  if (working.includes('\\')) {
    working = working.replace(/\\/g, '/')
    transformations.push('Converted \\ to /')
    candidatesSet.add(working)
  }

  // 5. Matrix parameters stripping
  if (working.includes(';')) {
    const withoutMatrix = working.replace(/;[^/]+/g, '')
    transformations.push('Stripped matrix params (;...)')
    candidatesSet.add(withoutMatrix)
    working = withoutMatrix
  }

  // 6. Canonical traversal resolution
  const segments = working.split('/').filter(s => s.length > 0 && s !== '.')
  const resolved: string[] = []
  let traversalDetected = false

  for (const seg of segments) {
    if (seg === '..') {
      traversalDetected = true
      resolved.pop()
    } else {
      resolved.push(seg)
    }
  }

  if (traversalDetected) {
    transformations.push('Canonicalized traversal (/../)')
  }

  const canonical = '/' + resolved.join('/')
  candidatesSet.add(canonical)

  // 7. Query candidates if checkQuery is active
  if (shouldCheckQuery && queryPart) {
    candidatesSet.add(input)
    candidatesSet.add(`${canonical}?${queryPart}`)
    candidatesSet.add(queryPart)
    try {
      const decodedQuery = decodeURIComponent(queryPart)
      if (decodedQuery !== queryPart) {
        candidatesSet.add(decodedQuery)
        candidatesSet.add(`${canonical}?${decodedQuery}`)
      }
    } catch {}
  }

  const candidates = Array.from(candidatesSet).filter(Boolean)
  return {
    normalized: canonical,
    candidates,
    rawPathOnly: pathPart,
    rawQuery: queryPart,
    transformations
  }
}

function normalizePath(rawPath: string): { normalized: string; transformations: string[]; candidates: string[] } {
  const res = extractCandidatePaths(rawPath, checkQuery.value)
  return {
    normalized: res.normalized,
    transformations: res.transformations,
    candidates: res.candidates
  }
}

function isIpWhitelisted(ip: string, allowedListStr: string): boolean {
  if (!ip || !allowedListStr) return false
  const clientIp = ip.trim()
  const entries = allowedListStr.split(',').map(s => s.trim()).filter(Boolean)

  for (const entry of entries) {
    if (entry === clientIp) return true
    if (entry.includes('/')) {
      const [subnet, bitsStr] = entry.split('/')
      const bits = parseInt(bitsStr, 10)
      if (!isNaN(bits) && subnet && clientIp) {
        if (ipInSubnet(clientIp, subnet, bits)) return true
      }
    }
  }
  return false
}

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(p => parseInt(p, 10))
  if (parts.length !== 4 || parts.some(isNaN)) return 0
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function ipInSubnet(ip: string, subnet: string, maskBits: number): boolean {
  try {
    const ipNum = ipToLong(ip)
    const subnetNum = ipToLong(subnet)
    const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0
    return (ipNum & mask) === (subnetNum & mask)
  } catch {
    return false
  }
}

function matchRegex(pattern: string, str: string): boolean {
  try {
    let clean = pattern.trim()
    let flags = ''
    if (clean.startsWith('(?i)')) {
      flags += 'i'
      clean = clean.slice(4)
    }
    // Replace unescaped wildcard * with regex .* when not already preceded by . or \
    clean = clean.replace(/(?<![.\\])\*/g, '.*')
    const rx = new RegExp(clean, flags)
    return rx.test(str)
  } catch {
    return false
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Smart RE2 pattern compiler
function smartCompileRegex(input: string): string {
  const raw = input.trim()
  if (!raw) return ''

  // If already a regex starting with (?i), ^, or ending with $
  if (raw.startsWith('(?i)') || raw.startsWith('^') || raw.endsWith('$')) {
    return raw.replace(/(?<![.\\])\*/g, '.*')
  }

  // Exact asterisk wildcard alone
  if (raw === '*') {
    return '.*'
  }

  // File extension wildcard: e.g. *.sql or *.sql, *.bak or *.php
  if (raw.startsWith('*.') || (/^[a-zA-Z0-9_-]+(,\s*[a-zA-Z0-9_-]+)*$/.test(raw) && !raw.includes('/'))) {
    const exts = raw.split(/[\s,]+/).map(e => e.replace(/^\*\.?|^\./, '').trim()).filter(Boolean)
    if (exts.length > 0) {
      const escaped = exts.map(escapeRegex).join('|')
      return `(?i).*\\.(${escaped})$`
    }
  }

  // Hidden/dot files without slashes: e.g. .env or .git
  if (raw.startsWith('.') && !raw.includes('/')) {
    const clean = escapeRegex(raw)
    return `(?i)(^|/)${clean}(/.*|$)`
  }

  // Wildcard patterns containing * (e.g. /admin/*, /*, /api/*/export, .well-known/*, db*.sql, etc.)
  if (raw.includes('*')) {
    // Escape regex characters except '*'
    const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Replace '*' with regex '.*'
    const withDotStar = escaped.replace(/(?<![.\\])\*/g, '.*')
    if (withDotStar.startsWith('/')) {
      return `(?i)^${withDotStar}$`
    } else if (withDotStar.startsWith('\\.')) {
      return `(?i)(^|/)${withDotStar}$`
    } else {
      return `(?i).*${withDotStar}$`
    }
  }

  // Exact file with extension (e.g. /phpinfo.php or favicon.ico)
  if (/\.[a-zA-Z0-9]{1,6}$/.test(raw)) {
    if (raw.startsWith('/')) {
      const escaped = escapeRegex(raw)
      return `(?i)^${escaped}$`
    } else {
      const escaped = escapeRegex(raw)
      return `(?i)(^|/)${escaped}$`
    }
  }

  const clean = raw.startsWith('/') ? raw : '/' + raw
  const base = clean.replace(/\/+$/, '')
  const escaped = escapeRegex(base)
  return `(?i)^${escaped}(/.*)?$`
}

const customBlockList = computed(() => {
  return pathPatternsInput.value.split('\n').map(s => s.trim()).filter(Boolean)
})

const customAllowList = computed(() => {
  return allowPatternsInput.value.split('\n').map(s => s.trim()).filter(Boolean)
})

function addNewBlockPattern() {
  const pat = smartCompileRegex(newBlockInput.value)
  if (!pat) return
  if (!customBlockList.value.includes(pat)) {
    pathPatternsInput.value = customBlockList.value.length ? `${pathPatternsInput.value.trim()}\n${pat}` : pat
  }
  newBlockInput.value = ''
}

function removeBlockPattern(index: number) {
  const lines = customBlockList.value.slice()
  lines.splice(index, 1)
  pathPatternsInput.value = lines.join('\n')
}

function addNewAllowPattern() {
  const pat = smartCompileRegex(newAllowInput.value)
  if (!pat) return
  if (!customAllowList.value.includes(pat)) {
    allowPatternsInput.value = customAllowList.value.length ? `${allowPatternsInput.value.trim()}\n${pat}` : pat
  }
  newAllowInput.value = ''
}

function removeAllowPattern(index: number) {
  const lines = customAllowList.value.slice()
  lines.splice(index, 1)
  allowPatternsInput.value = lines.join('\n')
}

// Evaluation pipeline
interface VerbEvalResult {
  method: string
  verdict: 'BLOCK' | 'ALLOW' | 'BYPASS' | 'PASS' | 'DISABLED'
  statusTitle: string
  badgeClass: string
  statusCode: number
  statusText: string
  reason: string
  isInspected: boolean
}

function evaluateForVerb(methodName: string): VerbEvalResult {
  const m = (methodName || 'GET').trim().toUpperCase()
  const isInspected = inspectedMethods.value.includes(m)

  if (!enabled.value) {
    return {
      method: m,
      verdict: 'DISABLED',
      statusTitle: 'Bypassed (RouteWarden disabled)',
      badgeClass: 'verdict-pass',
      statusCode: 200,
      statusText: 'OK (Downstream)',
      reason: 'Middleware is disabled.',
      isInspected
    }
  }

  if (!isInspected) {
    return {
      method: m,
      verdict: 'BYPASS',
      statusTitle: `Bypassed by Verb (${m})`,
      badgeClass: 'verdict-bypass',
      statusCode: 200,
      statusText: 'OK (Passthrough)',
      reason: `HTTP method ${m} is not in inspected methods [${inspectedMethods.value.join(', ')}].`,
      isInspected
    }
  }

  if (isIpWhitelisted(testIp.value, allowedIpsInput.value)) {
    return {
      method: m,
      verdict: 'BYPASS',
      statusTitle: `Bypassed by IP (${testIp.value})`,
      badgeClass: 'verdict-bypass',
      statusCode: 200,
      statusText: 'OK (IP Whitelisted)',
      reason: `Client IP ${testIp.value} matches allowedIps.`,
      isInspected
    }
  }

  const norm = normalizePath(testPath.value)
  const candidatePaths = norm.candidates.length > 0 ? norm.candidates : [norm.normalized]

  // 4. Allowlist / Allow Patterns Check (allow_patterns / enable_default_allow_patterns)
  // If any candidate path matches an allow pattern, RouteWarden immediately passes the request
  // through to the backend (next.ServeHTTP) and stops all further processing (short-circuit).
  if (enableDefaultAllowPatterns.value) {
    for (const rule of defaultAllowRules) {
      for (const cand of candidatePaths) {
        if (matchRegex(rule.pattern, cand)) {
          return {
            method: m,
            verdict: 'ALLOW',
            statusTitle: `Allowed (${rule.category})`,
            badgeClass: 'verdict-allow',
            statusCode: 200,
            statusText: 'OK (Safe Exemption)',
            reason: cand !== norm.normalized
              ? `Matches safe rule: ${rule.pattern} on candidate path '${cand}'`
              : `Matches safe rule: ${rule.pattern}`,
            isInspected
          }
        }
      }
    }
  }

  for (const pat of customAllowList.value) {
    for (const cand of candidatePaths) {
      if (matchRegex(pat, cand)) {
        return {
          method: m,
          verdict: 'ALLOW',
          statusTitle: 'Allowed by allowPatterns',
          badgeClass: 'verdict-allow',
          statusCode: 200,
          statusText: 'OK (Safe Override)',
          reason: cand !== norm.normalized
            ? `Matches custom rule: ${pat} on candidate path '${cand}'`
            : `Matches custom rule: ${pat}`,
          isInspected
        }
      }
    }
  }

  const rawCode = statusCode.value || 403
  let finalCode = rawCode
  let finalStatusText = 'Forbidden'

  if (responseMode.value === 'redirect') {
    finalCode = 302
    finalStatusText = 'Found (Redirect)'
  } else if (responseMode.value === 'rateLimitChallenge') {
    finalCode = 429
    finalStatusText = 'Too Many Requests'
  } else if (responseMode.value === 'fakeSuccess') {
    finalCode = 200
    finalStatusText = 'OK (Decoy)'
  } else if (responseMode.value === 'silentDrop') {
    finalCode = 0
    finalStatusText = 'TCP Reset'
  }

  // 5. Blocklist Check (block_patterns / path_patterns / enable_default_patterns)
  // Only evaluated if the request was NOT matched by any allow pattern.
  if (enableDefaultPatterns.value) {
    for (const rule of defaultBlockRules) {
      for (const cand of candidatePaths) {
        if (matchRegex(rule.pattern, cand)) {
          return {
            method: m,
            verdict: 'BLOCK',
            statusTitle: `Blocked (${rule.category})`,
            badgeClass: 'verdict-block',
            statusCode: finalCode,
            statusText: finalStatusText,
            reason: cand !== norm.normalized
              ? `Matches built-in pattern: ${rule.pattern} on candidate path '${cand}'`
              : `Matches built-in pattern: ${rule.pattern}`,
            isInspected
          }
        }
      }
    }
  }

  for (const pat of customBlockList.value) {
    for (const cand of candidatePaths) {
      if (matchRegex(pat, cand)) {
        return {
          method: m,
          verdict: 'BLOCK',
          statusTitle: 'Blocked by pathPatterns',
          badgeClass: 'verdict-block',
          statusCode: finalCode,
          statusText: finalStatusText,
          reason: cand !== norm.normalized
            ? `Matches custom pattern: ${pat} on candidate path '${cand}'`
            : `Matches custom pattern: ${pat}`,
          isInspected
        }
      }
    }
  }

  return {
    method: m,
    verdict: 'PASS',
    statusTitle: 'Allowed (Clean Request)',
    badgeClass: 'verdict-pass',
    statusCode: 200,
    statusText: 'OK (Clean Request)',
    reason: 'No patterns matched.',
    isInspected
  }
}

const evaluation = computed(() => {
  const norm = normalizePath(testPath.value)
  const res = evaluateForVerb(testMethod.value)
  return {
    ...res,
    normalizedPath: norm.normalized,
    transformations: norm.transformations,
    candidates: norm.candidates
  }
})

const verbEvaluations = computed(() => {
  const allMethods = Array.from(new Set([...standardMethods, ...inspectedMethods.value]))
  return allMethods.map(m => evaluateForVerb(m))
})

const blockRegexGenerated = ref(false)
const allowRegexGenerated = ref(false)

const isBlockRegexDisabled = computed(() => {
  return !newBlockInput.value.trim() && (!testPath.value.trim() || testPath.value.trim() === '/')
})

const isAllowRegexDisabled = computed(() => {
  return !newAllowInput.value.trim() && (!testPath.value.trim() || testPath.value.trim() === '/')
})

function generateBlockRegex() {
  // Pull from newBlockInput if typed, otherwise auto-generate from the top URL input!
  const source = newBlockInput.value.trim() || evaluation.value.normalizedPath || testPath.value.trim()
  if (!source || source === '/') return
  const compiled = smartCompileRegex(source)
  if (compiled) {
    newBlockInput.value = compiled
    blockRegexGenerated.value = true
    setTimeout(() => {
      blockRegexGenerated.value = false
    }, 2500)
  }
}

function generateAllowRegex() {
  // Pull from newAllowInput if typed, otherwise auto-generate from the top URL input!
  const source = newAllowInput.value.trim() || evaluation.value.normalizedPath || testPath.value.trim()
  if (!source || source === '/') return
  const compiled = smartCompileRegex(source)
  if (compiled) {
    newAllowInput.value = compiled
    allowRegexGenerated.value = true
    setTimeout(() => {
      allowRegexGenerated.value = false
    }, 2500)
  }
}

function patternMatchesTest(pattern: string): boolean {
  const cands = evaluation.value.candidates || [evaluation.value.normalizedPath]
  for (const c of cands) {
    if (matchRegex(pattern, c)) return true
  }
  return false
}

// Simulated Response
const simulatedResponse = computed(() => {
  const ev = evaluation.value

  if (ev.verdict === 'BYPASS' && !inspectedMethods.value.includes(testMethod.value.toUpperCase())) {
    return {
      statusCode: 200,
      statusText: 'OK (Upstream Passthrough)',
      headers: {
        'Server': 'upstream-backend',
        'X-RouteWarden-Inspected': 'false',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 200,
        message: `HTTP verb ${testMethod.value} is not in inspected methods [${inspectedMethods.value.join(', ')}].`,
        note: 'Request bypassed RouteWarden inspection and was forwarded to upstream backend.',
        path: testPath.value
      }, null, 2),
      note: `HTTP verb ${testMethod.value} is not in inspected methods. RouteWarden immediately passed this request through to the backend service.`
    }
  }

  if (ev.verdict === 'PASS' || ev.verdict === 'ALLOW' || ev.verdict === 'BYPASS' || ev.verdict === 'DISABLED') {
    return {
      statusCode: 200,
      statusText: 'OK (Downstream App)',
      headers: {
        'Server': 'RouteWarden / Upstream App',
        'X-RouteWarden-Verdict': ev.verdict,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Request permitted downstream', path: testPath.value, verdict: ev.verdict }, null, 2),
      note: 'RouteWarden permitted this request to pass downstream.'
    }
  }

  const code = statusCode.value || 403
  const headers: Record<string, string> = {
    'Server': 'RouteWarden',
    'X-RouteWarden-Blocked': 'true',
    'X-Content-Type-Options': 'nosniff'
  }

  if (responseMode.value === 'json') {
    headers['Content-Type'] = 'application/json; charset=utf-8'
    const body = customBody.value || JSON.stringify({ error: 'Forbidden', status: code, message: 'Access denied by RouteWarden security policy' }, null, 2)
    return { statusCode: code, statusText: 'Forbidden', headers, body }
  }

  if (responseMode.value === 'text') {
    headers['Content-Type'] = 'text/plain; charset=utf-8'
    return { statusCode: code, statusText: 'Forbidden', headers, body: customBody.value || 'Forbidden: Access denied by RouteWarden' }
  }

  if (responseMode.value === 'html') {
    headers['Content-Type'] = 'text/html; charset=utf-8'
    return { statusCode: code, statusText: 'Forbidden', headers, body: customBody.value || `<!DOCTYPE html>\n<html>\n<head><title>403 Forbidden</title></head>\n<body><h1>403 Forbidden</h1><p>Access denied by RouteWarden.</p></body>\n</html>` }
  }

  if (responseMode.value === 'xml') {
    headers['Content-Type'] = 'application/xml; charset=utf-8'
    return { statusCode: code, statusText: 'Forbidden', headers, body: customBody.value || `<?xml version="1.0" encoding="UTF-8"?>\n<error>\n  <code>${code}</code>\n  <message>Access Denied</message>\n</error>` }
  }

  if (responseMode.value === 'redirect') {
    headers['Location'] = redirectUrl.value
    return {
      statusCode: 302,
      statusText: 'Found (Redirect)',
      headers,
      body: `Redirecting to ${redirectUrl.value}...`,
      note: 'Client is redirected away to sinkhole or warning URL.'
    }
  }

  if (responseMode.value === 'proxy') {
    headers['X-RouteWarden-Honeypot-Proxy'] = proxyUrl.value
    return {
      statusCode: 200,
      statusText: 'OK (Proxied to Honeypot)',
      headers,
      body: `[Transparently proxying probe to honeypot at ${proxyUrl.value}]`,
      note: 'Probe traffic forwarded to internal honeypot container.'
    }
  }

  if (responseMode.value === 'silentDrop') {
    return {
      statusCode: 0,
      statusText: 'Connection Reset / Dropped',
      headers: {},
      body: '[TCP Connection Terminated Immediately via TCP RST (0 HTTP bytes)]',
      note: 'RouteWarden uses Go http.Hijacker to abruptly terminate the raw TCP socket.'
    }
  }

  if (responseMode.value === 'gzipBomb') {
    headers['Content-Encoding'] = 'gzip'
    headers['Content-Type'] = 'text/html'
    return {
      statusCode: code,
      statusText: 'Forbidden (Decompression Bomb)',
      headers,
      body: `[Binary Gzip Payload: ${gzipBombMB.value} MB compressed -> expands to ~${gzipBombMB.value * 1000} MB in scanner memory]`,
      note: 'Neutralizes automated scanners by consuming gigabytes of RAM during decompression.'
    }
  }

  if (responseMode.value === 'tarpit') {
    headers['Content-Type'] = 'text/plain'
    return {
      statusCode: code,
      statusText: 'Forbidden (Tarpit Delay Active)',
      headers,
      body: `[Tarpit: Streaming 1 byte every ${tarpitDelayMs.value}ms, up to ${tarpitMaxDurationSeconds.value}s max duration]`,
      note: 'Locks connection open and slows down automated dictionary scanners.'
    }
  }

  if (responseMode.value === 'fakeSuccess') {
    headers['Content-Type'] = 'application/json'
    return {
      statusCode: 200,
      statusText: 'OK (Deceptive Honeypot)',
      headers,
      body: customBody.value || JSON.stringify({ status: 'success', data: [], total: 0 }, null, 2),
      note: 'Returns a deceptive HTTP 200 to trick automated vulnerability scanners.'
    }
  }

  if (responseMode.value === 'rateLimitChallenge') {
    headers['Retry-After'] = String(retryAfterSeconds.value)
    headers['Content-Type'] = 'text/plain'
    return {
      statusCode: 429,
      statusText: 'Too Many Requests',
      headers,
      body: `Rate limit challenge: Please retry after ${retryAfterSeconds.value} seconds.`,
      note: 'Instructs client to back off with standard Retry-After header.'
    }
  }

  if (responseMode.value === 'infiniteStream') {
    headers['Content-Type'] = 'application/octet-stream'
    return {
      statusCode: code,
      statusText: 'Forbidden (Infinite Stream)',
      headers,
      body: `[Streaming ${streamSizeMB.value} MB of random pseudo-data stream at chunked intervals]`,
      note: 'Overwhelms scanner buffers with endless junk bytes.'
    }
  }

  if (responseMode.value === 'captcha') {
    headers['Content-Type'] = 'text/html; charset=utf-8'
    return {
      statusCode: code,
      statusText: 'Forbidden (CAPTCHA Challenge)',
      headers,
      body: `[Interactive ${captchaProvider.value} challenge HTML page rendered with siteKey: ${captchaSiteKey.value}]`,
      note: `Presents browser users with a ${captchaProvider.value} verification challenge titled "${captchaTitle.value}".`
    }
  }

  return { statusCode: code, statusText: 'Forbidden', headers, body: 'Access denied' }
})

// Snippet generation
const generatedSnippet = computed(() => {
  const blockList = customBlockList.value
  const allowList = customAllowList.value
  const ipList = allowedIpsInput.value.split(',').map(s => s.trim()).filter(Boolean)
  const methodsList = inspectedMethods.value
  const hasCustomMethods = methodsList.length > 0 && !(methodsList.length === 1 && methodsList[0] === 'GET')

  if (snippetFormat.value === 'caddy') {
    let out = `example.com {\n  route_warden {\n`
    if (!enabled.value) out += `    enabled false\n`
    if (!enableDefaultPatterns.value) out += `    enable_default_patterns false\n`
    if (!enableDefaultAllowPatterns.value) out += `    enable_default_allow_patterns false\n`
    if (checkQuery.value) out += `    check_query true\n`

    if (blockList.length > 0) {
      out += `    path_patterns`
      for (const p of blockList) out += ` "${p}"`
      out += `\n`
    }
    if (allowList.length > 0) {
      out += `    allow_patterns`
      for (const p of allowList) out += ` "${p}"`
      out += `\n`
    }
    if (ipList.length > 0) {
      out += `    allowed_ips`
      for (const ip of ipList) out += ` "${ip}"`
      out += `\n`
    }
    if (hasCustomMethods) {
      out += `    methods ${methodsList.join(' ')}\n`
    }
    if (responseMode.value !== 'json') out += `    response_mode ${responseMode.value}\n`
    if (statusCode.value !== 403) out += `    status_code ${statusCode.value}\n`
    if (customBody.value) out += `    body "${customBody.value.replace(/"/g, '\\"')}"\n`
    if (responseMode.value === 'redirect') out += `    redirect_url "${redirectUrl.value}"\n`
    if (responseMode.value === 'proxy') out += `    proxy_url "${proxyUrl.value}"\n`
    if (responseMode.value === 'gzipBomb') out += `    gzip_bomb_mb ${gzipBombMB.value}\n`
    if (responseMode.value === 'tarpit') {
      out += `    tarpit_delay_ms ${tarpitDelayMs.value}\n`
      out += `    tarpit_max_duration_seconds ${tarpitMaxDurationSeconds.value}\n`
    }
    if (responseMode.value === 'rateLimitChallenge') out += `    retry_after_seconds ${retryAfterSeconds.value}\n`
    if (responseMode.value === 'infiniteStream') out += `    stream_size_mb ${streamSizeMB.value}\n`
    if (responseMode.value === 'captcha') {
      out += `    captcha_provider ${captchaProvider.value}\n`
      out += `    captcha_site_key "${captchaSiteKey.value}"\n`
      out += `    captcha_title "${captchaTitle.value}"\n`
    }
    out += `  }\n  reverse_proxy localhost:8080\n}`
    return out
  }

  if (snippetFormat.value === 'traefik_yaml') {
    let out = `http:\n  middlewares:\n    routewarden:\n      plugin:\n        routewarden:\n`
    if (!enabled.value) out += `          enabled: false\n`
    if (!enableDefaultPatterns.value) out += `          enableDefaultPatterns: false\n`
    if (!enableDefaultAllowPatterns.value) out += `          enableDefaultAllowPatterns: false\n`
    if (checkQuery.value) out += `          checkQuery: true\n`

    if (blockList.length > 0) {
      out += `          pathPatterns:\n`
      for (const p of blockList) out += `            - "${p}"\n`
    }
    if (allowList.length > 0) {
      out += `          allowPatterns:\n`
      for (const p of allowList) out += `            - "${p}"\n`
    }
    if (ipList.length > 0) {
      out += `          allowedIps:\n`
      for (const ip of ipList) out += `            - "${ip}"\n`
    }
    if (hasCustomMethods) {
      out += `          methods:\n`
      for (const m of methodsList) out += `            - "${m}"\n`
    }
    out += `          response:\n            mode: ${responseMode.value}\n`
    if (statusCode.value !== 403) out += `            statusCode: ${statusCode.value}\n`
    if (customBody.value) out += `            body: "${customBody.value.replace(/"/g, '\\"')}"\n`
    if (responseMode.value === 'redirect') out += `            redirectUrl: "${redirectUrl.value}"\n`
    if (responseMode.value === 'proxy') out += `            proxyUrl: "${proxyUrl.value}"\n`
    if (responseMode.value === 'gzipBomb') out += `            gzipBombMB: ${gzipBombMB.value}\n`
    if (responseMode.value === 'tarpit') {
      out += `            tarpitDelayMs: ${tarpitDelayMs.value}\n`
      out += `            tarpitMaxDurationSeconds: ${tarpitMaxDurationSeconds.value}\n`
    }
    if (responseMode.value === 'rateLimitChallenge') out += `            retryAfterSeconds: ${retryAfterSeconds.value}\n`
    if (responseMode.value === 'infiniteStream') out += `            streamSizeMB: ${streamSizeMB.value}\n`
    if (responseMode.value === 'captcha') {
      out += `            captcha:\n`
      out += `              provider: "${captchaProvider.value}"\n`
      out += `              siteKey: "${captchaSiteKey.value}"\n`
      out += `              title: "${captchaTitle.value}"\n`
    }
    return out
  }

  if (snippetFormat.value === 'traefik_toml') {
    let out = `[http.middlewares.routewarden.plugin.routewarden]\n`
    if (!enabled.value) out += `enabled = false\n`
    if (!enableDefaultPatterns.value) out += `enableDefaultPatterns = false\n`
    if (!enableDefaultAllowPatterns.value) out += `enableDefaultAllowPatterns = false\n`
    if (checkQuery.value) out += `checkQuery = true\n`

    if (blockList.length > 0) {
      out += `pathPatterns = [\n`
      for (const p of blockList) out += `  "${p}",\n`
      out += `]\n`
    }
    if (allowList.length > 0) {
      out += `allowPatterns = [\n`
      for (const p of allowList) out += `  "${p}",\n`
      out += `]\n`
    }
    if (ipList.length > 0) {
      out += `allowedIps = [\n`
      for (const ip of ipList) out += `  "${ip}",\n`
      out += `]\n`
    }
    if (hasCustomMethods) {
      out += `methods = [${methodsList.map(m => `"${m}"`).join(', ')}]\n`
    }
    out += `\n[http.middlewares.routewarden.plugin.routewarden.response]\nmode = "${responseMode.value}"\n`
    if (statusCode.value !== 403) out += `statusCode = ${statusCode.value}\n`
    if (customBody.value) out += `body = "${customBody.value.replace(/"/g, '\\"')}"\n`
    if (responseMode.value === 'redirect') out += `redirectUrl = "${redirectUrl.value}"\n`
    if (responseMode.value === 'proxy') out += `proxyUrl = "${proxyUrl.value}"\n`
    if (responseMode.value === 'gzipBomb') out += `gzipBombMB = ${gzipBombMB.value}\n`
    if (responseMode.value === 'tarpit') {
      out += `tarpitDelayMs = ${tarpitDelayMs.value}\n`
      out += `tarpitMaxDurationSeconds = ${tarpitMaxDurationSeconds.value}\n`
    }
    if (responseMode.value === 'rateLimitChallenge') out += `retryAfterSeconds = ${retryAfterSeconds.value}\n`
    if (responseMode.value === 'infiniteStream') out += `streamSizeMB = ${streamSizeMB.value}\n`
    if (responseMode.value === 'captcha') {
      out += `[http.middlewares.routewarden.plugin.routewarden.response.captcha]\n`
      out += `provider = "${captchaProvider.value}"\n`
      out += `siteKey = "${captchaSiteKey.value}"\n`
      out += `title = "${captchaTitle.value}"\n`
    }
    return out
  }

  if (snippetFormat.value === 'docker') {
    let out = `services:\n  traefik:\n    labels:\n`
    const prefix = 'traefik.http.middlewares.routewarden.plugin.routewarden'
    if (!enabled.value) out += `      - "${prefix}.enabled=false"\n`
    if (!enableDefaultPatterns.value) out += `      - "${prefix}.enableDefaultPatterns=false"\n`
    if (!enableDefaultAllowPatterns.value) out += `      - "${prefix}.enableDefaultAllowPatterns=false"\n`
    if (checkQuery.value) out += `      - "${prefix}.checkQuery=true"\n`
    if (hasCustomMethods) {
      out += `      - "${prefix}.methods=${methodsList.join(',')}"\n`
    }
    blockList.forEach((p, idx) => {
      out += `      - "${prefix}.pathPatterns[${idx}]=${p}"\n`
    })
    allowList.forEach((p, idx) => {
      out += `      - "${prefix}.allowPatterns[${idx}]=${p}"\n`
    })
    ipList.forEach((ip, idx) => {
      out += `      - "${prefix}.allowedIps[${idx}]=${ip}"\n`
    })
    out += `      - "${prefix}.response.mode=${responseMode.value}"\n`
    if (statusCode.value !== 403) out += `      - "${prefix}.response.statusCode=${statusCode.value}"\n`
    if (customBody.value) out += `      - "${prefix}.response.body=${customBody.value.replace(/"/g, '\\"')}"\n`
    if (responseMode.value === 'redirect') out += `      - "${prefix}.response.redirectUrl=${redirectUrl.value}"\n`
    if (responseMode.value === 'proxy') out += `      - "${prefix}.response.proxyUrl=${proxyUrl.value}"\n`
    if (responseMode.value === 'gzipBomb') out += `      - "${prefix}.response.gzipBombMB=${gzipBombMB.value}"\n`
    if (responseMode.value === 'tarpit') {
      out += `      - "${prefix}.response.tarpitDelayMs=${tarpitDelayMs.value}"\n`
      out += `      - "${prefix}.response.tarpitMaxDurationSeconds=${tarpitMaxDurationSeconds.value}"\n`
    }
    if (responseMode.value === 'rateLimitChallenge') out += `      - "${prefix}.response.retryAfterSeconds=${retryAfterSeconds.value}"\n`
    if (responseMode.value === 'infiniteStream') out += `      - "${prefix}.response.streamSizeMB=${streamSizeMB.value}"\n`
    if (responseMode.value === 'captcha') {
      out += `      - "${prefix}.response.captcha.provider=${captchaProvider.value}"\n`
      out += `      - "${prefix}.response.captcha.siteKey=${captchaSiteKey.value}"\n`
    }
    return out
  }

  if (snippetFormat.value === 'k8s_traefik' || snippetFormat.value === 'k8s') {
    let out = `apiVersion: traefik.io/v1alpha1\nkind: Middleware\nmetadata:\n  name: routewarden\n  namespace: default\nspec:\n  plugin:\n    routewarden:\n`
    if (!enabled.value) out += `      enabled: false\n`
    if (!enableDefaultPatterns.value) out += `      enableDefaultPatterns: false\n`
    if (!enableDefaultAllowPatterns.value) out += `      enableDefaultAllowPatterns: false\n`
    if (checkQuery.value) out += `      checkQuery: true\n`

    if (hasCustomMethods) {
      out += `      methods:\n`
      for (const m of methodsList) out += `        - "${m}"\n`
    }
    if (blockList.length > 0) {
      out += `      pathPatterns:\n`
      for (const p of blockList) out += `        - "${p}"\n`
    }
    if (allowList.length > 0) {
      out += `      allowPatterns:\n`
      for (const p of allowList) out += `        - "${p}"\n`
    }
    if (ipList.length > 0) {
      out += `      allowedIps:\n`
      for (const ip of ipList) out += `        - "${ip}"\n`
    }
    out += `      response:\n        mode: ${responseMode.value}\n`
    if (statusCode.value !== 403) out += `        statusCode: ${statusCode.value}\n`
    if (customBody.value) out += `        body: "${customBody.value.replace(/"/g, '\\"')}"\n`
    if (responseMode.value === 'redirect') out += `        redirectUrl: "${redirectUrl.value}"\n`
    if (responseMode.value === 'proxy') out += `        proxyUrl: "${proxyUrl.value}"\n`
    if (responseMode.value === 'gzipBomb') out += `        gzipBombMB: ${gzipBombMB.value}\n`
    if (responseMode.value === 'tarpit') {
      out += `        tarpitDelayMs: ${tarpitDelayMs.value}\n`
      out += `        tarpitMaxDurationSeconds: ${tarpitMaxDurationSeconds.value}\n`
    }
    if (responseMode.value === 'rateLimitChallenge') out += `        retryAfterSeconds: ${retryAfterSeconds.value}\n`
    if (responseMode.value === 'infiniteStream') out += `        streamSizeMB: ${streamSizeMB.value}\n`
    if (responseMode.value === 'captcha') {
      out += `        captcha:\n          provider: "${captchaProvider.value}"\n          siteKey: "${captchaSiteKey.value}"\n          title: "${captchaTitle.value}"\n`
    }
    return out
  }

  if (snippetFormat.value === 'k8s_caddy') {
    let out = `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: caddy-config\n  namespace: default\ndata:\n  Caddyfile: |\n    {\n      order route_warden before reverse_proxy\n    }\n\n    example.com {\n      route_warden {\n`
    if (!enabled.value) out += `        enabled false\n`
    if (!enableDefaultPatterns.value) out += `        enable_default_patterns false\n`
    if (!enableDefaultAllowPatterns.value) out += `        enable_default_allow_patterns false\n`
    if (checkQuery.value) out += `        check_query true\n`

    if (blockList.length > 0) {
      out += `        path_patterns`
      for (const p of blockList) out += ` "${p}"`
      out += `\n`
    }
    if (allowList.length > 0) {
      out += `        allow_patterns`
      for (const p of allowList) out += ` "${p}"`
      out += `\n`
    }
    if (ipList.length > 0) {
      out += `        allowed_ips`
      for (const ip of ipList) out += ` "${ip}"`
      out += `\n`
    }
    if (hasCustomMethods) {
      out += `        methods ${methodsList.join(' ')}\n`
    }
    if (responseMode.value !== 'json') out += `        response_mode ${responseMode.value}\n`
    if (statusCode.value !== 403) out += `        status_code ${statusCode.value}\n`
    if (customBody.value) out += `        body "${customBody.value.replace(/"/g, '\\"')}"\n`
    if (responseMode.value === 'redirect') out += `        redirect_url "${redirectUrl.value}"\n`
    if (responseMode.value === 'proxy') out += `        proxy_url "${proxyUrl.value}"\n`
    if (responseMode.value === 'gzipBomb') out += `        gzip_bomb_mb ${gzipBombMB.value}\n`
    if (responseMode.value === 'tarpit') {
      out += `        tarpit_delay_ms ${tarpitDelayMs.value}\n`
      out += `        tarpit_max_duration_seconds ${tarpitMaxDurationSeconds.value}\n`
    }
    if (responseMode.value === 'rateLimitChallenge') out += `        retry_after_seconds ${retryAfterSeconds.value}\n`
    if (responseMode.value === 'infiniteStream') out += `        stream_size_mb ${streamSizeMB.value}\n`
    if (responseMode.value === 'captcha') {
      out += `        captcha_provider ${captchaProvider.value}\n`
      out += `        captcha_site_key "${captchaSiteKey.value}"\n`
      out += `        captcha_title "${captchaTitle.value}"\n`
    }
    out += `      }\n      reverse_proxy app-service.default.svc.cluster.local:80\n    }\n`
    return out
  }

  return ''
})

const copyResponseSuccess = ref(false)

async function copyResponse() {
  try {
    const r = simulatedResponse.value
    let text = `${testMethod.value} ${evaluation.value.normalizedPath} HTTP/1.1\n`
    text += `HTTP/1.1 ${r.statusCode} ${r.statusText}\n`
    for (const [k, v] of Object.entries(r.headers)) {
      text += `${k}: ${v}\n`
    }
    if (r.body) {
      text += `\n${r.body}\n`
    }
    await navigator.clipboard.writeText(text.trim())
    copyResponseSuccess.value = true
    setTimeout(() => {
      copyResponseSuccess.value = false
    }, 2000)
  } catch {}
}

const formatFilename = computed(() => {
  switch (snippetFormat.value) {
    case 'caddy': return 'Caddyfile'
    case 'traefik_yaml': return 'routewarden.yml'
    case 'traefik_toml': return 'routewarden.toml'
    case 'docker': return 'docker-compose.yml'
    case 'k8s':
    case 'k8s_traefik': return 'traefik-middleware.yaml'
    case 'k8s_caddy': return 'caddy-configmap.yaml'
    default: return 'config'
  }
})

const isCaddyFormat = computed(() => snippetFormat.value === 'caddy' || snippetFormat.value === 'k8s_caddy')
const isTraefikFormat = computed(() => snippetFormat.value === 'traefik_yaml' || snippetFormat.value === 'traefik_toml' || snippetFormat.value === 'k8s_traefik' || snippetFormat.value === 'k8s')
const isDockerFormat = computed(() => snippetFormat.value === 'docker')

const gatewayBadgeText = computed(() => {
  if (isCaddyFormat.value) return 'Caddy'
  if (isDockerFormat.value) return 'Docker'
  return 'Traefik'
})

const gatewayBadgeClass = computed(() => {
  if (isCaddyFormat.value) return 'badge-caddy'
  if (isDockerFormat.value) return 'badge-docker'
  return 'badge-traefik'
})

function escapeSnippetHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightValueTokens(val: string): string {
  return val.replace(/("(?:\\.|[^"\\])*"|\b(?:true|false)\b|\b\d+\b|\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b|[\[\]{},=]|[^"\[\]{},=\s]+|\s+)/g, (match) => {
    if (/^"(?:\\.|[^"\\])*"$/.test(match)) return `<span class="tok-str">${escapeSnippetHtml(match)}</span>`
    if (/^(true|false)$/.test(match)) return `<span class="tok-bool">${match}</span>`
    if (/^\d+$/.test(match)) return `<span class="tok-num">${match}</span>`
    if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/.test(match)) return `<span class="tok-verb">${match}</span>`
    if (/^[\[\]{},=]$/.test(match)) return `<span class="tok-punct">${match}</span>`
    if (/^\s+$/.test(match)) return match
    return `<span class="tok-val">${escapeSnippetHtml(match)}</span>`
  })
}

function highlightDockerVal(val: string): string {
  if (/^(true|false)$/.test(val)) return `<span class="tok-bool">${val}</span>`
  if (/^\d+$/.test(val)) return `<span class="tok-num">${val}</span>`
  return `<span class="tok-str">${escapeSnippetHtml(val)}</span>`
}

function highlightCaddyLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${escapeSnippetHtml(line)}</span>`
  if (/^\s*\}\s*$/.test(line)) {
    const m = line.match(/^(\s*)(\})(\s*)$/)
    if (m) return `${m[1]}<span class="tok-punct">}</span>${m[3]}`
  }
  const m = line.match(/^(\s*)([a-zA-Z0-9_.:-]+)(.*)$/)
  if (!m) return escapeSnippetHtml(line)
  const [, indent, firstWord, rest] = m
  let wordClass = 'tok-key'
  if (['routewarden', 'route_warden', 'reverse_proxy', 'order'].includes(firstWord)) {
    wordClass = 'tok-keyword'
  } else if (firstWord.includes('.') && rest.includes('{')) {
    wordClass = 'tok-section'
  }
  return `${indent}<span class="${wordClass}">${escapeSnippetHtml(firstWord)}</span>${highlightValueTokens(rest)}`
}

function highlightYamlLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${escapeSnippetHtml(line)}</span>`
  const listStr = line.match(/^(\s*-\s+)("(?:\\.|[^"\\])*"|[^"\s].*)$/)
  if (listStr) {
    return `${listStr[1].replace('-', '<span class="tok-punct">-</span>')}${highlightValueTokens(listStr[2])}`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+):(\s*)(.*)$/)
  if (kv) {
    const [, indent, key, space, val] = kv
    const keyClass = ['http', 'middlewares', 'plugin', 'services', 'traefik', 'spec', 'metadata', 'apiVersion', 'kind', 'data'].includes(key) ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${escapeSnippetHtml(key)}</span><span class="tok-punct">:</span>${space}${highlightValueTokens(val)}`
  }
  return escapeSnippetHtml(line)
}

function highlightSnippet(code: string, format: string): string {
  if (!code) return ''
  const lines = code.split('\n')

  if (format === 'caddy') {
    return lines.map(line => highlightCaddyLine(line)).join('\n')
  }

  if (format === 'traefik_yaml' || format === 'k8s_traefik' || format === 'k8s') {
    return lines.map(line => highlightYamlLine(line)).join('\n')
  }

  if (format === 'k8s_caddy') {
    let inCaddyBlock = false
    return lines.map(line => {
      if (/Caddyfile:\s*\|/.test(line)) {
        inCaddyBlock = true
        return highlightYamlLine(line)
      }
      if (inCaddyBlock) {
        return highlightCaddyLine(line)
      }
      return highlightYamlLine(line)
    }).join('\n')
  }

  if (format === 'docker') {
    return lines.map(line => {
      if (/^\s*#/.test(line)) return `<span class="tok-comment">${escapeSnippetHtml(line)}</span>`
      const labelMatch = line.match(/^(\s*-\s*)"([^=]+)=(.*)"$/)
      if (labelMatch) {
        const [, indentDash, labelKey, labelVal] = labelMatch
        const dash = indentDash.replace('-', '<span class="tok-punct">-</span>')
        return `${dash}<span class="tok-punct">&quot;</span><span class="tok-key">${escapeSnippetHtml(labelKey)}</span><span class="tok-punct">=</span>${highlightDockerVal(labelVal)}<span class="tok-punct">&quot;</span>`
      }
      const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+):(\s*)(.*)$/);
      if (kv) {
        const [, indent, key, space, val] = kv
        return `${indent}<span class="tok-keyword">${escapeSnippetHtml(key)}</span><span class="tok-punct">:</span>${space}${highlightValueTokens(val)}`
      }
      return escapeSnippetHtml(line)
    }).join('\n')
  }

  if (format === 'traefik_toml') {
    return lines.map(line => {
      if (/^\s*#/.test(line)) return `<span class="tok-comment">${escapeSnippetHtml(line)}</span>`
      const sec = line.match(/^(\s*)(\[[^\]]+\])(\s*)$/)
      if (sec) {
        return `${sec[1]}<span class="tok-section">${escapeSnippetHtml(sec[2])}</span>${sec[3]}`
      }
      const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+)(\s*=\s*)(.*)$/)
      if (kv) {
        const [, indent, key, , val] = kv
        return `${indent}<span class="tok-key">${escapeSnippetHtml(key)}</span> <span class="tok-punct">=</span> ${highlightValueTokens(val)}`
      }
      return highlightValueTokens(line)
    }).join('\n')
  }

  return escapeSnippetHtml(code)
}

const highlightedSnippet = computed(() => {
  return highlightSnippet(generatedSnippet.value, snippetFormat.value)
})

async function copySnippet() {
  try {
    await navigator.clipboard.writeText(generatedSnippet.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {}
}

// 6. Playground Deeplinking & Shareable URL
const shareFeedback = ref(false)

function buildShareUrl(): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.search = '' // Clear existing params
  url.searchParams.set('playground', 'open')

  // 1. Inputs
  if (testPath.value && testPath.value !== '/%252e%252e/.env') {
    url.searchParams.set('path', testPath.value)
  }
  if (testMethod.value && testMethod.value !== 'GET') {
    url.searchParams.set('method', testMethod.value)
  }
  if (testIp.value && testIp.value !== '198.51.100.42') {
    url.searchParams.set('ip', testIp.value)
  }

  // 2. Custom patterns
  if (pathPatternsInput.value.trim()) {
    url.searchParams.set('block', pathPatternsInput.value.trim())
  }
  if (allowPatternsInput.value.trim()) {
    url.searchParams.set('allow', allowPatternsInput.value.trim())
  }

  // 3. Flags
  if (!enabled.value) {
    url.searchParams.set('enabled', '0')
  }
  if (!enableDefaultPatterns.value) {
    url.searchParams.set('defaultBlock', '0')
  }
  if (!enableDefaultAllowPatterns.value) {
    url.searchParams.set('defaultAllow', '0')
  }
  if (checkQuery.value) {
    url.searchParams.set('checkQuery', '1')
  }
  if (allowedIpsInput.value.trim() && allowedIpsInput.value.trim() !== '127.0.0.1, 10.0.0.0/8') {
    url.searchParams.set('allowedIps', allowedIpsInput.value.trim())
  }
  if (methodsInput.value.trim() && methodsInput.value.trim() !== 'GET') {
    url.searchParams.set('methods', methodsInput.value.trim())
  }

  // 4. Response settings
  if (responseMode.value !== 'json') {
    url.searchParams.set('mode', responseMode.value)
  }
  if (statusCode.value !== 403) {
    url.searchParams.set('status', String(statusCode.value))
  }
  if (customBody.value.trim()) {
    url.searchParams.set('body', customBody.value.trim())
  }
  if (responseMode.value === 'redirect' && redirectUrl.value) {
    url.searchParams.set('redirectUrl', redirectUrl.value)
  }
  if (responseMode.value === 'proxy' && proxyUrl.value) {
    url.searchParams.set('proxyUrl', proxyUrl.value)
  }
  if (responseMode.value === 'gzipBomb' && gzipBombMB.value !== 10) {
    url.searchParams.set('gzipMB', String(gzipBombMB.value))
  }
  if (responseMode.value === 'tarpit') {
    if (tarpitDelayMs.value !== 1000) url.searchParams.set('tarpitDelay', String(tarpitDelayMs.value))
    if (tarpitMaxDurationSeconds.value !== 60) url.searchParams.set('tarpitDuration', String(tarpitMaxDurationSeconds.value))
  }
  if (responseMode.value === 'rateLimitChallenge' && retryAfterSeconds.value !== 300) {
    url.searchParams.set('retryAfter', String(retryAfterSeconds.value))
  }
  if (responseMode.value === 'infiniteStream' && streamSizeMB.value !== 50) {
    url.searchParams.set('streamMB', String(streamSizeMB.value))
  }
  if (responseMode.value === 'captcha') {
    if (captchaProvider.value !== 'turnstile') url.searchParams.set('captchaProvider', captchaProvider.value)
    if (captchaSiteKey.value) url.searchParams.set('captchaKey', captchaSiteKey.value)
    if (captchaTitle.value) url.searchParams.set('captchaTitle', captchaTitle.value)
  }

  // 5. Snippet format
  if (snippetFormat.value !== 'caddy') {
    url.searchParams.set('format', snippetFormat.value)
  }

  return url.toString()
}

async function copyShareLink() {
  try {
    const url = buildShareUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    shareFeedback.value = true
    setTimeout(() => {
      shareFeedback.value = false
    }, 2500)
  } catch {}
}

onMounted(() => {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    if (!params || [...params.keys()].length === 0) return

    // 1. Input parameters
    const pPath = params.get('path') || params.get('url')
    if (pPath) testPath.value = pPath

    const pMethod = params.get('method')
    if (pMethod) testMethod.value = pMethod.toUpperCase()

    const pIp = params.get('ip')
    if (pIp) testIp.value = pIp

    // 2. Custom patterns
    const pBlock = params.get('block') || params.get('pathPatterns')
    if (pBlock) pathPatternsInput.value = pBlock

    const pAllow = params.get('allow') || params.get('allowPatterns')
    if (pAllow) allowPatternsInput.value = pAllow

    // 3. Flags
    if (params.has('enabled')) {
      enabled.value = params.get('enabled') !== '0' && params.get('enabled') !== 'false'
    }
    if (params.has('defaultBlock')) {
      enableDefaultPatterns.value = params.get('defaultBlock') !== '0' && params.get('defaultBlock') !== 'false'
    }
    if (params.has('defaultAllow')) {
      enableDefaultAllowPatterns.value = params.get('defaultAllow') !== '0' && params.get('defaultAllow') !== 'false'
    }
    if (params.has('checkQuery')) {
      checkQuery.value = params.get('checkQuery') === '1' || params.get('checkQuery') === 'true'
    }
    if (params.has('allowedIps')) {
      allowedIpsInput.value = params.get('allowedIps') || ''
    }
    if (params.has('methods')) {
      methodsInput.value = params.get('methods') || 'GET'
    }

    // 4. Response settings
    const pMode = params.get('mode')
    const validModes: ResponseMode[] = [
      'json', 'html', 'text', 'xml', 'redirect', 'captcha',
      'silentDrop', 'gzipBomb', 'tarpit', 'fakeSuccess',
      'rateLimitChallenge', 'proxy', 'infiniteStream'
    ]
    if (pMode && validModes.includes(pMode as ResponseMode)) {
      responseMode.value = pMode as ResponseMode
    }

    if (params.has('status')) {
      const code = parseInt(params.get('status') || '', 10)
      if (!isNaN(code)) statusCode.value = code
    }

    if (params.has('body')) {
      customBody.value = params.get('body') || ''
    }
    if (params.has('redirectUrl')) {
      redirectUrl.value = params.get('redirectUrl') || ''
    }
    if (params.has('proxyUrl')) {
      proxyUrl.value = params.get('proxyUrl') || ''
    }
    if (params.has('gzipMB')) {
      const mb = parseInt(params.get('gzipMB') || '', 10)
      if (!isNaN(mb)) gzipBombMB.value = mb
    }
    if (params.has('tarpitDelay')) {
      const d = parseInt(params.get('tarpitDelay') || '', 10)
      if (!isNaN(d)) tarpitDelayMs.value = d
    }
    if (params.has('tarpitDuration')) {
      const dur = parseInt(params.get('tarpitDuration') || '', 10)
      if (!isNaN(dur)) tarpitMaxDurationSeconds.value = dur
    }
    if (params.has('retryAfter')) {
      const ra = parseInt(params.get('retryAfter') || '', 10)
      if (!isNaN(ra)) retryAfterSeconds.value = ra
    }
    if (params.has('streamMB')) {
      const sm = parseInt(params.get('streamMB') || '', 10)
      if (!isNaN(sm)) streamSizeMB.value = sm
    }
    if (params.has('captchaProvider')) {
      const prov = params.get('captchaProvider')
      if (prov === 'turnstile' || prov === 'hcaptcha' || prov === 'recaptcha') {
        captchaProvider.value = prov
      }
    }
    if (params.has('captchaKey')) {
      captchaSiteKey.value = params.get('captchaKey') || ''
    }
    if (params.has('captchaTitle')) {
      captchaTitle.value = params.get('captchaTitle') || ''
    }

    // 5. Snippet format
    const pFmt = params.get('format')
    if (pFmt && ['caddy', 'traefik_yaml', 'traefik_toml', 'docker', 'k8s_traefik', 'k8s_caddy', 'k8s'].includes(pFmt)) {
      snippetFormat.value = pFmt as any
    }
  } catch (err) {
    console.error('Failed to parse URL query params in RouteWarden playground:', err)
  }
})
</script>

<template>
  <div class="rw-simple-tool">
    <!-- 1. Input & Live Verdict Strip -->
    <div class="rw-block">
      <div class="rw-input-bar">
        <div class="rw-input-main">
          <select v-model="testMethod" class="rw-method-select" title="Simulated HTTP request verb">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
          <input
            v-model="testPath"
            class="rw-url-input"
            placeholder="/admin/.env"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="rw-input-extra">
          <input
            v-model="testIp"
            class="rw-ip-input"
            placeholder="Client IP"
            title="Simulated Client IP"
          />
          <div class="rw-verdict-tag" :class="evaluation.badgeClass">
            {{ evaluation.verdict }}
          </div>
        </div>
      </div>

      <!-- Quick sample presets, normalization trace & Share Deeplink -->
      <div class="rw-sub-bar">
        <div class="rw-presets">
          <span class="rw-dim">Try:</span>
          <button
            v-for="p in presets"
            :key="p.label"
            type="button"
            class="rw-preset-pill"
            @click="applyPreset(p)"
          >{{ p.label }}</button>
        </div>

        <div class="rw-sub-actions">
          <div v-if="evaluation.transformations.length > 0" class="rw-norm-info">
            <span class="rw-dim">Anti-Evasion:</span>
            <code>{{ evaluation.normalizedPath }}</code>
            <span class="rw-norm-text">({{ evaluation.transformations.join(', ') }})</span>
          </div>
          <button
            type="button"
            class="rw-btn-share-link"
            :class="{ copied: shareFeedback }"
            title="Copy shareable link with current playground parameters"
            @click="copyShareLink"
          >
            <span v-if="shareFeedback" class="rw-share-icon">✓</span>
            <span>{{ shareFeedback ? 'Link Copied' : 'Share Link' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2 & 3. Patterns: Block & Allow side-by-side inline with vertical UI to save space -->
    <div class="rw-patterns-row">
      <!-- 2. Block Patterns (Red Theme) -->
      <div class="rw-block rw-pattern-col rw-pattern-block-col">
        <div class="rw-row-header">
          <div class="rw-header-title-group">
            <span class="rw-title rw-title-block">Block Patterns (<code>pathPatterns</code>)</span>
            <span v-if="customBlockList.length" class="rw-count red">{{ customBlockList.length }}</span>
          </div>
        </div>

        <!-- Clean Input with Regex / From URL & Add -->
        <form class="rw-inline-add rw-inline-add-block" @submit.prevent="addNewBlockPattern">
          <input
            v-model="newBlockInput"
            placeholder="/admin/*, *.sql, .env..."
            autocomplete="off"
            spellcheck="false"
          />
          <button
            type="button"
            class="rw-btn-regex-act"
            :disabled="isBlockRegexDisabled"
            :class="{ active: blockRegexGenerated }"
            :title="newBlockInput.trim() ? 'Convert pattern to RE2 regex' : 'Generate regex from URL input above'"
            @click="generateBlockRegex"
          >
            {{ blockRegexGenerated ? 'Regex' : (newBlockInput.trim() ? 'To Regex' : 'From URL') }}
          </button>
          <button type="submit" class="rw-btn-add-block" :disabled="!newBlockInput.trim()">+ Add</button>
        </form>

        <!-- Active Pattern Chips with Interactive Match Highlighting -->
        <div v-if="customBlockList.length > 0" class="rw-chips">
          <span
            v-for="(p, i) in customBlockList"
            :key="i"
            class="rw-chip red"
            :class="{ 'chip-matched': patternMatchesTest(p) }"
            :title="patternMatchesTest(p) ? 'Matches the current test URL above!' : ''"
          >
            <span v-if="patternMatchesTest(p)" class="rw-match-dot">●</span>
            <code>{{ p }}</code>
            <button type="button" title="Remove pattern" @click="removeBlockPattern(i)">✕</button>
          </span>
        </div>
      </div>

      <!-- 3. Allow Patterns (Green Theme) -->
      <div class="rw-block rw-pattern-col rw-pattern-allow-col">
        <div class="rw-row-header">
          <div class="rw-header-title-group">
            <span class="rw-title rw-title-allow">Allow Patterns (<code>allowPatterns</code>)</span>
            <span v-if="customAllowList.length" class="rw-count green">{{ customAllowList.length }}</span>
          </div>
        </div>

        <!-- Clean Input with Regex / From URL & Add -->
        <form class="rw-inline-add rw-inline-add-allow" @submit.prevent="addNewAllowPattern">
          <input
            v-model="newAllowInput"
            placeholder="/api/health, /public/*..."
            autocomplete="off"
            spellcheck="false"
          />
          <button
            type="button"
            class="rw-btn-regex-act green"
            :disabled="isAllowRegexDisabled"
            :class="{ active: allowRegexGenerated }"
            :title="newAllowInput.trim() ? 'Convert pattern to RE2 regex' : 'Generate regex from URL input above'"
            @click="generateAllowRegex"
          >
            {{ allowRegexGenerated ? 'Regex' : (newAllowInput.trim() ? 'To Regex' : 'From URL') }}
          </button>
          <button type="submit" class="rw-btn-add-allow" :disabled="!newAllowInput.trim()">+ Add</button>
        </form>

        <!-- Active Pattern Chips with Interactive Match Highlighting -->
        <div v-if="customAllowList.length > 0" class="rw-chips">
          <span
            v-for="(p, i) in customAllowList"
            :key="i"
            class="rw-chip green"
            :class="{ 'chip-matched-green': patternMatchesTest(p) }"
            :title="patternMatchesTest(p) ? 'Matches the current test URL above!' : ''"
          >
            <span v-if="patternMatchesTest(p)" class="rw-match-dot green">●</span>
            <code>{{ p }}</code>
            <button type="button" title="Remove pattern" @click="removeAllowPattern(i)">✕</button>
          </span>
        </div>
      </div>
    </div>

    <!-- 4. Built-in Flags & IPs -->
    <div class="rw-block">
      <div class="rw-row-header">
        <span class="rw-title">Middleware Options</span>
      </div>

      <div class="rw-flags-line">
        <label class="rw-check">
          <input v-model="enableDefaultPatterns" type="checkbox" />
          <span>Built-in Blocklist</span>
        </label>
        <label class="rw-check">
          <input v-model="enableDefaultAllowPatterns" type="checkbox" />
          <span>Built-in Allowlist</span>
        </label>
        <label class="rw-check">
          <input v-model="checkQuery" type="checkbox" />
          <span>Check Query</span>
        </label>
        <label class="rw-check">
          <input v-model="enabled" type="checkbox" />
          <span>Enabled</span>
        </label>
        <div class="rw-inline-ip">
          <span>Allowed IPs:</span>
          <input v-model="allowedIpsInput" placeholder="127.0.0.1, 10.0.0.0/8" />
        </div>
      </div>

      <!-- Enhanced HTTP Verbs Selector Row -->
      <div class="rw-verbs-selector-bar">
        <div class="rw-vsb-header">
          <span class="rw-vsb-label">Inspect HTTP Verbs (<code>methods</code>):</span>
          <span class="rw-vsb-desc">Non-selected verbs bypass inspection and forward directly to upstream backends</span>
        </div>
        <div class="rw-vsb-controls">
          <div class="rw-vsb-pills">
            <button
              v-for="m in standardMethods"
              :key="m"
              type="button"
              class="rw-vsb-pill"
              :class="{ active: inspectedMethods.includes(m) }"
              :title="inspectedMethods.includes(m) ? `Click to exclude ${m} from inspection` : `Click to inspect ${m} requests`"
              @click="toggleInspectedMethod(m)"
            >
              <span class="rw-vsb-mark">{{ inspectedMethods.includes(m) ? '✓' : '+' }}</span>
              <span class="rw-vsb-name">{{ m }}</span>
            </button>
          </div>
          <div class="rw-vsb-actions">
            <button
              type="button"
              class="rw-vsb-all-btn"
              @click="toggleAllMethods"
            >
              {{ allStandardMethodsSelected ? 'GET Only' : 'Select All' }}
            </button>
            <input
              v-model="methodsInput"
              class="rw-vsb-input"
              placeholder="Custom verbs: e.g. GET, POST"
              title="Comma-separated inspected HTTP verbs"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 5. Response Configuration & Simulated Output (Below Config) -->
    <div class="rw-block">
      <div class="rw-row-header">
        <span class="rw-title">HTTP Response</span>
        <div class="rw-resp-opts">
          <label>
            <span>Mode:</span>
            <select v-model="responseMode" class="rw-mode-select">
              <optgroup label="Standard Responses">
                <option value="json">json</option>
                <option value="html">html</option>
                <option value="text">text</option>
                <option value="xml">xml</option>
              </optgroup>
              <optgroup label="Traffic Routing">
                <option value="redirect">redirect</option>
                <option value="proxy">proxy (honeypot)</option>
              </optgroup>
              <optgroup label="Active Defense & Traps">
                <option value="silentDrop">silentDrop (TCP RST)</option>
                <option value="gzipBomb">gzipBomb (zip bomb)</option>
                <option value="tarpit">tarpit (slow drip)</option>
                <option value="rateLimitChallenge">rateLimitChallenge (429)</option>
                <option value="infiniteStream">infiniteStream (junk stream)</option>
              </optgroup>
              <optgroup label="Deception & Verification">
                <option value="fakeSuccess">fakeSuccess (HTTP 200)</option>
                <option value="captcha">captcha (Turnstile/hCaptcha)</option>
              </optgroup>
            </select>
          </label>
          <label v-if="responseMode !== 'silentDrop' && responseMode !== 'fakeSuccess' && responseMode !== 'redirect' && responseMode !== 'rateLimitChallenge'">
            <span>Status:</span>
            <input v-model.number="statusCode" type="number" class="rw-small-num" />
          </label>
        </div>
      </div>

      <!-- Mode-Specific Configuration Options -->
      <div class="rw-mode-opts-panel">
        <!-- Redirect Options -->
        <div v-if="responseMode === 'redirect'" class="rw-mode-fields">
          <span class="rw-opt-tag">Redirect Target:</span>
          <input v-model="redirectUrl" class="rw-opt-input" placeholder="https://sinkhole.example.com/blocked" />
        </div>

        <!-- Proxy Options -->
        <div v-if="responseMode === 'proxy'" class="rw-mode-fields">
          <span class="rw-opt-tag">Honeypot Proxy URL:</span>
          <input v-model="proxyUrl" class="rw-opt-input" placeholder="http://honeypot-internal:8080" />
        </div>

        <!-- Gzip Bomb Options -->
        <div v-if="responseMode === 'gzipBomb'" class="rw-mode-fields">
          <span class="rw-opt-tag">Payload Size:</span>
          <div class="rw-opt-unit">
            <input v-model.number="gzipBombMB" type="number" min="1" max="100" class="rw-small-num" />
            <span>MB (expands to ~{{ gzipBombMB * 1000 }} MB in scanner memory)</span>
          </div>
        </div>

        <!-- Tarpit Options -->
        <div v-if="responseMode === 'tarpit'" class="rw-mode-fields">
          <span class="rw-opt-tag">Drip Delay:</span>
          <div class="rw-opt-unit">
            <input v-model.number="tarpitDelayMs" type="number" min="50" step="100" class="rw-small-num" />
            <span>ms/byte</span>
          </div>
          <span class="rw-opt-tag">Max Duration:</span>
          <div class="rw-opt-unit">
            <input v-model.number="tarpitMaxDurationSeconds" type="number" min="1" class="rw-small-num" />
            <span>s</span>
          </div>
        </div>

        <!-- Rate Limit Challenge Options -->
        <div v-if="responseMode === 'rateLimitChallenge'" class="rw-mode-fields">
          <span class="rw-opt-tag">Retry-After:</span>
          <div class="rw-opt-unit">
            <input v-model.number="retryAfterSeconds" type="number" min="1" class="rw-small-num" />
            <span>seconds</span>
          </div>
        </div>

        <!-- Infinite Stream Options -->
        <div v-if="responseMode === 'infiniteStream'" class="rw-mode-fields">
          <span class="rw-opt-tag">Stream Cap:</span>
          <div class="rw-opt-unit">
            <input v-model.number="streamSizeMB" type="number" min="1" class="rw-small-num" />
            <span>MB pseudo-random junk bytes</span>
          </div>
        </div>

        <!-- Captcha Options -->
        <div v-if="responseMode === 'captcha'" class="rw-mode-fields rw-wrap-fields">
          <div class="rw-field-group">
            <span class="rw-opt-tag">Provider:</span>
            <select v-model="captchaProvider" class="rw-mini-select">
              <option value="turnstile">Cloudflare Turnstile</option>
              <option value="hcaptcha">hCaptcha</option>
              <option value="recaptcha">reCAPTCHA v2</option>
            </select>
          </div>
          <div class="rw-field-group rw-flex-1">
            <span class="rw-opt-tag">Site Key:</span>
            <input v-model="captchaSiteKey" class="rw-opt-input mono" placeholder="0x4AAAAAA..." />
          </div>
          <div class="rw-field-group rw-flex-1">
            <span class="rw-opt-tag">Title:</span>
            <input v-model="captchaTitle" class="rw-opt-input" placeholder="Verification Title" />
          </div>
        </div>

        <!-- Silent Drop Note -->
        <div v-if="responseMode === 'silentDrop'" class="rw-mode-fields rw-silent-note">
          <span class="rw-badge-silent">TCP RST</span>
          <span>Abruptly closes socket via Go <code>http.Hijacker</code>. Zero HTTP bytes, headers, or status codes sent.</span>
        </div>

        <!-- Custom Body Override for json/text/html/xml/fakeSuccess -->
        <div v-if="['json', 'text', 'html', 'xml', 'fakeSuccess'].includes(responseMode)" class="rw-mode-fields">
          <span class="rw-opt-tag">Custom Body:</span>
          <input
            v-model="customBody"
            class="rw-opt-input"
            :placeholder="responseMode === 'json' ? 'Leave empty for default JSON or type custom payload...' : 'Leave empty for default or type custom body...'"
          />
          <button v-if="customBody" type="button" class="rw-btn-reset-sm" title="Reset body" @click="customBody = ''">✕</button>
        </div>
      </div>

      <!-- Simulation Results for Each HTTP Verb -->
      <div class="rw-verb-sim-section">
        <div class="rw-sim-matrix-bar">
          <div class="rw-sm-info">
            <span class="rw-sm-title">⚡ Verdict for Each HTTP Verb:</span>
            <span class="rw-sm-desc">Click any verb to inspect its live simulated response payload below</span>
          </div>
          <div class="rw-sm-pills">
            <button
              v-for="ve in verbEvaluations"
              :key="ve.method"
              type="button"
              class="rw-sim-pill"
              :class="[
                ve.badgeClass,
                {
                  active: testMethod === ve.method,
                  uninspected: !ve.isInspected
                }
              ]"
              :title="`Click to inspect HTTP ${ve.method} (${ve.reason})`"
              @click="testMethod = ve.method"
            >
              <span class="rw-sp-dot">●</span>
              <span class="rw-sp-name">{{ ve.method }}</span>
              <span class="rw-sp-badge">{{ ve.verdict }}</span>
              <span class="rw-sp-code">{{ ve.statusCode }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Differentiated Copyable HTTP Output Card -->
      <div class="rw-copyable-card rw-http-box" :class="`card-${evaluation.badgeClass}`">
        <div class="rw-card-header">
          <div class="rw-card-header-left">
            <span class="rw-terminal-dots">
              <i class="dot-red"></i>
              <i class="dot-yellow"></i>
              <i class="dot-green"></i>
            </span>
            <span class="rw-proto">{{ testMethod }} {{ evaluation.normalizedPath }}</span>
            <span class="rw-status-num">
              {{ simulatedResponse.statusCode }} {{ simulatedResponse.statusText }}
            </span>
            <span class="rw-reason-dim">— {{ evaluation.reason }}</span>
          </div>
          <div class="rw-card-header-right">
            <button
              type="button"
              class="rw-btn-copy-card"
              :class="{ copied: copyResponseSuccess }"
              @click="copyResponse"
              title="Copy raw HTTP response"
            >
              {{ copyResponseSuccess ? 'Copied' : 'Copy HTTP' }}
            </button>
          </div>
        </div>

        <!-- Key HTTP Headers -->
        <div v-if="Object.keys(simulatedResponse.headers).length > 0" class="rw-http-headers">
          <div v-for="(val, key) in simulatedResponse.headers" :key="key" class="rw-hdr-line">
            <span class="rw-hdr-name">{{ key }}:</span>
            <span class="rw-hdr-val">{{ val }}</span>
          </div>
        </div>

        <pre class="rw-http-body" tabindex="0" title="Simulated HTTP response payload"><code>{{ simulatedResponse.body }}</code></pre>

        <div v-if="simulatedResponse.note" class="rw-http-note">
          💡 {{ simulatedResponse.note }}
        </div>
      </div>
    </div>

    <!-- 6. Generated Files (Always visible at bottom, Copyable Read-Only with Gateway Color Differentiation) -->
    <div
      class="rw-block rw-export-block rw-copyable-block"
      :class="{
        'gw-caddy': isCaddyFormat,
        'gw-traefik': isTraefikFormat,
        'gw-docker': isDockerFormat
      }"
    >
      <div class="rw-export-top-bar">
        <div class="rw-header-title-group">
          <span class="rw-title rw-export-title">Generated Gateway Configuration</span>
          <span
            class="rw-filename-label"
            :class="{
              'fn-caddy': isCaddyFormat,
              'fn-traefik': isTraefikFormat,
              'fn-docker': isDockerFormat
            }"
          >
            <span class="rw-fn-dot">●</span>
            {{ formatFilename }}
          </span>
        </div>
        <span class="rw-gw-pill" :class="gatewayBadgeClass">{{ gatewayBadgeText }}</span>
      </div>

      <div class="rw-export-header">
        <div class="rw-export-header-left">
          <div class="rw-tabs">
            <button
              class="tab-caddy"
              :class="{ act: snippetFormat === 'caddy' }"
              @click="snippetFormat = 'caddy'"
            >Caddyfile</button>
            <button
              class="tab-traefik"
              :class="{ act: snippetFormat === 'traefik_yaml' }"
              @click="snippetFormat = 'traefik_yaml'"
            >Traefik (YAML)</button>
            <button
              class="tab-traefik"
              :class="{ act: snippetFormat === 'traefik_toml' }"
              @click="snippetFormat = 'traefik_toml'"
            >Traefik (TOML)</button>
            <button
              class="tab-docker"
              :class="{ act: snippetFormat === 'docker' }"
              @click="snippetFormat = 'docker'"
            >Docker</button>
            <button
              class="tab-traefik"
              :class="{ act: snippetFormat === 'k8s_traefik' || snippetFormat === 'k8s' }"
              @click="snippetFormat = 'k8s_traefik'"
            >K8s (Traefik)</button>
            <button
              class="tab-caddy"
              :class="{ act: snippetFormat === 'k8s_caddy' }"
              @click="snippetFormat = 'k8s_caddy'"
            >K8s (Caddy)</button>
          </div>
        </div>
        <div class="rw-export-header-right">
          <button
            type="button"
            class="rw-btn-copy"
            :class="{
              copied: copySuccess,
              'btn-copy-caddy': isCaddyFormat,
              'btn-copy-traefik': isTraefikFormat,
              'btn-copy-docker': isDockerFormat
            }"
            @click="copySnippet"
            title="Copy generated configuration"
          >
            {{ copySuccess ? 'Copied' : 'Copy Config' }}
          </button>
        </div>
      </div>

      <div class="rw-code-viewport">
        <pre class="rw-export-pre" tabindex="0" title="Generated configuration snippet"><code v-html="highlightedSnippet"></code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-simple-tool {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  font-size: 13px;
  color: var(--vp-c-text-1);
  padding: 0.25rem 0 1.5rem;
}

.rw-simple-tool *, .rw-simple-tool *::before, .rw-simple-tool *::after {
  box-sizing: border-box;
}

/* Blocks */
.rw-block {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 1. Request Input Strip */
.rw-input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 3px 6px;
  transition: border-color 0.15s ease;
}
.rw-input-bar:focus-within {
  border-color: var(--vp-c-brand-1);
}

.rw-input-main {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1;
  min-width: 0;
}

.rw-input-extra {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.rw-badge-get,
.rw-method-select {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-brand-soft);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}

.rw-method-select:hover {
  border-color: var(--vp-c-brand-1);
}

.rw-method-select:focus {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.rw-url-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
  padding: 4px 2px;
}

.rw-ip-input {
  width: 120px;
  flex-shrink: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-2);
  padding: 4px 6px;
  border-left: 1px solid var(--vp-c-divider);
  text-align: right;
}

.rw-verdict-tag {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.verdict-block { background: rgba(239,68,68,0.15); color: #dc2626; }
.dark .verdict-block { color: #f87171; }
.verdict-allow { background: rgba(16,185,129,0.15); color: #059669; }
.dark .verdict-allow { color: #34d399; }
.verdict-bypass { background: rgba(56,189,248,0.15); color: #0284c7; }
.dark .verdict-bypass { color: #38bdf8; }
.verdict-pass { background: rgba(100,116,139,0.15); color: #475569; }
.dark .verdict-pass { color: #94a3b8; }

.rw-sub-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 11px;
  flex-wrap: wrap;
}

.rw-presets {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.rw-dim { color: var(--vp-c-text-2); font-weight: 600; font-size: 10.5px; }

.rw-preset-pill {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.12s;
}
.rw-preset-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.rw-url-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.rw-btn-url-regex {
  font-size: 10px;
  font-weight: 600;
  padding: 1.5px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}
.rw-btn-url-regex.red {
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.3);
}
.dark .rw-btn-url-regex.red { color: #f87171; }
.rw-btn-url-regex.red:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: #dc2626;
}
.rw-btn-url-regex.green {
  color: #059669;
  border-color: rgba(16, 185, 129, 0.3);
}
.dark .rw-btn-url-regex.green { color: #34d399; }
.rw-btn-url-regex.green:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.1);
  border-color: #059669;
}
.rw-btn-url-regex:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  border-style: dashed;
}

.rw-norm-info {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: 11px;
}
.rw-norm-info code {
  color: var(--vp-c-brand-1);
  font-size: 11px;
}
.rw-norm-text {
  color: var(--vp-c-text-2);
  font-size: 10px;
}

.rw-sub-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.rw-btn-share-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 11px;
  font-weight: 600;
  padding: 2.5px 9px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-brand-1);
  background: rgba(99, 102, 241, 0.08);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.rw-btn-share-link:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}
.rw-btn-share-link.copied {
  border-color: #059669;
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}
.dark .rw-btn-share-link.copied {
  color: #34d399;
}
.rw-share-icon {
  font-size: 11px;
}

/* 2 & 3. Patterns Rows */
.rw-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-header-title-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.rw-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.rw-count {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 10px;
}
.rw-count.red { background: rgba(239,68,68,0.12); color: #dc2626; }
.dark .rw-count.red { color: #f87171; }
.rw-count.green { background: rgba(16,185,129,0.12); color: #059669; }
.dark .rw-count.green { color: #34d399; }

/* Patterns Row: 2-Column Side-by-Side with Container-Responsive Vertical Alignment */
.rw-patterns-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 0.85rem;
  width: 100%;
  min-width: 0;
  container-type: inline-size;
}

.rw-pattern-col {
  height: 100%;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
  overflow: hidden;
}

/* Color differentiation for Block Patterns Column */
.rw-pattern-block-col {
  border-color: rgba(239, 68, 68, 0.32) !important;
  background: rgba(239, 68, 68, 0.02) !important;
}
.dark .rw-pattern-block-col {
  border-color: rgba(248, 113, 113, 0.32) !important;
  background: rgba(239, 68, 68, 0.05) !important;
}

.rw-title-block {
  color: #dc2626 !important;
  font-weight: 700;
}
.dark .rw-title-block {
  color: #f87171 !important;
}

.rw-inline-add-block input:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

.rw-btn-add-block {
  background: #dc2626 !important;
}
.rw-btn-add-block:hover:not(:disabled) {
  filter: brightness(1.1);
}
.dark .rw-btn-add-block {
  background: #ef4444 !important;
}

/* Color differentiation for Allow Patterns Column */
.rw-pattern-allow-col {
  border-color: rgba(16, 185, 129, 0.32) !important;
  background: rgba(16, 185, 129, 0.02) !important;
}
.dark .rw-pattern-allow-col {
  border-color: rgba(52, 211, 153, 0.32) !important;
  background: rgba(16, 185, 129, 0.05) !important;
}

.rw-title-allow {
  color: #059669 !important;
  font-weight: 700;
}
.dark .rw-title-allow {
  color: #34d399 !important;
}

.rw-inline-add-allow input:focus {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
}

.rw-btn-add-allow {
  background: #059669 !important;
}
.rw-btn-add-allow:hover:not(:disabled) {
  filter: brightness(1.1);
}
.dark .rw-btn-add-allow {
  background: #10b981 !important;
}

@container (max-width: 720px) {
  .rw-patterns-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .rw-patterns-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .rw-input-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    padding: 6px 8px;
  }

  .rw-input-main {
    width: 100%;
    min-width: 0;
    gap: 0.4rem;
  }

  .rw-url-input {
    width: 100%;
    flex: 1;
    min-width: 0;
    font-size: 13px;
  }

  .rw-input-extra {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-top: 5px;
    border-top: 1px solid var(--vp-c-divider);
  }

  .rw-ip-input {
    width: auto;
    flex: 1;
    min-width: 0;
    border-left: none;
    padding: 2px 4px;
    text-align: left;
    font-size: 11.5px;
  }

  .rw-verdict-tag {
    flex-shrink: 0;
  }

  .rw-flags-line {
    gap: 0.5rem;
  }

  .rw-inline-ip {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
    padding-top: 5px;
    border-top: 1px dashed var(--vp-c-divider);
  }

  .rw-inline-ip input {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .rw-vsb-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
  }

  .rw-vsb-actions {
    width: 100%;
    justify-content: space-between;
  }

  .rw-vsb-input {
    flex: 1;
    width: auto;
    min-width: 0;
  }
}

.rw-inline-add {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
}
.rw-inline-add input {
  flex: 1 1 140px;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}
.rw-inline-add input:focus {
  border-color: var(--vp-c-brand-1);
}

.rw-btn-regex-act {
  flex-shrink: 0;
  padding: 5px 9px;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.rw-btn-regex-act:hover:not(:disabled) {
  border-color: #dc2626;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}
.rw-btn-regex-act.green:hover:not(:disabled) {
  border-color: #059669;
  color: #059669;
  background: rgba(16, 185, 129, 0.08);
}
.rw-btn-regex-act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  border-style: dashed;
}
.rw-btn-regex-act.active {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}
.rw-btn-regex-act.green.active {
  background: #059669;
  color: #fff;
  border-color: #059669;
}

.rw-inline-add button[type="submit"] {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 5px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.rw-inline-add button[type="submit"]:hover:not(:disabled) {
  filter: brightness(1.08);
}
.rw-inline-add button[type="submit"]:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Active Chips & Match Highlighting */
.rw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.rw-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 2px 7px;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  border: 1px solid;
  transition: all 0.15s ease;
  max-width: 100%;
  min-width: 0;
}
.rw-chip code {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}
.rw-chip.red {
  background: rgba(239,68,68,0.06);
  border-color: rgba(239,68,68,0.3);
  color: #dc2626;
}
.dark .rw-chip.red { color: #fca5a5; }
.rw-chip.green {
  background: rgba(16,185,129,0.06);
  border-color: rgba(16,185,129,0.3);
  color: #059669;
}
.dark .rw-chip.green { color: #6ee7b7; }

.rw-chip.chip-matched {
  border-color: #dc2626 !important;
  background: rgba(239, 68, 68, 0.18) !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
}
.rw-chip.chip-matched-green {
  border-color: #059669 !important;
  background: rgba(16, 185, 129, 0.18) !important;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}

.rw-match-dot {
  font-size: 9px;
  color: #dc2626;
}
.rw-match-dot.green {
  color: #059669;
}

.rw-chip button {
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0 1px;
  font-size: 10px;
}
.rw-chip button:hover { opacity: 1; }

/* 4. Flags Line */
.rw-flags-line {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
  font-size: 11.5px;
}
.rw-check {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  user-select: none;
  color: var(--vp-c-text-1);
}
.rw-check input {
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}
.rw-inline-ip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}
.rw-inline-ip span { color: var(--vp-c-text-2); font-size: 11px; }
.rw-inline-ip input {
  width: 170px;
  padding: 3px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  outline: none;
}
.rw-inline-ip input:focus { border-color: var(--vp-c-brand-1); }

/* 5. Response */
.rw-resp-opts {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 11.5px;
}
.rw-resp-opts label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--vp-c-text-2);
}
.rw-mode-select, .rw-resp-opts select, .rw-small-num, .rw-mini-select {
  padding: 3px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 11px;
  outline: none;
}
.rw-small-num { width: 60px; }

/* Mode options sub-panel */
.rw-mode-opts-panel {
  padding: 6px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rw-mode-fields {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 11.5px;
}

.rw-wrap-fields {
  flex-wrap: wrap;
}

.rw-field-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rw-flex-1 {
  flex: 1;
  min-width: 130px;
}

.rw-opt-tag {
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.rw-opt-input {
  flex: 1;
  min-width: 120px;
  padding: 3px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 11px;
  outline: none;
}
.rw-opt-input.mono {
  font-family: var(--vp-font-family-mono);
}
.rw-opt-input:focus {
  border-color: var(--vp-c-brand-1);
}

.rw-opt-unit {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--vp-c-text-2);
  font-size: 11px;
}

.rw-silent-note {
  color: var(--vp-c-text-2);
  font-size: 11px;
  line-height: 1.4;
}

.rw-badge-silent {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.dark .rw-badge-silent {
  color: #f87171;
}

.rw-btn-reset-sm {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
}
.rw-btn-reset-sm:hover {
  color: var(--vp-c-text-1);
}

/* 5. Response & Copyable Outputs */
/* Color differentiation for Simulated HTTP Response Card based on verdict */
.rw-copyable-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

.rw-copyable-card.card-verdict-block {
  border-color: rgba(239, 68, 68, 0.35);
}
.rw-copyable-card.card-verdict-block .rw-card-header {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.2);
}
.rw-copyable-card.card-verdict-block .rw-status-num {
  color: #dc2626;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-block .rw-status-num {
  color: #f87171;
}

.rw-copyable-card.card-verdict-allow {
  border-color: rgba(16, 185, 129, 0.35);
}
.rw-copyable-card.card-verdict-allow .rw-card-header {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.2);
}
.rw-copyable-card.card-verdict-allow .rw-status-num {
  color: #059669;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-allow .rw-status-num {
  color: #34d399;
}

.rw-copyable-card.card-verdict-bypass {
  border-color: rgba(14, 165, 233, 0.35);
}
.rw-copyable-card.card-verdict-bypass .rw-card-header {
  background: rgba(14, 165, 233, 0.06);
  border-color: rgba(14, 165, 233, 0.2);
}
.rw-copyable-card.card-verdict-bypass .rw-status-num {
  color: #0284c7;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-bypass .rw-status-num {
  color: #38bdf8;
}

.rw-copyable-card.card-verdict-pass {
  border-color: rgba(100, 116, 139, 0.35);
}
.rw-copyable-card.card-verdict-pass .rw-card-header {
  background: rgba(100, 116, 139, 0.06);
  border-color: rgba(100, 116, 139, 0.2);
}
.rw-copyable-card.card-verdict-pass .rw-status-num {
  color: #475569;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-pass .rw-status-num {
  color: #94a3b8;
}

.rw-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 4px 8px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
  transition: all 0.2s ease;
}

.rw-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 600;
  flex-wrap: wrap;
}

.rw-card-header-right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.rw-terminal-dots {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  margin-right: 2px;
}
.rw-terminal-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.dot-red { background: #ef4444; opacity: 0.85; }
.dot-yellow { background: #eab308; opacity: 0.85; }
.dot-green { background: #22c55e; opacity: 0.85; }

.rw-proto { color: var(--vp-c-text-2); font-size: 10.5px; }
.rw-status-num { color: #059669; font-weight: 600; }
.rw-status-num.red { color: #dc2626; }
.dark .rw-status-num.red { color: #f87171; }
.rw-reason-dim {
  color: var(--vp-c-text-2);
  font-size: 10.5px;
  font-weight: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rw-btn-copy-card {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.rw-btn-copy-card:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.rw-btn-copy-card.copied {
  background: #059669 !important;
  color: #fff !important;
  border-color: #059669 !important;
}

.rw-http-headers {
  padding: 4px 8px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px dashed var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.rw-hdr-line {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  line-height: 1.35;
  display: flex;
  gap: 0.35rem;
}
.rw-hdr-name {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.rw-hdr-val {
  color: var(--vp-c-text-2);
  word-break: break-all;
}

.rw-http-body {
  margin: 0 !important;
  padding: 6px 8px !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
  cursor: text;
  outline: none;
}

.rw-http-note {
  padding: 4px 8px;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 10.5px;
  color: var(--vp-c-text-2);
}

/* 6. Export (Differentiated Copyable Read-Only with Gateway Themes) */
.rw-copyable-block {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.rw-export-block.gw-caddy {
  border-color: rgba(16, 185, 129, 0.35) !important;
  background: rgba(16, 185, 129, 0.02) !important;
}
.dark .rw-export-block.gw-caddy {
  border-color: rgba(52, 211, 153, 0.35) !important;
  background: rgba(16, 185, 129, 0.05) !important;
}

.rw-export-block.gw-traefik {
  border-color: rgba(37, 99, 235, 0.35) !important;
  background: rgba(37, 99, 235, 0.02) !important;
}
.dark .rw-export-block.gw-traefik {
  border-color: rgba(56, 189, 248, 0.35) !important;
  background: rgba(56, 189, 248, 0.05) !important;
}

.rw-export-block.gw-docker {
  border-color: rgba(14, 165, 233, 0.35) !important;
  background: rgba(14, 165, 233, 0.02) !important;
}
.dark .rw-export-block.gw-docker {
  border-color: rgba(14, 165, 233, 0.35) !important;
  background: rgba(14, 165, 233, 0.05) !important;
}

.rw-export-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.rw-export-title {
  font-weight: 700;
}

.rw-gw-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 1px 7px;
  border-radius: 4px;
}

.rw-export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-export-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-export-header-right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

/* Tabs Gateway Differentiation */
.rw-tabs {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.rw-tabs button {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.rw-tabs button:hover:not(.act) {
  border-color: var(--vp-c-text-2);
  color: var(--vp-c-text-1);
}

.rw-tabs button.tab-caddy.act {
  background: rgba(16, 185, 129, 0.14) !important;
  color: #059669 !important;
  border-color: #10b981 !important;
}
.dark .rw-tabs button.tab-caddy.act {
  background: rgba(16, 185, 129, 0.25) !important;
  color: #34d399 !important;
  border-color: #34d399 !important;
}

.rw-tabs button.tab-traefik.act {
  background: rgba(37, 99, 235, 0.14) !important;
  color: #2563eb !important;
  border-color: #3b82f6 !important;
}
.dark .rw-tabs button.tab-traefik.act {
  background: rgba(56, 189, 248, 0.22) !important;
  color: #38bdf8 !important;
  border-color: #38bdf8 !important;
}

.rw-tabs button.tab-docker.act {
  background: rgba(14, 165, 233, 0.14) !important;
  color: #0284c7 !important;
  border-color: #0ea5e9 !important;
}
.dark .rw-tabs button.tab-docker.act {
  background: rgba(14, 165, 233, 0.22) !important;
  color: #38bdf8 !important;
  border-color: #38bdf8 !important;
}

/* Filename Label Gateway Differentiation */
.rw-filename-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1.5px 7px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease;
}

.rw-fn-dot {
  font-size: 8px;
}

.rw-filename-label.fn-caddy {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
  color: #059669;
}
.rw-filename-label.fn-caddy .rw-fn-dot {
  color: #10b981;
}
.dark .rw-filename-label.fn-caddy {
  color: #34d399;
}

.rw-filename-label.fn-traefik {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.3);
  color: #2563eb;
}
.rw-filename-label.fn-traefik .rw-fn-dot {
  color: #3b82f6;
}
.dark .rw-filename-label.fn-traefik {
  color: #38bdf8;
}

.rw-filename-label.fn-docker {
  background: rgba(14, 165, 233, 0.08);
  border-color: rgba(14, 165, 233, 0.3);
  color: #0284c7;
}
.rw-filename-label.fn-docker .rw-fn-dot {
  color: #0ea5e9;
}
.dark .rw-filename-label.fn-docker {
  color: #38bdf8;
}

/* Copy Button Gateway Differentiation */
.rw-btn-copy {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: 1px solid var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.rw-btn-copy:hover {
  filter: brightness(1.1);
}
.rw-btn-copy.btn-copy-caddy {
  background: #059669 !important;
  border-color: #059669 !important;
}
.dark .rw-btn-copy.btn-copy-caddy {
  background: #10b981 !important;
  border-color: #10b981 !important;
}

.rw-btn-copy.btn-copy-traefik {
  background: #2563eb !important;
  border-color: #2563eb !important;
}
.dark .rw-btn-copy.btn-copy-traefik {
  background: #0284c7 !important;
  border-color: #0284c7 !important;
}

.rw-btn-copy.btn-copy-docker {
  background: #0284c7 !important;
  border-color: #0284c7 !important;
}
.dark .rw-btn-copy.btn-copy-docker {
  background: #0ea5e9 !important;
  border-color: #0ea5e9 !important;
}

.rw-btn-copy.copied {
  background: #059669 !important;
  border-color: #059669 !important;
  color: #fff !important;
}

.rw-code-viewport {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: border-color 0.2s ease;
}

.rw-export-block.gw-caddy .rw-code-viewport {
  border-color: rgba(16, 185, 129, 0.35);
}

.rw-export-block.gw-traefik .rw-code-viewport {
  border-color: rgba(37, 99, 235, 0.35);
}

.rw-export-block.gw-docker .rw-code-viewport {
  border-color: rgba(14, 165, 233, 0.35);
}

.rw-export-pre {
  margin: 0 !important;
  padding: 10px 12px !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
  cursor: text;
  outline: none;
}

/* Syntax Highlighting Tokens for Dynamic v-html Output */
.rw-export-pre :deep(.tok-comment) {
  color: #94a3b8 !important;
  font-style: italic;
}
.dark .rw-export-pre :deep(.tok-comment) {
  color: #64748b !important;
}

.rw-export-pre :deep(.tok-keyword) {
  color: #7c3aed !important;
  font-weight: 600;
}
.dark .rw-export-pre :deep(.tok-keyword) {
  color: #c084fc !important;
}

.rw-export-pre :deep(.tok-section) {
  color: #6d28d9 !important;
  font-weight: 700;
}
.dark .rw-export-pre :deep(.tok-section) {
  color: #d8b4fe !important;
}

.rw-export-pre :deep(.tok-key) {
  color: #0284c7 !important;
  font-weight: 600;
}
.dark .rw-export-pre :deep(.tok-key) {
  color: #38bdf8 !important;
}

.rw-export-pre :deep(.tok-str) {
  color: #059669 !important;
}
.dark .rw-export-pre :deep(.tok-str) {
  color: #34d399 !important;
}

.rw-export-pre :deep(.tok-num) {
  color: #d97706 !important;
  font-weight: 600;
}
.dark .rw-export-pre :deep(.tok-num) {
  color: #fbbf24 !important;
}

.rw-export-pre :deep(.tok-bool) {
  color: #db2777 !important;
  font-weight: 600;
}
.dark .rw-export-pre :deep(.tok-bool) {
  color: #f472b6 !important;
}

.rw-export-pre :deep(.tok-verb) {
  color: #2563eb !important;
  font-weight: 700;
}
.dark .rw-export-pre :deep(.tok-verb) {
  color: #60a5fa !important;
}

.rw-export-pre :deep(.tok-punct) {
  color: var(--vp-c-text-3) !important;
}

.rw-export-pre :deep(.tok-val) {
  color: var(--vp-c-text-1) !important;
}

/* Enhanced Verbs Selector in Flags Section */
.rw-verbs-selector-bar {
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px dashed var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rw-vsb-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-vsb-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rw-vsb-desc {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.rw-vsb-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-vsb-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.rw-vsb-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rw-vsb-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.rw-vsb-pill.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.rw-vsb-mark {
  font-size: 9px;
  font-weight: 800;
}

.rw-vsb-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rw-vsb-all-btn {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.rw-vsb-all-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.rw-vsb-input {
  width: 140px;
  font-size: 10.5px;
  font-family: var(--vp-font-family-mono);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
}

.rw-vsb-input:focus {
  border-color: var(--vp-c-brand-1);
}

/* Simulation Results for Each Verb */
.rw-verb-sim-section {
  margin: 0.4rem 0 0.6rem;
}

.rw-sim-matrix-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px 8px;
}

.rw-sm-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-sm-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-sm-desc {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.rw-sm-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.rw-sim-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  background: var(--vp-c-bg);
}

.rw-sim-pill:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.rw-sim-pill.active {
  box-shadow: 0 0 0 2px var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.rw-sp-dot {
  font-size: 8px;
}

.rw-sim-pill.verdict-block .rw-sp-dot {
  color: #ef4444;
}

.rw-sim-pill.verdict-allow .rw-sp-dot {
  color: #10b981;
}

.rw-sim-pill.verdict-bypass .rw-sp-dot {
  color: #0ea5e9;
}

.rw-sim-pill.verdict-pass .rw-sp-dot {
  color: #64748b;
}

.rw-sp-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-sp-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}

.rw-sim-pill.verdict-block .rw-sp-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}
.dark .rw-sim-pill.verdict-block .rw-sp-badge {
  color: #f87171;
}

.rw-sim-pill.verdict-allow .rw-sp-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
}
.dark .rw-sim-pill.verdict-allow .rw-sp-badge {
  color: #34d399;
}

.rw-sim-pill.verdict-bypass .rw-sp-badge {
  background: rgba(56, 189, 248, 0.2);
  color: #0284c7;
}
.dark .rw-sim-pill.verdict-bypass .rw-sp-badge {
  color: #38bdf8;
}

.rw-sim-pill.verdict-pass .rw-sp-badge {
  background: rgba(100, 116, 139, 0.2);
  color: #475569;
}
.dark .rw-sim-pill.verdict-pass .rw-sp-badge {
  color: #94a3b8;
}

.rw-sp-code {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
</style>

<style>
/* Unscoped token rules for dynamically injected v-html elements */
.rw-export-pre .tok-comment { color: #94a3b8 !important; font-style: italic; }
.dark .rw-export-pre .tok-comment { color: #64748b !important; }
.rw-export-pre .tok-keyword { color: #7c3aed !important; font-weight: 600; }
.dark .rw-export-pre .tok-keyword { color: #c084fc !important; }
.rw-export-pre .tok-section { color: #6d28d9 !important; font-weight: 700; }
.dark .rw-export-pre .tok-section { color: #d8b4fe !important; }
.rw-export-pre .tok-key { color: #0284c7 !important; font-weight: 600; }
.dark .rw-export-pre .tok-key { color: #38bdf8 !important; }
.rw-export-pre .tok-str { color: #059669 !important; }
.dark .rw-export-pre .tok-str { color: #34d399 !important; }
.rw-export-pre .tok-num { color: #d97706 !important; font-weight: 600; }
.dark .rw-export-pre .tok-num { color: #fbbf24 !important; }
.rw-export-pre .tok-bool { color: #db2777 !important; font-weight: 600; }
.dark .rw-export-pre .tok-bool { color: #f472b6 !important; }
.rw-export-pre .tok-verb { color: #2563eb !important; font-weight: 700; }
.dark .rw-export-pre .tok-verb { color: #60a5fa !important; }
.rw-export-pre .tok-punct { color: var(--vp-c-text-3) !important; }
.rw-export-pre .tok-val { color: var(--vp-c-text-1) !important; }
</style>

