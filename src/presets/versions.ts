/** Managed dependency versions for reproducible installs */
export const DEPS_VERSIONS: Record<string, string> = {
  // ESLint core
  eslint: '^9.18.0',
  '@eslint/js': '^9.18.0',

  // TypeScript ESLint
  'typescript-eslint': '^8.20.0',

  // Prettier integration (node/nest style: eslint-plugin-prettier)
  'eslint-plugin-prettier': '^5.2.2',
  'eslint-config-prettier': '^10.0.0',

  // Vue ESLint
  '@vue/eslint-config-typescript': '^0.5.1',
  '@vue/eslint-config-prettier': '^0.5.1',
  'eslint-plugin-vue': '^10.0.0',

  // Prettier
  prettier: '^3.4.2',

  // Stylelint core
  stylelint: '^16.18.0',
  'stylelint-config-standard-scss': '^14.0.0',
  'stylelint-order': '^7.0.0',
  'stylelint-scss': '^6.12.0',
  '@stylistic/stylelint-plugin': '^3.1.0',
  'postcss-html': '^1.7.0',
  'postcss-scss': '^4.0.0',

  // CSpell
  cspell: '^8.16.0',
}

/** Resolve versions for a list of package names */
export function resolveVersions(packages: string[]): string[] {
  return packages.map(pkg => {
    const version = DEPS_VERSIONS[pkg]
    return version ? `${pkg}@${version}` : pkg
  })
}
