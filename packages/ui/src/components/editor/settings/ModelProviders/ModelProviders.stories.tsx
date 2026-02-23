import { ModelProviders } from './ModelProviders'
import { useState } from 'react'

export default {
  component: ModelProviders
}

const initial_providers: ModelProviders.Provider[] = [
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

const translations = {
  add_title: 'Add New',
  insert_title: 'Insert...',
  edit_title: 'Edit',
  change_api_key_title: 'Key',
  delete_title: 'Delete',
  provider_text: 'provider',
  providers_text: 'providers'
}

export const Default = () => {
  const [providers, set_providers] = useState(initial_providers)
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <ModelProviders
        providers={providers}
        on_reorder={(reordered) => {
          console.log('reordered', reordered)
          set_providers(reordered)
        }}
        on_add_provider={() => console.log('Add provider clicked')}
        on_delete_provider={(name) => console.log('Delete provider', name)}
        on_edit_provider={(name) => console.log('Edit provider', name)}
        on_change_api_key={(name) => console.log('Change API key for', name)}
        translations={translations}
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
      <ModelProviders
        providers={[]}
        on_reorder={(reordered) => console.log('reordered', reordered)}
        on_add_provider={() => console.log('Add provider clicked')}
        on_delete_provider={(name) => console.log('Delete provider', name)}
        on_edit_provider={(name) => console.log('Edit provider', name)}
        on_change_api_key={(name) => console.log('Change API key for', name)}
        translations={translations}
      />
    </div>
  )
}
