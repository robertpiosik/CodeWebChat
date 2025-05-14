import { Providers } from './Providers'

export default {
  component: Providers
}

export const Default = () => (
  <Providers
    providers={[
      { type: 'built-in', id: 'gemini', api_key: 'sk-...' },
      {
        type: 'custom',
        name: 'My Custom API 1',
        base_url: 'http://localhost:8000/v1',
        api_key: 'custom-key-1'
      },
      { type: 'built-in', id: 'openrouter', api_key: 'sk-...' },
      {
        type: 'custom',
        name: 'My Custom API 2',
        base_url: 'https://api.example.com/v1',
        api_key: 'custom-key-2'
      }
    ]}
    on_providers_updated={() => {}}
    on_add_provider_click={() => {}}
  />
)
