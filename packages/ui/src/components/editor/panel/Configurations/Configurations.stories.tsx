import { Configurations } from './Configurations'

export default {
  component: Configurations
}

const configurations: Configurations.Configuration[] = [
  {
    id: '1',
    model: 'claude-3-haiku-20240307',
    provider_name: 'Anthropic',
    temperature: 0.7
  },
  {
    id: '2',
    model: 'gpt-4o',
    provider_name: 'OpenAI',
    reasoning_effort: 'low',
    is_pinned: true
  },
  {
    id: '3',
    model: 'gemini-1.5-flash',
    provider_name: 'Google'
  }
]

const mock_translations = {
  title: 'Configurations',
  empty: 'No configurations created yet.',
  add_new: 'Add New',
  add_new_tooltip: 'Add new',
  initialize_tooltip: 'Initialize',
  pin_tooltip: 'Pin',
  unpin_tooltip: 'Unpin',
  insert_tooltip: 'Insert a new configuration below/above',
  edit_tooltip: 'Edit',
  delete_tooltip: 'Delete'
}

export const Default = () => {
  return (
    <Configurations
      api_prompt_type="edit-context"
      configurations={configurations}
      on_configuration_click={(id) => {
        console.log('on_configuration_click', id)
      }}
      on_create={() => {
        console.log('on_create')
      }}
      on_toggle_pinned={(id) => {
        console.log('on_toggle_pinned', id)
      }}
      on_edit={(id) => {
        console.log('on_edit', id)
      }}
      on_delete={(id) => {
        console.log('on_delete', id)
      }}
      on_reorder={(configs) => {
        console.log('on_reorder', configs)
      }}
      is_collapsed={false}
      on_toggle_collapsed={(is_collapsed) => {
        console.log('on_toggle_collapsed', is_collapsed)
      }}
      translations={mock_translations}
    />
  )
}

export const Empty = () => (
  <Configurations
    api_prompt_type="edit-context"
    configurations={[]}
    on_configuration_click={(id) => {
      console.log('on_configuration_click', id)
    }}
    on_create={() => {
      console.log('on_create')
    }}
    on_toggle_pinned={(id) => {
      console.log('on_toggle_pinned', id)
    }}
    on_edit={(id) => {
      console.log('on_edit', id)
    }}
    on_delete={(id) => {
      console.log('on_delete', id)
    }}
    on_reorder={(configs) => {
      console.log('on_reorder', configs)
    }}
    is_collapsed={false}
    on_toggle_collapsed={(is_collapsed) => {
      console.log('on_toggle_collapsed', is_collapsed)
    }}
    translations={mock_translations}
  />
)
