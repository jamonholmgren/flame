import { parseGitDiff } from '../src/utils/parseGitDiff'

describe('parseGitDiff', () => {
  test('parses a diff', () => {
    const diff = `
diff --git a/RnDiffApp/.eslintrc.js b/RnDiffApp/.eslintrc.js
index 40c6dcd05..187894b6a 100644
--- a/RnDiffApp/.eslintrc.js
+++ b/RnDiffApp/.eslintrc.js
@@ -1,4 +1,4 @@
  module.exports = {
    root: true,
-  extends: '@react-native-community',
+  extends: '@react-native',
  };
diff --git a/RnDiffApp/.gitignore b/RnDiffApp/.gitignore
index 16f8c3077..0cab2ac6f 100644
--- a/RnDiffApp/.gitignore
+++ b/RnDiffApp/.gitignore
@@ -61,3 +61,6 @@ yarn-error.log
  
  # Temporary files created by Metro to check the health of the file watcher
  .metro-health-check*
+
+# testing
+/coverage
diff --git a/RnDiffApp/Gemfile b/RnDiffApp/Gemfile
index 1142b1b20..1fa2c2e1a 100644
--- a/RnDiffApp/Gemfile
+++ b/RnDiffApp/Gemfile
@@ -1,6 +1,6 @@
  source 'https://rubygems.org'
  
  # You may use http://rbenv.org/ or https://rvm.io/ to install and use this version
-ruby '>= 2.6.10'
+ruby ">= 2.6.10"
  
-gem 'cocoapods', '>= 1.11.3'
+gem 'cocoapods', '~> 1.12'
`
    const result = parseGitDiff(diff)

    expect(result).toEqual({
      'RnDiffApp/.eslintrc.js': {
        path: 'RnDiffApp/.eslintrc.js',
        diff: `  module.exports = {
    root: true,
-  extends: '@react-native-community',
+  extends: '@react-native',
  };
`,
        change: 'pending',
        error: undefined,
        customPrompts: [],
      },
      'RnDiffApp/.gitignore': {
        path: 'RnDiffApp/.gitignore',
        diff: `  
  # Temporary files created by Metro to check the health of the file watcher
  .metro-health-check*
+
+# testing
+/coverage
`,
        change: 'pending',
        error: undefined,
        customPrompts: [],
      },
      'RnDiffApp/Gemfile': {
        path: 'RnDiffApp/Gemfile',
        diff: `  source 'https://rubygems.org'
  
  # You may use http://rbenv.org/ or https://rvm.io/ to install and use this version
-ruby '>= 2.6.10'
+ruby ">= 2.6.10"
  
-gem 'cocoapods', '>= 1.11.3'
+gem 'cocoapods', '~> 1.12'

`,
        change: 'pending',
        error: undefined,
        customPrompts: [],
      },
    })
  })
})
