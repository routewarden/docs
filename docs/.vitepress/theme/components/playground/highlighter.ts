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

function highlightNginxLine(line: string): string {
  if (/^\s*(#|--)/.test(line)) return `<span class="tok-comment">${escapeSnippetHtml(line)}</span>`
  const kwMatch = line.match(/^(\s*)(init_by_lua_block|access_by_lua_block|server|location|local|return)(\s*.*)$/)
  if (kwMatch) {
    const [, indent, kw, rest] = kwMatch
    return `${indent}<span class="tok-keyword">${escapeSnippetHtml(kw)}</span>${highlightValueTokens(rest)}`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+)(\s*=\s*)(.*)$/)
  if (kv) {
    const [, indent, key, eq, val] = kv
    return `${indent}<span class="tok-key">${escapeSnippetHtml(key)}</span><span class="tok-punct">${eq}</span>${highlightValueTokens(val)}`
  }
  const ngxDirectives = line.match(/^(\s*)(listen|server_name|proxy_pass|proxy_set_header|root|index)(\s+)(.*);$/)
  if (ngxDirectives) {
    const [, indent, directive, space, rest] = ngxDirectives
    return `${indent}<span class="tok-keyword">${escapeSnippetHtml(directive)}</span>${space}${highlightValueTokens(rest)}<span class="tok-punct">;</span>`
  }
  return escapeSnippetHtml(line)
}

function highlightJsonLine(line: string): string {
  const kv = line.match(/^(\s*)("([^\\"]|\\.)*")(\s*:\s*)(.*)$/)
  if (kv) {
    const [, indent, keyStr, , colon, val] = kv
    const isSchemaKey = keyStr === '"$schema"'
    const keyClass = isSchemaKey ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${escapeSnippetHtml(keyStr)}</span><span class="tok-punct">${colon}</span>${highlightValueTokens(val)}`
  }
  return highlightValueTokens(line)
}

export function highlightSnippet(code: string, format: string): string {
  if (!code) return ''
  const lines = code.split('\n')

  if (format === 'json') {
    return lines.map(line => highlightJsonLine(line)).join('\n')
  }

  if (format === 'caddy') {
    return lines.map(line => highlightCaddyLine(line)).join('\n')
  }

  if (format === 'nginx') {
    return lines.map(line => highlightNginxLine(line)).join('\n')
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

  if (format === 'k8s_nginx') {
    let inNginxSnippet = false
    return lines.map(line => {
      if (/(server-snippet|configuration-snippet):\s*\|/.test(line)) {
        inNginxSnippet = true
        return highlightYamlLine(line)
      }
      if (inNginxSnippet && /^\s*(spec|status|metadata):/.test(line)) {
        inNginxSnippet = false
      }
      if (inNginxSnippet) {
        return highlightNginxLine(line)
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
      const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+):(\s*)(.*)$/)
      if (kv) {
        const [, indent, key, space, val] = kv
        return `${indent}<span class="${keyClass(key)}">${escapeSnippetHtml(key)}</span><span class="tok-punct">:</span>${space}${highlightValueTokens(val)}`
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

  if (format === 'cli_json') {
    return lines.map(line => {
      const kv = line.match(/^(\s*)(".*?"):\s*(.*)$/)
      if (kv) {
        return `${kv[1]}<span class="tok-key">${escapeSnippetHtml(kv[2])}</span><span class="tok-punct">:</span> ${highlightValueTokens(kv[3])}`
      }
      return highlightValueTokens(line)
    }).join('\n')
  }

  if (format === 'cli_cmd') {
    return lines.map(line => {
      if (/^\s*#/.test(line)) return `<span class="tok-comment">${escapeSnippetHtml(line)}</span>`
      return line.replace(/\b(rwarden|validate|test|check|--\w+)\b/g, '<span class="tok-keyword">$1</span>')
    }).join('\n')
  }

  return escapeSnippetHtml(code)
}

function keyClass(key: string): string {
  return ['http', 'middlewares', 'plugin', 'services', 'traefik', 'spec', 'metadata', 'apiVersion', 'kind', 'data'].includes(key) ? 'tok-keyword' : 'tok-key'
}
