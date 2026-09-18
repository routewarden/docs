import fs from 'node:fs'
import path from 'node:path'

/**
 * Core version syncing logic
 * @param {Object} options
 * @param {string} [options.rootDir]
 * @param {string} [options.version]
 * @returns {{ updatedFiles: string[], targetVersion: string }}
 */
export function syncVersion(options = {}) {
  const rootDir = options.rootDir || process.cwd()
  const versionFilePath = path.join(rootDir, 'docs/version.json')

  let targetVersion = options.version
  if (!targetVersion) {
    if (!fs.existsSync(versionFilePath)) {
      throw new Error(`Error: ${versionFilePath} not found`)
    }
    const data = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))
    targetVersion = data.version
  }

  const cleanVersion = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`
  const semver = cleanVersion.replace(/^v/, '')
  const versionParts = semver.split('.')
  const seriesTag = `v${versionParts[0]}.${versionParts[1]}.x`
  const updatedFiles = []

  // 1. Ensure package.json version matches (without leading 'v')
  const pkgPath = path.join(rootDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    if (pkg.version !== semver) {
      pkg.version = semver
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
      updatedFiles.push('package.json')
    }
  }

  // 2. Synchronize docs/versions.json current series and latest entry
  const versionsJsonPath = path.join(rootDir, 'docs/versions.json')
  if (fs.existsSync(versionsJsonPath)) {
    const registry = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'))
    let changed = false

    if (registry.current !== seriesTag) {
      registry.current = seriesTag
      changed = true
    }

    if (Array.isArray(registry.versions) && registry.versions.length > 0) {
      const latest = registry.versions[0]
      const expectedText = `${seriesTag} (Latest)`
      if (latest.tag !== seriesTag || latest.text !== expectedText) {
        latest.tag = seriesTag
        latest.text = expectedText
        changed = true
      }
    }

    if (changed) {
      fs.writeFileSync(versionsJsonPath, JSON.stringify(registry, null, 2) + '\n', 'utf8')
      updatedFiles.push('docs/versions.json')
    }
  }

  // 3. Synchronize README.md, docs, and any static examples
  const filesToSync = [
    'README.md',
    'VERSIONING.md',
    'examples/01-basic-sensitive-files/docker-compose.yml',
    'examples/02-global-entrypoint-shield/docker-compose.yml',
    'examples/03-ip-whitelist-vpn/docker-compose.yml',
    'examples/04-captcha-challenge/docker-compose.yml',
    'examples/05-kubernetes-ingressroute/README.md'
  ]

  // Add all markdown files in docs/ (excluding frozen archive directories like docs/v0.1, docs/v0.2, etc.)
  const docsDir = path.join(rootDir, 'docs')
  if (fs.existsSync(docsDir)) {
    const scanDocs = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relPath = path.relative(rootDir, fullPath)
        if (entry.isDirectory()) {
          // Skip frozen archived versions (e.g., docs/v0.1, docs/v0.2) and internal VitePress caches
          if (/^docs\/v\d+\.\d+/.test(relPath) || relPath.startsWith('docs/.vitepress')) {
            continue
          }
          scanDocs(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          if (!filesToSync.includes(relPath)) {
            filesToSync.push(relPath)
          }
        }
      }
    }
    scanDocs(docsDir)
  }

  for (const relPath of filesToSync) {
    const filePath = path.join(rootDir, relPath)
    if (!fs.existsSync(filePath)) {
      continue
    }

    let content = fs.readFileSync(filePath, 'utf8')
    const original = content

    // Match CLI flag: --experimental.plugins.routewarden.version=vX.Y.Z
    content = content.replace(
      /(--experimental\.plugins\.routewarden\.version=)v?[0-9]+\.[0-9]+\.[0-9]+/g,
      `$1${cleanVersion}`
    )

    // Match YAML property: version: vX.Y.Z
    content = content.replace(
      /(version:\s+)v?[0-9]+\.[0-9]+\.[0-9]+/g,
      `$1${cleanVersion}`
    )

    // Match xcaddy tag: github.com/routewarden/caddy-warden@vX.Y.Z
    content = content.replace(
      /(github\.com\/routewarden\/caddy-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
      `$1${cleanVersion}`
    )

    // Match Traefik plugin tag if present: github.com/routewarden/traefik-warden@vX.Y.Z
    content = content.replace(
      /(github\.com\/routewarden\/traefik-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
      `$1${cleanVersion}`
    )

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8')
      updatedFiles.push(relPath)
    }
  }

  return { updatedFiles, targetVersion: cleanVersion }
}

// Auto-run when executed directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { updatedFiles, targetVersion } = syncVersion()
  console.log(`🔄 Synced RouteWarden version: ${targetVersion}`)
  console.log(`✨ Successfully synced version to ${updatedFiles.length} file(s)!`)
}
