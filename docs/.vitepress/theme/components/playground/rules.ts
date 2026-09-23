export interface BuiltInRule {
  id: string
  pattern: string
  category: string
  description: string
}

export const DEFAULT_BLOCK_RULES: BuiltInRule[] = [
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
  },
  {
    id: 'block-keys',
    pattern: '(?i).*\\.(pem|key|crt|pfx|p12|jks|kdb)$',
    category: 'TLS Keys & Keystores',
    description: 'Private keys, TLS certificates, pfx/p12 keystores (.key, .pem, .crt, .p12)'
  },
  {
    id: 'block-container',
    pattern: '(?i)(^|/)(dockerfile.*|docker-compose.*\\.ya?ml)$',
    category: 'Container Manifests',
    description: 'Dockerfile, docker-compose.yml, docker-compose.prod.yaml'
  },
  {
    id: 'block-metadata',
    pattern: '(?i)(^|/)\\.ds_store$',
    category: 'OS Metadata',
    description: '.DS_Store directory structure leaks'
  },
  {
    id: 'block-cms-configs',
    pattern: '(?i)(^|/)(wp-config\\.php.*|configuration\\.php.*|settings\\.py|local_settings\\.py)$',
    category: 'CMS & Framework Configs',
    description: 'wp-config.php, Joomla configuration.php, Django settings.py'
  }
]

export const DEFAULT_ALLOW_RULES: BuiltInRule[] = [
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

export interface PresetItem {
  label: string
  method: string
  path: string
  ip: string
}

export const PRESETS: PresetItem[] = [
  { label: '.env', method: 'GET', path: '/%252e%252e/.env', ip: '198.51.100.42' },
  { label: '.git', method: 'GET', path: '/static;p=1/.git/config', ip: '198.51.100.42' },
  { label: 'db.sql', method: 'GET', path: '\\backups\\db.sql%00', ip: '198.51.100.42' },
  { label: 'phpinfo', method: 'GET', path: '/phpinfo.php', ip: '198.51.100.42' },
  { label: 'POST Bypass', method: 'POST', path: '/.env', ip: '198.51.100.42' },
  { label: 'robots.txt', method: 'GET', path: '/robots.txt', ip: '198.51.100.42' },
  { label: '.well-known', method: 'GET', path: '/.well-known/acme-challenge/token', ip: '198.51.100.42' },
  { label: 'IP Bypass', method: 'GET', path: '/.env', ip: '10.5.0.25' }
]

export const STANDARD_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const
