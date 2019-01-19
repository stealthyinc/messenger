import Path from 'path-parser'
import {NavigationActions} from 'react-navigation'

const paths = [
  {
    routeName: 'Messages',
    path: new Path('/:id/')
  }
]

const findPath = url => paths.find(path => path.path.test(url))

export default (url, store) => {
  if (!url) return
  const pathObject = findPath(url)

  if (!pathObject) return

  const navigateAction = NavigationActions.navigate({
    routeName: pathObject.routeName,
    params: pathObject.path.test(url)
  })

  store.dispatch(navigateAction)
}
