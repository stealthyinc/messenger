const {
	isEmptyObj,
	throwIfUndef,
	isDef
} = require('../../App/Engine/misc/utils.js')

test('check isEmptyObj', () => {
  	const obj = {}
  	expect(true).toBe(isEmptyObj(obj))
})

// test('check throwIfUndef', () => {
// 	const name = 'name'
// 	expect(throwIfUndef('name', undefined)).toThrow('name is undefined');
// });

test('check isDef', () => {
  const name = 'name'
  expect(isDef('name')).toBe(true)
})
