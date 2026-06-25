import { useState, useEffect } from 'react'
import styles from './EditApiConfigurationForm.module.scss'
import { ApiConfiguration } from '@/views/panel/types/messages'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { Slider as UiSlider } from '@ui/components/editor/panel/Slider'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { BackendMessage } from '@/views/panel/types/messages'
import { Scrollable as UiScrollable } from '@ui/components/editor/panel/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/panel/Fieldset'
import { QuickPickButton as UiQuickPickButton } from '@ui/components/editor/common/QuickPickButton'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'

type Props = {
  api_configuration: ApiConfiguration
  on_update: (updated_api_configuration: ApiConfiguration) => void
  pick_model_provider: (current_model_provider_name?: string) => void
  pick_model: (model_provider_name: string, current_model?: string) => void
  pick_reasoning_effort: (
    model_provider_name: string,
    model: string,
    current_effort?: string
  ) => void
}

export const EditApiConfigurationForm: React.FC<Props> = (props) => {
  const [model_provider_name, set_model_provider_name] = useState(
    props.api_configuration.model_provider_name
  )
  const [model, set_model] = useState(props.api_configuration.model)
  const [temperature, set_temperature] = useState(
    props.api_configuration.temperature
  )
  const [reasoning_effort, set_reasoning_effort] = useState(
    props.api_configuration.reasoning_effort
  )
  const [system_instructions_override, set_system_instructions_override] =
    useState(props.api_configuration.system_instructions_override)

  const [is_sampling_collapsed, set_is_sampling_collapsed] = useState(
    props.api_configuration.temperature === undefined
  )

  useEffect(() => {
    props.on_update({
      ...props.api_configuration,
      model_provider_name,
      model,
      temperature,
      reasoning_effort,
      system_instructions_override
    })
  }, [
    model_provider_name,
    model,
    temperature,
    reasoning_effort,
    system_instructions_override
  ])

  useEffect(() => {
    const handle_message = (event: MessageEvent) => {
      const message = event.data as BackendMessage
      if (message.command == 'NEWLY_PICKED_API_MODEL') {
        set_model(message.model_id)
      } else if (message.command == 'NEWLY_PICKED_MODEL_PROVIDER') {
        set_model_provider_name(message.model_provider_name)
      } else if (message.command == 'NEWLY_PICKED_API_REASONING_EFFORT') {
        set_reasoning_effort(message.effort)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return (
    <UiScrollable>
      <div className={styles.form}>
        <UiFieldset>
          <UiField label="Model Provider" html_for="model-provider">
            <UiQuickPickButton
              label={model_provider_name || '—'}
              onClick={(e) => {
                e.stopPropagation()
                props.pick_model_provider(model_provider_name)
              }}
            />
          </UiField>

          <UiField label="Model" html_for="model">
            <UiQuickPickButton
              label={model || '—'}
              onClick={(e) => {
                e.stopPropagation()
                if (model_provider_name) {
                  props.pick_model(model_provider_name, model)
                }
              }}
            />
          </UiField>

          <UiField
            label="Reasoning Effort"
            html_for="reasoning-effort"
            info="Controls how much the model thinks."
            action={
              reasoning_effort !== undefined && (
                <UiTextButton on_click={() => set_reasoning_effort(undefined)}>
                  Unset
                </UiTextButton>
              )
            }
          >
            <UiQuickPickButton
              label={
                reasoning_effort
                  ? reasoning_effort.charAt(0).toUpperCase() +
                    reasoning_effort.slice(1)
                  : '—'
              }
              onClick={(e) => {
                e.stopPropagation()
                if (model_provider_name && model) {
                  props.pick_reasoning_effort(
                    model_provider_name,
                    model,
                    reasoning_effort
                  )
                }
              }}
            />
          </UiField>

          <UiField
            label="System Instructions Override"
            html_for="instructions"
            info="Optional tone and style instructions for the model."
          >
            <UiTextarea
              id="instructions"
              value={system_instructions_override || ''}
              on_change={set_system_instructions_override}
              min_rows={2}
              placeholder="Overrides global system instructions"
            />
          </UiField>
        </UiFieldset>

        <UiFieldset
          label="Sampling parameters"
          is_collapsed={is_sampling_collapsed}
          on_toggle_collapsed={() =>
            set_is_sampling_collapsed(!is_sampling_collapsed)
          }
        >
          <UiField
            label="Temperature"
            info="Influences response variety. Lower values are more predictable; higher values are more diverse."
            action={
              temperature !== undefined && (
                <button
                  className={styles.clear}
                  onClick={() => set_temperature(undefined)}
                >
                  Clear
                </button>
              )
            }
          >
            <UiSlider
              value={temperature}
              onChange={set_temperature}
              min={0}
              max={2}
            />
          </UiField>
        </UiFieldset>
      </div>
    </UiScrollable>
  )
}
