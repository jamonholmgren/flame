import { filesystem, http } from 'gluegun'
import { CLIOptions } from '../types'

type FetchOptions = {
  dir: string
  options?: CLIOptions
}

export async function fetchRNAppInfo({ dir, options }: FetchOptions) {
  // Fetch the versions from the --from and --to options, or default to auto
  let currentVersion = options!.from || 'auto'
  let targetVersion = options!.to || 'auto'

  // Load up the package.json file from the provided folder path
  const packageJson = await filesystem.readAsync(`${dir}/package.json`, 'json')

  // If we can't find a package.json file, or there isn't a react-native dependency, stop
  if (!packageJson || !packageJson.dependencies || !packageJson.dependencies['react-native']) {
    return {
      error: `Couldn't find a react-native dependency in package.json.\nMake sure you're in the right folder, or specify a folder to upgrade.`,
    }
  }

  // Get the current version from package.json if auto
  if (currentVersion === 'auto') currentVersion = packageJson.dependencies['react-native']

  if (!currentVersion) {
    return {
      error: `Couldn't find a react-native dependency in package.json.\nMake sure you're in the right folder or specify it with the --from=<version> option.`,
    }
  }

  // Get the target version from npm if auto
  if (targetVersion === 'auto') {
    const npmResponse = await http.create({ baseURL: 'https://registry.npmjs.org' }).get(`/react-native`)
    const npmPackageJson = npmResponse.data as { 'dist-tags': { latest: string } }
    targetVersion = npmPackageJson['dist-tags'].latest
  }

  const appJson = await filesystem.readAsync(`${dir}/app.json`, 'json')

  const appNameKebabCase: string = packageJson.name || appJson.name
  const appDisplayName: string = appJson.displayName
  const appNameLowercase: string = appDisplayName.toLowerCase()

  const replacePlaceholder = (name: string) =>
    name
      .replace(/^RnDiffApp/, '.')
      .replace(/RnDiffApp/g, appDisplayName)
      .replace(/rndiffapp/g, appNameLowercase)
      .replace('rn-diff-app', appNameKebabCase)

  // if targetVersion and currentVersion are the same, we're already on the latest version
  if (targetVersion === currentVersion) {
    return {
      error: `You're already on version ${currentVersion}.\nIf you need to specify a particular version, use the --from and --to options.\n`,
    }
  }

  return {
    appNameKebabCase,
    appDisplayName,
    appNameLowercase,
    currentVersion,
    targetVersion,
    replacePlaceholder,
  }
}
