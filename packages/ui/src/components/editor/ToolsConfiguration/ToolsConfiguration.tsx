import React, { useEffect, useRef, useState } from 'react'
import styles from './ToolsConfiguration.module.scss'
import { Field } from '../Field'
import { IconButton } from '../IconButton/IconButton'
import { Slider } from '../Slider'
import { ConfigurationHeader } from '../ConfigurationHeader'
import { ToolSettings, Provider } from '@shared/types/tool-settings'

type Props = {
  gemini_api_models: {
    [model_id: string]: string
  }
  open_router_models: {
    [model_id: string]: {
      name: string
      description: string
    }
  }

  gemini_api_key?: string
  open_router_api_key?: string

  code_completions_settings: ToolSettings
  file_refactoring_settings: ToolSettings
  commit_messages_settings: ToolSettings

  on_code_completions_settings_update: (settings: ToolSettings) => void
  on_file_refactoring_settings_update: (settings: ToolSettings) => void
  on_commit_messages_settings_update: (settings: ToolSettings) => void

  on_gemini_api_key_change: (api_key: string) => void
  on_open_router_api_key_change: (api_key: string) => void

  request_open_router_models: () => void
  get_newly_picked_open_router_model: () => Promise<string | undefined>
}

export const ToolsConfiguration: React.FC<Props> = (props) => {
  const [show_gemini_api_key, set_show_api_key] = useState(false)
  const [show_open_router_api_key, set_show_open_router_api_key] =
    useState(false)
  const fetched_open_router_models = useRef(false) // open router models should be fetched once (stale-while-revalidate)

  const toggle_gemini_api_key_visibility = () => {
    set_show_api_key(!show_gemini_api_key)
  }
  const toggle_open_router_api_key_visibility = () => {
    set_show_open_router_api_key(!show_open_router_api_key)
  }

  useEffect(() => {
    if (
      Object.keys(props.open_router_models).length &&
      fetched_open_router_models.current
    )
      return

    const settings = [
      props.code_completions_settings,
      props.file_refactoring_settings,
      props.commit_messages_settings
    ]

    const needs_open_router_models = settings.some(
      (api_tool_settings) => api_tool_settings.provider == 'OpenRouter'
    )

    if (needs_open_router_models) {
      props.request_open_router_models()
      fetched_open_router_models.current = true
    }
  }, [
    props.code_completions_settings,
    props.file_refactoring_settings,
    props.commit_messages_settings,
    props.open_router_models
  ])

  const render_api_tool_settings = (params: {
    title: string
    description: string
    settings: ToolSettings
    on_update: (settings: ToolSettings) => void
  }) => (
    <>
      <ConfigurationHeader
        top_line="TOOL"
        bottom_line={params.title}
        description={params.description}
      />

      <Field
        label="Provider"
        html_for={`${params.title.toLowerCase().replaceAll(' ', '-')}-provider`}
      >
        <select
          id={`${params.title.toLowerCase().replaceAll(' ', '-')}-provider`}
          value={params.settings.provider}
          onChange={(e) => {
            params.on_update({
              ...params.settings,
              provider: e.target.value as Provider,
              model: undefined
            })
          }}
          className={styles.input}
        >
          <option value="">—</option>
          <option value="Gemini API">Gemini API</option>
          <option value="OpenRouter">OpenRouter</option>
        </select>
      </Field>

      {(params.settings.provider === undefined ||
        params.settings.provider == 'Gemini API') && (
        <Field
          label="Model"
          html_for={`${params.title.toLowerCase().replaceAll(' ', '-')}-model`}
        >
          <select
            id={`${params.title.toLowerCase().replaceAll(' ', '-')}-model`}
            value={params.settings.model}
            onChange={(e) => {
              params.on_update({
                ...params.settings,
                model: e.target.value
              })
            }}
            className={styles.input}
          >
            <option value="">—</option>
            {Object.entries(props.gemini_api_models).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {params.settings.provider == 'OpenRouter' &&
        (Object.keys(props.open_router_models).length > 0 ? (
          <Field
            label="Model"
            html_for={`${params.title
              .toLowerCase()
              .replaceAll(' ', '-')}-model`}
          >
            <div
              onClick={async () => {
                if (params.settings.provider == 'OpenRouter') {
                  const new_pick =
                    await props.get_newly_picked_open_router_model()
                  params.on_update({
                    ...params.settings,
                    model: new_pick
                  })
                }
              }}
            >
              <div
                style={{
                  pointerEvents: 'none'
                }}
              >
                <select
                  id={`${params.title
                    .toLowerCase()
                    .replaceAll(' ', '-')}-model`}
                  value={params.settings.model}
                  onChange={(e) => {
                    params.on_update({
                      ...params.settings,
                      model: e.target.value
                    })
                  }}
                  className={styles.input}
                >
                  <option value="">—</option>
                  {Object.entries(props.open_router_models).map(
                    ([id, model_info]) => (
                      <option key={id} value={id}>
                        {model_info.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </Field>
        ) : (
          <Field label="Model">
            <select value="fetching" disabled className={styles.input}>
              <option value="fetching">Fetching models...</option>
            </select>
          </Field>
        ))}
      <Field
        label="Temperature"
        html_for={`${params.title
          .toLowerCase()
          .replaceAll(' ', '-')}-temperature`}
      >
        <Slider
          value={params.settings.temperature || 0}
          onChange={(value) => {
            params.on_update({
              ...params.settings,
              temperature: value
            })
          }}
        />
      </Field>
    </>
  )

  return (
    <div className={styles.form}>
      <Field
        label="Gemini API Key"
        html_for="gemini-api-key"
        info={
          !props.gemini_api_key && (
            <>
              Create yours in{' '}
              <a href="https://aistudio.google.com/app/apikey">AI Studio</a>.
            </>
          )
        }
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            id="gemini-api-key"
            type={show_gemini_api_key ? 'text' : 'password'}
            value={props.gemini_api_key}
            onChange={(e) => props.on_gemini_api_key_change(e.target.value)}
            className={styles.input}
            placeholder="Enter your API key"
            style={{ flex: 1 }}
          />
          <IconButton
            codicon_icon={show_gemini_api_key ? 'eye-closed' : 'eye'}
            on_click={toggle_gemini_api_key_visibility}
            title={show_gemini_api_key ? 'Hide API key' : 'Show API key'}
          />
        </div>
      </Field>
      <Field
        label="Open Router API Key"
        html_for="open-router-api-key"
        info={
          !props.open_router_api_key && (
            <>
              Create yours in{' '}
              <a href="https://openrouter.ai/settings/keys">
                Open Router Settings
              </a>
              .
            </>
          )
        }
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            id="open-router-api-key"
            type={show_open_router_api_key ? 'text' : 'password'}
            value={props.open_router_api_key}
            onChange={(e) =>
              props.on_open_router_api_key_change(e.target.value)
            }
            className={styles.input}
            placeholder="Enter your API key"
            style={{ flex: 1 }}
          />
          <IconButton
            codicon_icon={show_open_router_api_key ? 'eye-closed' : 'eye'}
            on_click={toggle_open_router_api_key_visibility}
            title={show_open_router_api_key ? 'Hide API key' : 'Show API key'}
          />
        </div>
      </Field>

      {render_api_tool_settings({
        title: 'Code Completions',
        description:
          'Use any model for accurate code completions. The tool attaches selected context in each request.',
        settings: props.code_completions_settings,
        on_update: props.on_code_completions_settings_update
      })}
      {render_api_tool_settings({
        title: 'File Refactoring',
        description:
          'Modify the active file based on natural language instructions. The tool is also used when integrating truncated markdown code block of chat responses.',
        settings: props.file_refactoring_settings,
        on_update: props.on_file_refactoring_settings_update
      })}
      {render_api_tool_settings({
        title: 'Commit Messages',
        description:
          'Generate meaningful commit messages based on contents of affected files and diffs of changes.',
        settings: props.commit_messages_settings,
        on_update: props.on_commit_messages_settings_update
      })}
    </div>
  )
}
