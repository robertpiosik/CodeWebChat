import ReactDOM from 'react-dom/client'
import { Chats } from './Chats'

import '@vscode/codicons/dist/codicon.css'
import 'simplebar-react/dist/simplebar.min.css'
import '@ui/styles/global.scss'

const App = () => {
  return <Chats />
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
