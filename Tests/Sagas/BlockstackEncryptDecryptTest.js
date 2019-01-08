import {
  NativeModules
} from 'react-native'
const {BlockstackNativeModule} = NativeModules

test('blockstack encryption & decryption', () => {
  // Test encryptContent / decryptContent
  let testString1 = 'Concensus'
  BlockstackNativeModule.encryptPrivateKey(testString1, (error, cipherObjectJSONString) => {
    if (error) {
      throw (`Failed to encrpyt ${error}.`)
    } else {
      console.log(`SUCCESS (encryptPrivateKey): cipherObjectJSONString = ${cipherObjectJSONString}`)
      BlockstackNativeModule.decryptPrivateKey(userData['privateKey'], cipherObjectJSONString, (error, decrypted) => {
        if (error) {
          throw (`Failed to decrypt: ${error}.`)
        } else {
          console.log(`SUCCESS (decryptPrivateKey): decryptedString = ${decrypted}`)
        }
        expect(testString1).toEqual(decrypted)
      })
    }
  })
  // Test encryptContent / decryptContent
  let testString2 = 'Content works?'
  BlockstackNativeModule.encryptContent(testString2, (error, cipherObjectJSONString) => {
    if (error) {
      throw (`Failed to encrpyt with encryptContent: ${error}.`)
    } else {
      console.log(`SUCCESS (encryptContent): cipherObjectJSONString = ${cipherObjectJSONString}`)
      BlockstackNativeModule.decryptContent(cipherObjectJSONString, (error, decrypted) => {
        if (error) {
          throw (`Failed to decrypt with decryptContent: ${error}.`)
        } else {
          console.log(`SUCCESS (decryptContent): decryptedString = ${decrypted}`)
        }
        expect(testString2).toEqual(decrypted)
      })
    }
  })
})
