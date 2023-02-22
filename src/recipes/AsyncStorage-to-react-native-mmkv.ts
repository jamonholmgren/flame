export const recipe = {
  prompt: `
// Examples of migrating from AsyncStorage to react-native-mmkv in React Native (typescript):

// AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage"
// react-native-mmkv
import { MMKV } from "react-native-mmkv"
const storage = new MMKV()

// AsyncStorage
await AsyncStorage.getItem(key) // returns string | null
// react-native-mmkv
storage.getString(key) // returns string | undefined

// AsyncStorage
await AsyncStorage.setItem(key, value)
// react-native-mmkv
storage.set(key, value) // NOT setString, just set(...), and it's synchronous

// AsyncStorage
await AsyncStorage.removeItem(key)
// react-native-mmkv
storage.delete(key)

// AsyncStorage
await AsyncStorage.clear()
// react-native-mmkv
storage.clearAll()

// AsyncStorage
const { getItem, setItem } = useAsyncStorage("user.name")
// react-native-mmkv
const [username, setUsername] = useMMKVString("user.name")

// Reactotron and AsyncStorage
Reactotron.setAsyncStorageHandler(AsyncStorage)
// For Reactotron and react-native-mmkv, create a custom storage handler that matches AsyncStorage's API:
const mmkvStorageHandler = {
  getItem: async (key: string) => {
    return storage.getString(key)
  },
  setItem: async (key: string, value: string) => {
    return storage.set(key, value)
  },
  // ... etc
}
Reactotron.setAsyncStorageHandler(mmkvStorageHandler)


`,
  finalNotes: `
// react-native-mmkv returns "undefined" instead of "null". Converts all react-native-mmkv's "undefined" to "null" to preserve the original behavior.
// react-native-mmkv functions are synchronous. Refactors code that accesses them to be synchronous, including switching .catch(...) to try {...} catch {...}.
// Instantiates the MMKV storage object near the top of the file.
`,
}
