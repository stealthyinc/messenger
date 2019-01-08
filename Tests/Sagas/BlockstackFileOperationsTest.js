import {
  NativeModules
} from 'react-native'
const {BlockstackNativeModule} = NativeModules

test('blockstack get raw file', () => {
  // Test get file on pk.txt path.
  BlockstackNativeModule.getRawFile('pk.txt', (error, array) => {
    console.log('After getFile:')
    console.log('--------------------------------------------------------')
    console.log(`error: ${error}`)
    console.log(`content: ${array}`)
    console.log('')
    expect('12345').toEqual(array)
  })
})

test('blockstack putfile and getfile', () => {
  // // Test write/read cycle:
  const data = 'Will this work?'
  BlockstackNativeModule.putFile('testWrite.txt',
                                 data,
                                 (error, content) => {
                                   console.log('wrote testWrite.txt')
                                   console.log('After putFile:')
                                   console.log('--------------------------------------------------------')
                                   console.log(`error: ${error}`)
                                   console.log(`content: ${content}`)
                                   console.log('')

                                   BlockstackNativeModule.getFile('testWrite.txt', (error, content) => {
                                     console.log('read testWrite.txt')
                                     console.log('After getFile:')
                                     console.log('--------------------------------------------------------')
                                     console.log(`error: ${error}`)
                                     console.log(`content: ${content}`)
                                     console.log('')
                                     expect(data).toEqual(content)
                                   })
                                 })
})
