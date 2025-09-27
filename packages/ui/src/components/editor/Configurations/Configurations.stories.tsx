import { Configurations } from './Configurations'
import { useState } from 'react'

export default {
  component: Configurations
}

const configurations: Configurations.Configuration[] = [
  {
    model: 'claude-3-haiku-20240307',
    provider: 'Anthropic',
    temperature: 0.7
  },
  {
    model: 'gpt-4o',
    provider: 'OpenAI',
    reasoning_effort: 'low'
  },
  {
    model: 'gemini-1.5-flash',
    provider: 'Google',
    cache_enabled: true
  }
]

export const Default = () => {
  const [selected_index, set_selected_index] = useState<number | undefined>(1)

  return (
    <Configurations
      api_mode="edit-context"
      configurations={configurations}
      on_configuration_click={(index) => {
        console.log('on_configuration_click', index)
        set_selected_index(index)
      }}
      selected_configuration_index={selected_index}
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
  />
)
