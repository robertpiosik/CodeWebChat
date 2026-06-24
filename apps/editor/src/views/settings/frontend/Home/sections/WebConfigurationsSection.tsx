import { forwardRef, useEffect, useState } from 'react'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Notice as UiNotice } from '@ui/components/editor/settings/Notice'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { WebConfiguration } from '@shared/types/web-configuration'
import { Icon } from '@ui/components/editor/common/Icon'
import { CHATBOTS } from '@shared/constants/chatbots'
import { use_translation } from '../../i18n/use-translation'
import { NavItem } from '../Home'

type Props = {
  web_configurations: WebConfiguration[]
  set_web_configurations: (configurations: WebConfiguration[]) => void
  on_reorder_web_configurations: (reordered: WebConfiguration[]) => void
  on_add_web_configuration: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
  on_duplicate_web_configuration: (id: string) => void
  on_edit_web_configuration: (id: string) => void
  on_delete_web_configuration: (name: string) => void
  set_section_ref: (id: NavItem, el: HTMLDivElement | null) => void
  reuse_last_tab: boolean
  on_reuse_last_tab_change: (enabled: boolean) => void
  gemini_user_id: number | null
  ai_studio_user_id: number | null
  on_gemini_user_id_change: (id: number | null) => void
  on_ai_studio_user_id_change: (id: number | null) => void
}

const chatbot_to_icon: Record<keyof typeof CHATBOTS, Icon.Variant> = {
  'AI Studio': 'AI_STUDIO',
  ChatGPT: 'CHATGPT',
  Claude: 'CLAUDE',
  Copilot: 'COPILOT',
  DeepSeek: 'DEEPSEEK',
  Doubao: 'DOUBAO',
  Gemini: 'GEMINI',
  'GitHub Copilot': 'GITHUB_COPILOT',
  Grok: 'GROK',
  HuggingChat: 'HUGGING_CHAT',
  Kimi: 'KIMI',
  Mistral: 'MISTRAL',
  'Meta AI': 'META',
  Arena: 'ARENA',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  Qwen: 'QWEN',
  Together: 'TOGETHER',
  Yuanbao: 'YUANBAO',
  Z: 'Z_AI'
}

export const WebConfigurationsSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { t } = use_translation()

    const has_gemini = props.web_configurations.some(
      (c) => c.chatbot == 'Gemini'
    )
    const has_ai_studio = props.web_configurations.some(
      (c) => c.chatbot == 'AI Studio'
    )

    const [gemini_user_id_str, set_gemini_user_id_str] = useState('')
    const [ai_studio_user_id_str, set_ai_studio_user_id_str] = useState('')

    useEffect(() => {
      set_gemini_user_id_str(
        props.gemini_user_id === null || props.gemini_user_id === undefined
          ? ''
          : String(props.gemini_user_id)
      )
    }, [props.gemini_user_id])

    useEffect(() => {
      set_ai_studio_user_id_str(
        props.ai_studio_user_id === null ||
          props.ai_studio_user_id === undefined
          ? ''
          : String(props.ai_studio_user_id)
      )
    }, [props.ai_studio_user_id])

    const handle_gemini_user_id_blur = () => {
      if (gemini_user_id_str == '') {
        props.on_gemini_user_id_change(null)
        return
      }
      const num_id = parseInt(gemini_user_id_str, 10)
      if (!isNaN(num_id) && num_id >= 0) props.on_gemini_user_id_change(num_id)
    }

    const handle_ai_studio_user_id_blur = () => {
      if (ai_studio_user_id_str == '') {
        props.on_ai_studio_user_id_change(null)
        return
      }
      const num_id = parseInt(ai_studio_user_id_str, 10)
      if (!isNaN(num_id) && num_id >= 0)
        props.on_ai_studio_user_id_change(num_id)
    }

    return (
      <UiSection
        ref={ref}
        title={t('sections.chatbots')}
        subtitle={t('web-configurations.subtitle')}
      >
        <UiNotice type="info">{t('web-configurations.notice')}</UiNotice>
        {props.web_configurations.length == 0 && (
          <UiNotice type="warning">
            {t('web-configurations.notice.missing')}
          </UiNotice>
        )}
        <UiGroup>
          <UiItem
            title={t('preferences.reuse-last-tab.title')}
            description={t('preferences.reuse-last-tab.description')}
            slot_right={
              <UiToggler
                is_on={props.reuse_last_tab}
                on_toggle={props.on_reuse_last_tab_change}
              />
            }
          />
        </UiGroup>
        <div ref={(el) => props.set_section_ref('web-configurations', el)}>
          <UiGroup title={t('web-configurations.configurations.title')}>
            {props.web_configurations && (
              <SortableList
                items={props.web_configurations.map((c, index) => ({
                  ...c,
                  id: c.name ?? `unnamed-${index}`
                }))}
                on_reorder={(reordered) => {
                  const restored = reordered.map(
                    ({ id: _id, ...rest }) => rest as WebConfiguration
                  )
                  props.set_web_configurations(restored)
                  props.on_reorder_web_configurations(restored)
                }}
                on_add={props.on_add_web_configuration}
                translations={{
                  add_title: t('action.add-new'),
                  item_text: t('web-configurations.item'),
                  items_text: t('web-configurations.items'),
                  items_text_many: t('web-configurations.items-many')
                }}
                render_content={(config) => {
                  const is_unnamed =
                    !config.name ||
                    config.name.startsWith('unnamed-') ||
                    /^\(\d+\)$/.test(config.name.trim())
                  const display_name = is_unnamed
                    ? config.chatbot!
                    : config.name!.replace(/ \(\d+\)$/, '')

                  const get_details = (): string[] => {
                    const { chatbot, model, reasoning_effort } = config
                    const model_display_name =
                      model && chatbot && CHATBOTS[chatbot]
                        ? CHATBOTS[chatbot].models?.[model]?.label || model
                        : null

                    const details: string[] = []
                    if (is_unnamed) {
                      if (model_display_name) details.push(model_display_name)
                    } else if (model_display_name) {
                      details.push(chatbot!, model_display_name)
                    } else if (chatbot) {
                      details.push(chatbot)
                    }

                    if (reasoning_effort) {
                      details.push(reasoning_effort)
                    }

                    return details
                  }

                  const details = get_details()

                  return (
                    <>
                      {config.chatbot && chatbot_to_icon[config.chatbot] && (
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fill: 'var(--vscode-foreground)'
                          }}
                        >
                          <Icon variant={chatbot_to_icon[config.chatbot]} />
                        </div>
                      )}
                      <div
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        <span>{display_name}</span>
                        {details.length > 0 && (
                          <span
                            style={{
                              marginLeft: '0.5em',
                              opacity: 0.7,
                              fontSize: '0.9em'
                            }}
                          >
                            {details.join(' · ')}
                          </span>
                        )}
                      </div>
                    </>
                  )
                }}
                render_actions={(config, index) => (
                  <>
                    <IconButton
                      codicon_icon="insert"
                      title={t('web-configurations.action.insert')}
                      on_click={() =>
                        props.on_add_web_configuration({
                          insertion_index: index
                        })
                      }
                    />
                    <IconButton
                      codicon_icon="files"
                      title={t('web-configurations.action.duplicate')}
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_duplicate_web_configuration(config.id)
                      }}
                    />
                    <IconButton
                      codicon_icon="edit"
                      title={t('web-configurations.action.edit')}
                      on_click={() =>
                        props.on_edit_web_configuration(config.id)
                      }
                    />
                    <IconButton
                      codicon_icon="trash"
                      title={t('web-configurations.action.delete')}
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_delete_web_configuration(config.id)
                      }}
                    />
                  </>
                )}
              />
            )}
            {has_gemini && (
              <UiItem
                title={t('preferences.gemini-user-id.title')}
                description={t('preferences.gemini-user-id.description')}
                slot_right={
                  <UiInput
                    type="number"
                    value={gemini_user_id_str}
                    on_change={set_gemini_user_id_str}
                    on_blur={handle_gemini_user_id_blur}
                    max_width={60}
                  />
                }
              />
            )}
            {has_ai_studio && (
              <UiItem
                title={t('preferences.ai-studio-user-id.title')}
                description={t('preferences.ai-studio-user-id.description')}
                slot_right={
                  <UiInput
                    type="number"
                    value={ai_studio_user_id_str}
                    on_change={set_ai_studio_user_id_str}
                    on_blur={handle_ai_studio_user_id_blur}
                    max_width={60}
                  />
                }
              />
            )}
          </UiGroup>
        </div>
      </UiSection>
    )
  }
)

WebConfigurationsSection.displayName = 'WebConfigurationsSection'
