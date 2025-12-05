import { useState } from 'react'
import { Fieldset } from './Fieldset'
import { Field } from '../Field'

export default {
  component: Fieldset
}

export const Default = () => (
  <div style={{ width: '300px' }}>
    <Fieldset label="General Settings">
      <Field label="Name">
        <div
          style={{
            height: '24px',
            border: '1px solid var(--vscode-input-border)',
            background: 'var(--vscode-input-background)'
          }}
        />
      </Field>
      <Field label="Description">
        <div
          style={{
            height: '24px',
            border: '1px solid var(--vscode-input-border)',
            background: 'var(--vscode-input-background)'
          }}
        />
      </Field>
    </Fieldset>
  </div>
)

export const Collapsible = () => {
  const [is_collapsed, set_is_collapsed] = useState(false)

  return (
    <div style={{ width: '300px' }}>
      <Fieldset
        label="Advanced Settings"
        is_collapsed={is_collapsed}
        on_toggle_collapsed={() => set_is_collapsed(!is_collapsed)}
      >
        <Field label="API Key">
          <div
            style={{
              height: '24px',
              border: '1px solid var(--vscode-input-border)',
              background: 'var(--vscode-input-background)'
            }}
          />
        </Field>
        <Field label="Secret">
          <div
            style={{
              height: '24px',
              border: '1px solid var(--vscode-input-border)',
              background: 'var(--vscode-input-background)'
            }}
          />
        </Field>
      </Fieldset>
    </div>
  )
}

export const CollapsedByDefault = () => {
  const [is_collapsed, set_is_collapsed] = useState(true)

  return (
    <div style={{ width: '300px' }}>
      <Fieldset
        label="Experimental Features"
        is_collapsed={is_collapsed}
        on_toggle_collapsed={() => set_is_collapsed(!is_collapsed)}
      >
        <div style={{ padding: '8px', fontSize: '12px' }}>
          These features are experimental and may change.
        </div>
      </Fieldset>
    </div>
  )
}
