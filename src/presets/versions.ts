/** Managed dependency versions for reproducible installs */
export const DEPS_VERSIONS: Record<string, string> = {
  eslint: "^10.2.0",
  "@eslint/js": "^10.0.1",
  "typescript-eslint": "^8.58.0",
  "eslint-plugin-prettier": "^5.5.5",
  "eslint-config-prettier": "^10.1.8",
  "@vue/eslint-config-typescript": "^14.7.0",
  "@vue/eslint-config-prettier": "^10.2.0",
  "eslint-plugin-vue": "^10.8.0",
  prettier: "^3.8.1",
  stylelint: "^17.6.0",
  "stylelint-config-standard-scss": "^17.0.0",
  "stylelint-order": "^8.1.1",
  "stylelint-scss": "^7.0.0",
  "@stylistic/stylelint-plugin": "^5.1.0",
  "postcss-html": "^1.8.1",
  "postcss-scss": "^4.0.9",
  cspell: "^10.0.0",
};

/** Resolve versions for a list of package names */
export function resolveVersions(packages: string[]): string[] {
  return packages.map((pkg) => {
    const version = DEPS_VERSIONS[pkg];
    return version ? `${pkg}@${version}` : pkg;
  });
}
