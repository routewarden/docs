/**
 * useCodeSnippet — Utility to build highlighted, diff-aware HTML for CodeViewer snippets.
 *
 * Supports diff markers in code strings:
 *   - Lines ending with  `# [!code ++]` or `// [!code ++]`  → <span class="line diff add">
 *   - Lines ending with  `# [!code --]` or `// [!code --]`  → <span class="line diff remove">
 *   - All other lines → <span class="line">
 *
 * The returned HTML is intended for use with `v-html` inside `.rw-snippet-html`.
 */

export type SnippetLang =
  | 'yaml'
  | 'toml'
  | 'caddy'
  | 'nginx'
  | 'lua'
  | 'json'
  | 'docker'
  | 'dockerfile'
  | 'bash'
  | 'plaintext'

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function stripDiffMarker(line: string): { text: string; type: 'add' | 'remove' | null } {
  // Strip trailing diff markers (or before trailing line-continuation backslash: `\ # [!code ++]`)
  const addMarker = / # \[!code \+\+\]| \/\/ \[!code \+\+\]| <!-- \[!code \+\+\] -->/
  const removeMarker = / # \[!code --\]| \/\/ \[!code --\]| <!-- \[!code --\] -->/

  if (addMarker.test(line)) {
    return { text: line.replace(addMarker, ''), type: 'add' }
  }
  if (removeMarker.test(line)) {
    return { text: line.replace(removeMarker, ''), type: 'remove' }
  }
  return { text: line, type: null }
}

// ─── Per-lang token highlighters ────────────────────────────────────────────

function highlightValue(val: string): string {
  // If there's an inline comment (e.g. # comment), preserve and highlight it at end
  let commentStr = ''
  let valPart = val
  const commentMatch = val.match(/(\s+#.*)$/)
  if (commentMatch) {
    commentStr = `<span class="tok-comment">${esc(commentMatch[1])}</span>`
    valPart = val.slice(0, val.length - commentMatch[1].length)
  }

  const tokens = valPart.replace(
    /(\"(?:\\.|[^\"\\])*\"|'[^']*'|`[^`]*`|\b(?:true|false|on|off)\b|\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b|\b\d+\b|\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b|[\[\]{},=]|[^\"'\[\]{},=\s]+|\s+)/g,
    (m) => {
      if (/^\"(?:\\.|[^\"\\])*\"$/.test(m) || /^'[^']*'$/.test(m) || /^`[^`]*`$/.test(m)) return `<span class="tok-str">${esc(m)}</span>`
      if (/^(true|false|on|off)$/.test(m)) return `<span class="tok-bool">${m}</span>`
      if (/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/.test(m)) return `<span class="tok-num">${m}</span>`
      if (/^\d+$/.test(m)) return `<span class="tok-num">${m}</span>`
      if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/.test(m)) return `<span class="tok-verb">${m}</span>`
      if (/^[\[\]{},=]$/.test(m)) return `<span class="tok-punct">${m}</span>`
      if (/^\s+$/.test(m)) return m
      return `<span class="tok-val">${esc(m)}</span>`
    }
  )

  return tokens + commentStr
}

const YAML_STRUCT_KEYS = new Set(['http', 'middlewares', 'plugin', 'services', 'traefik', 'spec', 'metadata', 'apiVersion', 'kind', 'data', 'routers', 'entryPoints', 'loadBalancer', 'servers', 'response', 'experimental', 'localPlugins'])

function highlightYamlLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const listStr = line.match(/^(\s*-\s+)(\"(?:\\.|[^\"\\])*\"|[^\"\\s].*)$/)
  if (listStr) {
    return `${listStr[1].replace('-', '<span class="tok-punct">-</span>')}${highlightValue(listStr[2])}`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+):(\s*)(.*)$/)
  if (kv) {
    const [, indent, key, space, val] = kv
    const keyClass = YAML_STRUCT_KEYS.has(key) ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${esc(key)}</span><span class="tok-punct">:</span>${space}${highlightValue(val)}`
  }
  return esc(line)
}

function highlightTomlLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const sec = line.match(/^(\s*)(\[[^\]]+\])(\s*)$/)
  if (sec) return `${sec[1]}<span class="tok-section">${esc(sec[2])}</span>${sec[3]}`
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+)(\s*=\s*)(.*)$/)
  if (kv) {
    const [, indent, key, , val] = kv
    return `${indent}<span class="tok-key">${esc(key)}</span> <span class="tok-punct">=</span> ${highlightValue(val)}`
  }
  return highlightValue(line)
}

function highlightCaddyLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  if (/^\s*\}\s*$/.test(line)) {
    const m = line.match(/^(\s*)(\})(\s*)$/)
    if (m) return `${m[1]}<span class="tok-punct">}</span>${m[3]}`
  }
  const m = line.match(/^(\s*)([a-zA-Z0-9_.:-]+)(.*)$/)
  if (!m) return esc(line)
  const [, indent, firstWord, rest] = m
  let wordClass = 'tok-key'
  if (['routewarden', 'route_warden', 'reverse_proxy', 'order', 'tls'].includes(firstWord)) {
    wordClass = 'tok-keyword'
  } else if (firstWord.includes('.') && rest.includes('{')) {
    wordClass = 'tok-section'
  }
  return `${indent}<span class="${wordClass}">${esc(firstWord)}</span>${highlightValue(rest)}`
}

function highlightNginxLine(line: string): string {
  if (/^\s*(#|--)/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const kwMatch = line.match(/^(\s*)(init_by_lua_block|access_by_lua_block|server|location|local|return|http)(\s*.*)$/)
  if (kwMatch) {
    const [, indent, kw, rest] = kwMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span>${highlightValue(rest)}`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+)(\s*=\s*)(.*)$/)
  if (kv) {
    const [, indent, key, eq, val] = kv
    return `${indent}<span class="tok-key">${esc(key)}</span><span class="tok-punct">${eq}</span>${highlightValue(val)}`
  }
  const ngx = line.match(/^(\s*)(listen|server_name|proxy_pass|proxy_set_header|root|index|lua_package_path|set_real_ip_from|real_ip_header|real_ip_recursive|allow|deny|ssl_certificate|ssl_certificate_key|access_log|error_log)(\s+)(.*);$/)
  if (ngx) {
    const [, indent, directive, space, rest] = ngx
    return `${indent}<span class="tok-keyword">${esc(directive)}</span>${space}${highlightValue(rest)}<span class="tok-punct">;</span>`
  }
  return esc(line)
}

function highlightJsonLine(line: string): string {
  // Comment lines (non-standard but used in examples)
  if (/^\s*\/\//.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const kv = line.match(/^(\s*)(\"([^\\"]|\\.)*\")(\s*:\s*)(.*)$/)
  if (kv) {
    const [, indent, keyStr, , colon, val] = kv
    const isSchemaKey = keyStr === '"$schema"'
    const keyClass = isSchemaKey ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${esc(keyStr)}</span><span class="tok-punct">${colon}</span>${highlightValue(val)}`
  }
  return highlightValue(line)
}

function highlightDockerComposeLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  // Docker label string
  const labelMatch = line.match(/^(\s*-\s*)\"([^=]+)=(.*)\"$/)
  if (labelMatch) {
    const [, indentDash, labelKey, labelVal] = labelMatch
    const dash = indentDash.replace('-', '<span class="tok-punct">-</span>')
    const valHtml = /^(true|false)$/.test(labelVal)
      ? `<span class="tok-bool">${labelVal}</span>`
      : /^\d+$/.test(labelVal)
        ? `<span class="tok-num">${labelVal}</span>`
        : `<span class="tok-str">${esc(labelVal)}</span>`
    return `${dash}<span class="tok-punct">&quot;</span><span class="tok-key">${esc(labelKey)}</span><span class="tok-punct">=</span>${valHtml}<span class="tok-punct">&quot;</span>`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+):(\s*)(.*)$/)
  if (kv) {
    const [, indent, key, space, val] = kv
    const DOCKER_STRUCT = new Set(['version', 'services', 'networks', 'volumes', 'labels', 'environment', 'depends_on', 'ports', 'command'])
    const keyClass = DOCKER_STRUCT.has(key) ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${esc(key)}</span><span class="tok-punct">:</span>${space}${highlightValue(val)}`
  }
  return esc(line)
}

function highlightDockerfileLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const instr = line.match(/^(FROM|RUN|COPY|ADD|ENV|EXPOSE|WORKDIR|CMD|ENTRYPOINT|ARG|LABEL|USER|VOLUME|STOPSIGNAL|HEALTHCHECK|SHELL)(\s+.*)$/)
  if (instr) {
    const [, cmd, rest] = instr
    return `<span class="tok-keyword">${cmd}</span>${esc(rest)}`
  }
  return esc(line)
}

function highlightBashLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`

  // Tokenize the bash line to avoid substring collisions
  // Patterns: strings ("..." or '...'), flags (-v, --header, --flag=val), keywords (commands)
  const tokenRegex = /(\"[^\"]*\"|'[^']*')|(\b(?:traefik|xcaddy|rwarden|curl|wget|docker|kubectl|helm|bash|sh|echo|export|source|grep|cscli|go)\b)|(--[a-zA-Z0-9_.-]+(?:=[^\s\\]+)?|-[a-zA-Z0-9]+)/g

  let lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(line)) !== null) {
    // Add text before match, escaped
    if (match.index > lastIndex) {
      result += esc(line.slice(lastIndex, match.index))
    }

    const [full, str, kw, flag] = match
    if (str !== undefined) {
      result += `<span class="tok-str">${esc(str)}</span>`
    } else if (kw !== undefined) {
      result += `<span class="tok-keyword">${esc(kw)}</span>`
    } else if (flag !== undefined) {
      const eqIdx = flag.indexOf('=')
      if (eqIdx !== -1) {
        const flagName = flag.slice(0, eqIdx)
        const flagVal = flag.slice(eqIdx + 1)
        result += `<span class="tok-key">${esc(flagName)}</span><span class="tok-punct">=</span>${highlightValue(flagVal)}`
      } else {
        result += `<span class="tok-key">${esc(flag)}</span>`
      }
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < line.length) {
    result += esc(line.slice(lastIndex))
  }

  return result
}

function highlightLuaLine(line: string): string {
  // Comments: -- comment
  const commentMatch = line.match(/^(\s*)(--.*)$/)
  if (commentMatch) {
    const [, indent, comment] = commentMatch
    return `${indent}<span class="tok-comment">${esc(comment)}</span>`
  }

  // Trailing comment
  let codePart = line
  let trailingComment = ''
  const trailingIdx = line.indexOf('--')
  if (trailingIdx !== -1) {
    codePart = line.slice(0, trailingIdx)
    trailingComment = `<span class="tok-comment">${esc(line.slice(trailingIdx))}</span>`
  }

  // Bracket key: ["X-Frame-Options"] = "DENY"
  const bracketKey = codePart.match(/^(\s*)(\[\"[^\"]+\"\])(\s*=\s*)(.*)$/)
  if (bracketKey) {
    const [, indent, key, eq, val] = bracketKey
    return `${indent}<span class="tok-key">${esc(key)}</span><span class="tok-punct">${eq}</span>${highlightValue(val)}${trailingComment}`
  }

  // Key-value pair: key = val, or key = val
  const kv = codePart.match(/^(\s*)([a-zA-Z0-9_]+)(\s*=\s*)(.*)$/)
  if (kv) {
    const [, indent, key, eq, val] = kv
    const isWarden = key === 'warden'
    const keyClass = isWarden ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${esc(key)}</span><span class="tok-punct">${eq}</span>${highlightValue(val)}${trailingComment}`
  }

  // Function calls like routewarden.new({
  const callMatch = codePart.match(/^(\s*)([a-zA-Z0-9_.]+)(\s*\()(.*)$/)
  if (callMatch) {
    const [, indent, fn, openParen, rest] = callMatch
    return `${indent}<span class="tok-keyword">${esc(fn)}</span><span class="tok-punct">${openParen}</span>${highlightValue(rest)}${trailingComment}`
  }

  // Return, local, etc.
  const kwMatch = codePart.match(/^(\s*)(local|return|function|if|then|else|elseif|end)(\s+.*|\s*)$/)
  if (kwMatch) {
    const [, indent, kw, rest] = kwMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span>${highlightValue(rest)}${trailingComment}`
  }

  if (trailingComment) {
    return `${highlightValue(codePart)}${trailingComment}`
  }

  return highlightValue(line)
}

function highlightLine(line: string, lang: SnippetLang): string {
  switch (lang) {
    case 'yaml': return highlightYamlLine(line)
    case 'toml': return highlightTomlLine(line)
    case 'caddy': return highlightCaddyLine(line)
    case 'nginx': return highlightNginxLine(line)
    case 'lua': return highlightLuaLine(line)
    case 'json': return highlightJsonLine(line)
    case 'docker': return highlightDockerComposeLine(line)
    case 'dockerfile': return highlightDockerfileLine(line)
    case 'bash': return highlightBashLine(line)
    default: return esc(line)
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface SnippetOptions {
  /** The raw code string, may contain [!code ++] / [!code --] markers */
  code: string
  lang: SnippetLang
}

/**
 * Returns { html, hasDiff, cleanCode } for a given snippet.
 *
 * - `html`      — highlighted HTML string, safe for `v-html` inside `.rw-snippet-html`
 * - `hasDiff`   — true if any line was annotated with [!code ++] or [!code --]
 * - `cleanCode` — the code without any [!code *] markers (for clipboard copy)
 */
export function buildSnippet(opts: SnippetOptions): { html: string; hasDiff: boolean; cleanCode: string } {
  const rawLines = opts.code.split('\n')
  let hasDiff = false
  const cleanLines: string[] = []
  const htmlLines: string[] = []

  for (const rawLine of rawLines) {
    const { text, type } = stripDiffMarker(rawLine)
    if (type) hasDiff = true
    cleanLines.push(text)

    const highlighted = highlightLine(text, opts.lang)
    if (type === 'add') {
      htmlLines.push(`<span class="line diff add">${highlighted}</span>`)
    } else if (type === 'remove') {
      htmlLines.push(`<span class="line diff remove">${highlighted}</span>`)
    } else {
      htmlLines.push(`<span class="line">${highlighted}</span>`)
    }
  }

  const preClass = hasDiff ? 'has-diff' : ''
  // Join without \n to avoid whitespace text-nodes that create gaps between display:block .line spans
  const html = `<pre class="${preClass}"><code>${htmlLines.join('')}</code></pre>`

  return {
    html,
    hasDiff,
    cleanCode: cleanLines.join('\n')
  }
}
