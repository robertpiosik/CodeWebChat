import ReactDOM from 'react-dom/client'
import { Settings } from './Settings'
import { translations } from '@/views/i18n/translations'
import { TranslationContext } from '@/views/i18n/TranslationContext'

import '@vscode/codicons/dist/codicon.css'
import 'simplebar-react/dist/simplebar.min.css'
import '@ui/styles/global.scss'

const App = () => {
  return (
    <TranslationContext.Provider value={translations}>
      <Settings />
    </TranslationContext.Provider>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
