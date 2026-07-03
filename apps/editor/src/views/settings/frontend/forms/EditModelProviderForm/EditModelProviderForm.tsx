import { useState, useEffect } from 'react'
import styles from './EditModelProviderForm.module.scss'
import { Provider } from '@/views/settings/types/messages'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/panel/Fieldset'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'

export type ModelProviderDraft = {
  name: string
  base_url: string
  api_key?: string
  is_api_key_cleared?: boolean
  extended_cache?: boolean
}

type Props = {
  provider: Provider
  on_update: (draft: ModelProviderDraft) => void
  on_open_external_url: (url: string) => void
}

export const EditModelProviderForm: React.FC<Props> = (props) => {
  const [name, set_name] = useState(props.provider.name)
  const [base_url, set_base_url] = useState(props.provider.base_url)
  const [api_key, set_api_key] = useState('')
  const [is_api_key_cleared, set_is_api_key_cleared] = useState(false)
  const [extended_cache, set_extended_cache] = useState(
    props.provider.extended_cache || false
  )

  useEffect(() => {
    props.on_update({
      name,
      base_url,
      api_key: api_key || undefined,
      is_api_key_cleared,
      extended_cache
    })
  }, [name, base_url, api_key, is_api_key_cleared, extended_cache])

  return (
    <UiScrollable top_shadow>
      <div className={styles.form}>
        <UiFieldset>
          <UiField label="Name" html_for="name">
            <UiInput
              id="name"
              type="text"
              value={name}
              on_change={set_name}
              placeholder="e.g. OpenAI"
            />
          </UiField>

          <UiField label="Base URL" html_for="base_url">
            <UiInput
              id="base_url"
              type="text"
              value={base_url}
              on_change={set_base_url}
              placeholder="e.g. https://api.openai.com/v1"
            />
          </UiField>

          <UiField
            label="API Key"
            html_for="api_key"
            action={
              (props.provider.api_key_mask || api_key) &&
              !is_api_key_cleared ? (
                <button
                  className={styles.clear}
                  onClick={() => {
                    set_api_key('')
                    set_is_api_key_cleared(true)
                  }}
                >
                  Clear
                </button>
              ) : undefined
            }
          >
            <UiInput
              id="api_key"
              type="password"
              value={is_api_key_cleared ? '' : api_key}
              on_change={(val) => {
                set_api_key(val)
                if (val) set_is_api_key_cleared(false)
              }}
              placeholder={
                is_api_key_cleared
                  ? 'API Key cleared'
                  : props.provider.api_key_mask
                    ? `...${props.provider.api_key_mask.slice(-4)}`
                    : 'Enter API Key'
              }
            />
          </UiField>

          {base_url.includes('api.anthropic.com') && (
            <UiField
              label="Extended Cache"
              info={
                <>
                  By default, automatic caching uses a 5-minute TTL. You can{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      props.on_open_external_url(
                        'https://platform.claude.com/docs/en/build-with-claude/prompt-caching#ttl-support'
                      )
                    }}
                  >
                    extend it to 1-hour
                  </a>{' '}
                  for all requests including the selected files.
                </>
              }
            >
              <UiToggler
                is_on={extended_cache}
                on_toggle={set_extended_cache}
              />
            </UiField>
          )}
        </UiFieldset>
      </div>
    </UiScrollable>
  )
}
