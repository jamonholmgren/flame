import { http } from 'gluegun'
import { parseGitDiff } from '../utils/parseGitDiff'
import { loadCachedResponse, saveCachedResponse } from '../utils/persistCache'

type FetchOptions = {
  currentVersion: string
  targetVersion: string
  cacheFile?: string
}

// format: https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.70.5..0.71.4.diff

/**
 * Fetches the diff between versions from the rn-diff-purge repo
 */
export async function fetchRNDiff({ currentVersion, targetVersion, cacheFile }: FetchOptions) {
  const baseURL = `https://raw.githubusercontent.com`
  const diffPath = `/react-native-community/rn-diff-purge/diffs/diffs/${currentVersion}..${targetVersion}.diff`

  // if cached, use that
  let diff: string | null = null
  if (cacheFile) {
    const cachedDiff = await loadCachedResponse<string>(cacheFile, diffPath)
    if (cachedDiff) diff = cachedDiff as string | null
  }

  // otherwise, fetch it
  if (!diff) {
    const diffResponse = await http.create({ baseURL }).get(diffPath)
    diff = diffResponse.data as string | null
    if (diff && cacheFile) await saveCachedResponse<string>(cacheFile, diffPath, diff)
  }

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
