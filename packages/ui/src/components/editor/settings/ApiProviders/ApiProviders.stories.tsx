import { ApiProviders } from './ApiProviders'
import { useState } from 'react'

export default {
  component: ApiProviders,
  title: 'Editor/Settings/ApiProviders'
}

const initialProviders: ApiProviders.Provider[] = [
  {
    name: 'OpenAI',
    type: 'built-in',
    apiKeyMask: '...1234',
    baseUrl: 'https://api.openai.com/v1'
  },
  {
    name: 'Anthropic',
    type: 'built-in',
    apiKeyMask: '...5678',
    baseUrl: 'https://api.anthropic.com/v1'
  },
  {
    name: 'My Custom Endpoint',
    type: 'custom',
    apiKeyMask: '⚠ Missing API key',
    baseUrl: 'http://localhost:1234/v1'
  }
]

export const Default = () => {
  const [providers, setProviders] = useState(initialProviders)
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <ApiProviders
        providers={providers}
        on_reorder={(reordered) => {
          console.log('reordered', reordered)
          setProviders(reordered)
        }}
        on_add_provider={() => console.log('Add provider clicked')}
        on_delete_provider={(name) => console.log('Delete provider', name)}
        on_rename_provider={(name) => console.log('Rename provider', name)}
        on_change_api_key={(name) => console.log('Change API key for', name)}
      />
    </div>
  )
}

export const Empty = () => {
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <ApiProviders
        providers={[]}
        on_reorder={(reordered) => console.log('reordered', reordered)}
        on_add_provider={() => console.log('Add provider clicked')}
        on_delete_provider={(name) => console.log('Delete provider', name)}
        on_rename_provider={(name) => console.log('Rename provider', name)}
        on_change_api_key={(name) => console.log('Change API key for', name)}
      />
    </div>
  )
}
