import { Configurations } from './Configurations'

export default {
  component: Configurations
}

const configurations: Configurations.Configuration[] = [
  {
    id: '1',
    model: 'claude-3-haiku-20240307',
    provider: 'Anthropic',
    temperature: 0.7
  },
  {
    id: '2',
    model: 'gpt-4o',
    provider: 'OpenAI',
    reasoning_effort: 'low',
    is_pinned: true
  },
  {
    id: '3',
    model: 'gemini-1.5-flash',
    provider: 'Google',
    cache_enabled: true
  }
]

export const Default = () => {
  return (
    <Configurations
      api_mode="edit-context"
      configurations={configurations}
      on_configuration_click={(id) => {
        console.log('on_configuration_click', id)
      }}
      on_manage_configurations={() => {
        console.log('on_manage_configurations')
      }}
      on_toggle_pinned={(id) => {
        console.log('on_toggle_pinned', id)
      }}
      is_collapsed={false}
      on_toggle_collapsed={(is_collapsed) => {
        console.log('on_toggle_collapsed', is_collapsed)
      }}
    />
  )
}

export const Empty = () => (
  <Configurations
    api_mode="edit-context"
    configurations={[]}
    on_configuration_click={(id) => {
      console.log('on_configuration_click', id)
    }}
    on_manage_configurations={() => {
      console.log('on_manage_configurations')
    }}
    is_collapsed={false}
    on_toggle_collapsed={(is_collapsed) => {
      console.log('on_toggle_collapsed', is_collapsed)
    }}
  />
)
