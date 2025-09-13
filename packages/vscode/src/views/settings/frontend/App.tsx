import ReactDOM from 'react-dom/client'
import { Settings } from './Settings'

import '@vscode/codicons/dist/codicon.css'
import 'simplebar-react/dist/simplebar.min.css'
import '@ui/styles/global.scss'

const App = () => {
  return <Settings />
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
