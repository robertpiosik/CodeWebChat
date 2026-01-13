import { useState } from 'react'
import { SimpleCheckbox } from './SimpleCheckbox'

export default {
  component: SimpleCheckbox
}

export const Default = () => {
  const [checked, set_checked] = useState(false)

  return (
    <div
      style={{
        padding: '20px',
        background: 'var(--vscode-sideBar-background)'
      }}
    >
      <SimpleCheckbox
        checked={checked}
        on_change={set_checked}
        title="Toggle simple checkbox"
      />
    </div>
  )
}
