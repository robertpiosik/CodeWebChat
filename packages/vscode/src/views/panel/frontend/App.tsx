import ReactDOM from 'react-dom/client'
import { View } from './View'

import '@vscode/codicons/dist/codicon.css'
import 'simplebar-react/dist/simplebar.min.css'
import '@ui/styles/global.scss'

const App = () => {
  return <View />
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
