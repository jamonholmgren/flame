import { fetchRNAppInfo } from '../src/react-native/fetchRNAppInfo'

describe('fetchRNAppInfo', () => {
  test('returns an error if no package.json file is found', async () => {
    const result = await fetchRNAppInfo({ dir: '.', options: { from: 'auto', to: '0.72.4' } })
    expect(result.error).toContain(`Couldn't find a react-native dependency in package.json`)
  })

  test('correctly fetches the current version from package.json', async () => {
    const result = await fetchRNAppInfo({ dir: './__tests__/testapp', options: { from: 'auto', to: '0.72.4' } })
    expect(result.error).toBeFalsy()
    expect(result.currentVersion).toBe('0.72.3')
    expect(result.targetVersion).toBe('0.72.4')
    expect(result.appDisplayName).toBe('FlameTest')
    expect(result.appNameKebabCase).toBe('flame-test')
    expect(result.appNameLowercase).toBe('flametest')
    expect(result.replacePlaceholder).toBeTruthy()
    expect(result.replacePlaceholder!('RnDiffApp')).toBe('.')
  })
})
