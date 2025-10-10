import ReactDOM from 'react-dom/client'
import { Panel } from './Panel'

import '@vscode/codicons/dist/codicon.css'
import 'simplebar-react/dist/simplebar.min.css'
import '@ui/styles/global.scss'

const App = () => {
  return <Panel />
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
