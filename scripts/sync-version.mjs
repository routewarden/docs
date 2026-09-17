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

  const updatedFiles = []

  // Ensure package.json version matches (without leading 'v')
  const pkgPath = path.join(rootDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    const semver = targetVersion.replace(/^v/, '')
    if (pkg.version !== semver) {
      pkg.version = semver
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
      updatedFiles.push('package.json')
    }
  }

  return { updatedFiles, targetVersion }
}

// Auto-run when executed directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { updatedFiles, targetVersion } = syncVersion()
  console.log(`🔄 Synced RouteWarden version: ${targetVersion}`)
  console.log(`✨ Successfully synced version to ${updatedFiles.length} file(s)!`)
}
