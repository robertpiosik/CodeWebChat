import { useState, useEffect } from 'react'
import styles from './EditApiConfigurationForm.module.scss'
import { ApiConfiguration } from '@/views/prompt/types/messages'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { BackendMessage } from '@/views/prompt/types/messages'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/prompt/Fieldset'
import { QuickPickButton as UiQuickPickButton } from '@ui/components/editor/common/QuickPickButton'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'
import { use_translation } from '../../i18n/use-translation'

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
  const { t } = use_translation()

  const [model_provider_name, set_model_provider_name] = useState(
    props.api_configuration.model_provider_name
  )
  const [model, set_model] = useState(props.api_configuration.model)
  const [reasoning_effort, set_reasoning_effort] = useState(
    props.api_configuration.reasoning_effort
  )

  useEffect(() => {
    props.on_update({
      ...props.api_configuration,
      model_provider_name,
      model,
      reasoning_effort
    })
  }, [model_provider_name, model, reasoning_effort])

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
    <UiScrollable top_shadow>
      <div className={styles.form}>
        <UiFieldset>
          <UiField
            label={t('edit-api-configuration-form.model-provider')}
            html_for="model-provider"
          >
            <UiQuickPickButton
              label={model_provider_name || '—'}
              onClick={(e) => {
                e.stopPropagation()
                props.pick_model_provider(model_provider_name)
              }}
            />
          </UiField>

          <UiField
            label={t('edit-api-configuration-form.model')}
            html_for="model"
          >
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
            label={t('edit-api-configuration-form.reasoning-effort')}
            html_for="reasoning-effort"
            info={t('common.reasoning-effort-info')}
            action={
              reasoning_effort !== undefined && (
                <UiTextButton on_click={() => set_reasoning_effort(undefined)}>
                  {t('edit-api-configuration-form.unset')}
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
        </UiFieldset>
      </div>
    </UiScrollable>
  )
}
