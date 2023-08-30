import { http } from 'gluegun'
import { parseGitDiff } from '../tools/parseGitDiff'

type FetchOptions = {
  currentVersion: string
  targetVersion: string
}

// format: https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.70.5..0.71.4.diff

/**
 * Fetches the diff between versions from the rn-diff-purge repo
 */
export async function fetchRNDiff({ currentVersion, targetVersion }: FetchOptions) {
  const baseURL = `https://raw.githubusercontent.com`
  const diffPath = `/react-native-community/rn-diff-purge/diffs/diffs/${currentVersion}..${targetVersion}.diff`
  const diffResponse = await http.create({ baseURL }).get(diffPath)
  const diff = diffResponse.data as string | null

  // if the diff is null, we don't have a diff for this
  if (!diff) {
    return {
      error: `\n   We don't have a diff for upgrading from ${currentVersion} to ${targetVersion}.
URL: ${baseURL + diffPath}\n`,
    }
  }

  // pull the files that changed from the git diff
  const files = parseGitDiff(diff)

  return { files, diff }
}
