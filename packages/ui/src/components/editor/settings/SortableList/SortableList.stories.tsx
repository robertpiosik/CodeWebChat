import { useState } from 'react'
import { SortableList } from './SortableList'
import { Radio } from '../../common/Radio'
import { IconButton } from '../../common/IconButton'
import { TextButton } from '../TextButton'

export default {
  component: SortableList
}

const log_action =
  (action: string) =>
  (...args: any[]) => {
    console.log(action, ...args)
  }

// --- Configurations use case ---

type Configuration = SortableList.Item & {
  model: string
  description: string
  is_default?: boolean
}

const initial_configurations: Configuration[] = [
  {
    id: '1',
    model: 'gpt-4o',
    description: 'OpenAI - 1.0 temp',
    is_default: true
  },
  {
    id: '2',
    model: 'claude-3-haiku-20240307',
    description: 'Anthropic - 0.7 temp'
  },
  {
    id: '3',
    model: 'gemini-1.5-flash',
    description: 'Google - cache on'
  }
]

export const Configurations = () => {
  const [configurations, set_configurations] = useState(initial_configurations)
  const has_default = configurations.some((c) => c.is_default)

  const handle_set_default = (id: string) => {
    set_configurations(
      configurations.map((c) => ({ ...c, is_default: c.id == id }))
    )
  }

  const handle_unset_default = () => {
    set_configurations(configurations.map((c) => ({ ...c, is_default: false })))
  }

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <SortableList
        items={configurations}
        on_reorder={(reordered) => {
          set_configurations(reordered)
          log_action('on_reorder')(reordered)
        }}
        on_add={log_action('on_add')}
        translations={{
          add_title: 'Add New',
          item_text: 'config',
          items_text: 'configs'
        }}
        header_extra={
          has_default ? (
            <>
              <span>·</span>
              <TextButton on_click={handle_unset_default}>Unset</TextButton>
            </>
          ) : undefined
        }
        render_content={(config) => (
          <>
            <Radio
              name="default_configuration"
              checked={!!config.is_default}
              title="Set Default"
              on_change={() => handle_set_default(config.id)}
            />
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                cursor: 'pointer'
              }}
              onClick={() => handle_set_default(config.id)}
            >
              <span>{config.model}</span>
              <span
                style={{ marginLeft: '0.5em', opacity: 0.7, fontSize: '0.9em' }}
              >
                {config.description}
              </span>
            </div>
          </>
        )}
        render_actions={(config, index) => (
          <>
            <IconButton
              codicon_icon="insert"
              title="Insert..."
              on_click={() => log_action('on_insert')(index)}
            />
            <IconButton
              codicon_icon="edit"
              title="Edit"
              on_click={() => log_action('on_edit')(config.id)}
            />
            <IconButton
              codicon_icon="trash"
              title="Delete"
              on_click={(e) => {
                e.stopPropagation()
                log_action('on_delete')(config.id)
              }}
            />
          </>
        )}
      />
    </div>
  )
}

// --- Providers use case ---

type Provider = SortableList.Item & {
  name: string
  api_key_mask: string
  base_url: string
}

const initial_providers: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    api_key_mask: '...1234',
    base_url: 'https://api.openai.com/v1'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    api_key_mask: '...5678',
    base_url: 'https://api.anthropic.com/v1'
  },
  {
    id: 'custom',
    name: 'My Custom Endpoint',
    api_key_mask: '⚠ Missing API key',
    base_url: 'http://localhost:1234/v1'
  }
]

export const Providers = () => {
  const [providers, set_providers] = useState(initial_providers)

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <SortableList
        items={providers}
        on_reorder={(reordered) => {
          set_providers(reordered)
          log_action('on_reorder')(reordered)
        }}
        on_add={log_action('on_add_provider')}
        translations={{
          add_title: 'Add New',
          item_text: 'provider',
          items_text: 'providers'
        }}
        render_content={(provider) => (
          <>
            <div
              style={{
                width: 90,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {provider.name}
            </div>
            <div
              style={{
                width: 50,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {provider.api_key_mask}
            </div>
            <div
              style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {provider.base_url}
            </div>
          </>
        )}
        render_actions={(provider, index) => (
          <>
            <IconButton
              codicon_icon="insert"
              title="Insert..."
              on_click={() => log_action('on_insert')(index)}
            />
            <IconButton
              codicon_icon="edit"
              title="Edit"
              on_click={() => log_action('on_edit_provider')(provider.name)}
            />
            <IconButton
              codicon_icon="trash"
              title="Delete"
              on_click={() => log_action('on_delete_provider')(provider.name)}
            />
          </>
        )}
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
      <SortableList
        items={[] as SortableList.Item[]}
        on_reorder={log_action('on_reorder')}
        on_add={log_action('on_add')}
        translations={{
          add_title: 'Add New',
          item_text: 'item',
          items_text: 'items'
        }}
        render_content={() => null}
      />
    </div>
  )
}
