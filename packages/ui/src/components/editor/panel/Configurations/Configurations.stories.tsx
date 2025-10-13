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
    reasoning_effort: 'low'
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
      on_configuration_click={(index) => {
        console.log('on_configuration_click', index)
      }}
      on_manage_configurations={() => {
        console.log('on_manage_configurations')
      }}
    />
  )
}

export const Empty = () => (
  <Configurations
    api_mode="edit-context"
    configurations={[]}
    on_configuration_click={(index) => {
      console.log('on_configuration_click', index)
    }}
    on_manage_configurations={() => {
      console.log('on_manage_configurations')
    }}
  />
)
