import { useState, useEffect } from 'react'
import styles from './EditAgentConfigurationForm.module.scss'
import { AgentConfiguration } from '@shared/types/agent-configuration'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { BackendMessage } from '@/views/prompt/types/messages'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/prompt/Fieldset'
import { QuickPickButton as UiQuickPickButton } from '@ui/components/editor/common/QuickPickButton'
import { use_translation } from '../../i18n/use-translation'
import { AGENTS } from '@/constants/agents'

type Props = {
  agent_configuration: AgentConfiguration
  on_update: (updated_agent_configuration: AgentConfiguration) => void
  pick_agent: (agent_id?: string) => void
}

export const EditAgentConfigurationForm: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [agent, set_agent] = useState(props.agent_configuration.agent)
  const [name, set_name] = useState(props.agent_configuration.name)
  const [flags, set_flags] = useState(props.agent_configuration.flags)

  useEffect(() => {
    if (agent) {
      props.on_update({
        name,
        agent,
        ...(flags ? { flags } : {}),
        is_pinned: props.agent_configuration.is_pinned
      })
    } else {
      props.on_update({
        name
      })
    }
  }, [name, agent, flags])

  useEffect(() => {
    const handle_message = (event: MessageEvent) => {
      const message = event.data as BackendMessage
      if (message.command == 'NEWLY_PICKED_AGENT') {
        set_agent(message.agent_id)
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
            label={t('edit-agent-configuration-form.agent')}
            html_for="agent"
          >
            <UiQuickPickButton
              label={agent || '—'}
              onClick={(e) => {
                e.stopPropagation()
                props.pick_agent(agent)
              }}
            />
          </UiField>

          <UiField
            label={t('edit-agent-configuration-form.name')}
            html_for="name"
          >
            <UiInput
              id="name"
              type="text"
              value={name && /^\(\d+\)$/.test(name) ? '' : name!}
              on_change={set_name}
              placeholder={
                agent ||
                t('edit-agent-configuration-form.name.placeholder.group')
              }
            />
          </UiField>

          <UiField
            label={t('edit-agent-configuration-form.flags')}
            html_for="flags"
            info={
              agent && AGENTS[agent as keyof typeof AGENTS]?.docs_url ? (
                <>
                  <a
                    href={AGENTS[agent as keyof typeof AGENTS].docs_url}
                  >
                    {t('edit-agent-configuration-form.flags.info.learn-more')}
                  </a>
                  {t('edit-agent-configuration-form.flags.info.about').replace(
                    '{agent}',
                    agent
                  )}
                </>
              ) : undefined
            }
          >
            <UiInput
              id="flags"
              type="text"
              value={flags || ''}
              on_change={set_flags}
              placeholder={t('edit-agent-configuration-form.flags.placeholder')}
            />
          </UiField>
        </UiFieldset>
      </div>
    </UiScrollable>
  )
}