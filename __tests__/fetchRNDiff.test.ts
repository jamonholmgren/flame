import { fetchRNDiff } from '../src/react-native/fetchRNDiff'
const desiredDiff = `diff --git a/RnDiffApp/package.json b/RnDiffApp/package.json
index 97468d02a..0434f9f3f 100644
--- a/RnDiffApp/package.json
+++ b/RnDiffApp/package.json
@@ -11,21 +11,21 @@
   },
   "dependencies": {
     "react": "18.2.0",
-    "react-native": "0.72.3"
+    "react-native": "0.72.4"
   },
   "devDependencies": {
     "@babel/core": "^7.20.0",
     "@babel/preset-env": "^7.20.0",
     "@babel/runtime": "^7.20.0",
     "@react-native/eslint-config": "^0.72.2",
-    "@react-native/metro-config": "^0.72.9",
+    "@react-native/metro-config": "^0.72.11",
     "@tsconfig/react-native": "^3.0.0",
     "@types/react": "^18.0.24",
     "@types/react-test-renderer": "^18.0.0",
     "babel-jest": "^29.2.1",
     "eslint": "^8.19.0",
     "jest": "^29.2.1",
-    "metro-react-native-babel-preset": "0.76.7",
+    "metro-react-native-babel-preset": "0.76.8",
     "prettier": "^2.4.1",
     "react-test-renderer": "18.2.0",
     "typescript": "4.8.4"
`

describe('fetchRNDiff', () => {
  it('returns an error if no diff is found', async () => {
    const result = await fetchRNDiff({ currentVersion: '0.72.3', targetVersion: '0.72.3' })
    expect(result.error).toContain(`We don't have a diff for upgrading from 0.72.3 to 0.72.3`)
  })

  it('returns the diff if found', async () => {
    const result = await fetchRNDiff({ currentVersion: '0.72.3', targetVersion: '0.72.4' })
    expect(result.error).toBeFalsy()
    expect(result.diff).toBe(desiredDiff)
  })
})
