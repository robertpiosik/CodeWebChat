import { Configurations } from './Configurations'

export default {
  component: Configurations
}

const configurations: Configurations.Configuration[] = [
  {
    id: '1',
    title: 'claude-3-haiku-20240307',
    details: ['Anthropic', '0.7']
  },
  {
    id: '2',
    title: 'gpt-4o',
    details: ['OpenAI', 'low'],
    is_pinned: true
  },
  {
    id: '3',
    title: 'gemini-1.5-flash',
    details: ['Google']
  }
]

const presets: Configurations.Configuration[] = [
  {
    id: '1',
    title: 'Gemini with Flash 2.0',
    details: ['Gemini', 'gemini-2.0-flash-exp'],
    icon: 'GEMINI',
    is_pinned: true
  },
  {
    id: '2',
    title: 'Code review with AI Studio',
    details: ['AI Studio'],
    icon: 'AI_STUDIO'
  },
  {
    id: '3',
    title: 'Security check with Claude',
    details: ['Claude'],
    icon: 'CLAUDE'
  }
]

const mock_translations = {
  title: 'Configurations',
  empty: 'No configurations created yet.',
  add_new: 'Add New',
  pin: 'Pin',
  unpin: 'Unpin',
  insert: 'Insert',
  edit: 'Edit',
  delete: 'Delete',
  duplicate_configuration: 'Duplicate configuration'
}

export const Default = () => {
  return (
    <Configurations
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
      on_duplicate={(id) => {
        console.log('on_duplicate', id)
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

export const Presets = () => {
  return (
    <Configurations
      configurations={presets}
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
      on_duplicate={(id) => {
        console.log('on_duplicate', id)
      }}
      on_reorder={(configs) => {
        console.log('on_reorder', configs)
      }}
      is_collapsed={false}
      on_toggle_collapsed={(is_collapsed) => {
        console.log('on_toggle_collapsed', is_collapsed)
      }}
      translations={{
        ...mock_translations,
        title: 'Presets',
        empty: 'No presets created yet.'
      }}
    />
  )
}

export const Empty = () => (
  <Configurations
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
    on_duplicate={(id) => {
      console.log('on_duplicate', id)
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
