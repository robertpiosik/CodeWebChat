import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Checkbox } from '../../common/Checkbox'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../../common/Icon'
import { CHATBOTS } from '@shared/constants/chatbots'
import { Button } from '../Button/Button'
import { use_context_menu } from '../../../../hooks/use-context-menu'

export const chatbot_to_icon: Record<keyof typeof CHATBOTS, Icon.Variant> = {
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
  Minimax: 'MINIMAX',
  Mistral: 'MISTRAL',
  // Meta: 'META',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  Perplexity: 'PERPLEXITY',
  Qwen: 'QWEN',
  Together: 'TOGETHER',
  Yuanbao: 'YUANBAO',
  'Z.AI': 'Z_AI'
}

export namespace Presets {
  export type Preset = {
    name: string
    model?: string
    chatbot?: keyof typeof CHATBOTS
    prompt_prefix?: string
    prompt_suffix?: string
    is_selected?: boolean
    is_collapsed?: boolean
  }

  export type Props = {
    web_mode: 'ask' | 'edit-context' | 'code-completions' | 'no-context'
    is_connected: boolean
    has_instructions: boolean
    is_in_code_completions_mode: boolean
    has_context: boolean
    presets: Preset[]
    on_preset_click: (preset_name: string, without_submission?: boolean) => void
    on_group_click: (group_name: string, without_submission?: boolean) => void
    on_create_preset: () => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
    on_toggle_selected_preset: (name: string) => void
    on_toggle_group_collapsed: (name: string) => void
    selected_preset_name?: string
  }
}

const with_ids = (
  presets: Presets.Preset[]
): (Presets.Preset & { id: string })[] => {
  return presets.map((preset) => ({
    ...preset,
    id: preset.name
  }))
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const get_visible_presets = (presets: Presets.Preset[]): Presets.Preset[] => {
    const visible_presets: Presets.Preset[] = []
    let is_in_collapsed_group = false
    for (const preset of presets) {
      if (is_in_collapsed_group && preset.chatbot) {
        continue
      }
      if (!preset.chatbot) {
        is_in_collapsed_group = !!preset.is_collapsed
      }
      visible_presets.push(preset)
    }
    return visible_presets
  }

  const name_to_index_map = new Map(props.presets.map((p, i) => [p.name, i]))

  const {
    context_menu,
    context_menu_ref,
    handle_context_menu,
    close_context_menu
  } = use_context_menu<{
    preset_name: string
    is_group: boolean
  }>()

  return (
    <div className={styles.container}>
      <div className={styles.presets}>
        {props.presets[0]?.chatbot !== undefined && (
          <div
            className={cn(styles.presets__item, {
              [styles['presets__item--ungrouped']]: true,
              [styles['presets__item--highlighted']]:
                props.selected_preset_name == 'Ungrouped'
            })}
            onClick={() => {
              props.on_group_click('Ungrouped') // disabled check will be handled by the consumer
            }}
            onContextMenu={(e) =>
              handle_context_menu(e, {
                preset_name: 'Ungrouped',
                is_group: true
              })
            }
            role="button"
          >
            <div className={styles.presets__item__left}>
              <div
                className={cn(
                  styles.presets__item__left__drag_handle,
                  styles['presets__item__left__drag_handle--disabled']
                )}
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                <span className="codicon codicon-gripper" />
              </div>
              <div className={styles['presets__item__left__collapse-icon']}>
                <span className={'codicon codicon-dash'} />
              </div>
              <div className={styles.presets__item__left__text}>Ungrouped</div>
            </div>
          </div>
        )}

        <ReactSortable
          list={with_ids(get_visible_presets(props.presets))}
          setList={(new_state) => {
            if (props.on_presets_reorder) {
              const new_visible_presets = new_state.map(
                ({ id, ...preset }) => preset
              ) as Presets.Preset[]

              const reordered_presets: Presets.Preset[] = []

              for (const preset of new_visible_presets) {
                reordered_presets.push(preset)

                if (!preset.chatbot && preset.is_collapsed) {
                  // It's a collapsed group. Find its children in original list and add them.
                  const original_index = props.presets.findIndex(
                    (p) => p.name === preset.name
                  )

                  if (original_index !== -1) {
                    for (
                      let i = original_index + 1;
                      i < props.presets.length;
                      i++
                    ) {
                      const child_candidate = props.presets[i]
                      if (child_candidate.chatbot) {
                        reordered_presets.push(child_candidate)
                      } else {
                        // next group found
                        break
                      }
                    }
                  }
                }
              }
              props.on_presets_reorder(reordered_presets)
            }
          }}
          animation={150}
          handle={`.${styles.presets__item__left__drag_handle}`}
        >
          {get_visible_presets(props.presets).map((preset) => {
            const i = name_to_index_map.get(preset.name)!

            const is_unnamed =
              !preset.name || /^\(\d+\)$/.test(preset.name.trim())
            let display_name: string
            if (preset.chatbot) {
              // Preset (has chatbot)
              display_name = is_unnamed ? preset.chatbot : preset.name
            } else {
              // Group (no chatbot)
              display_name = is_unnamed ? 'Unnamed group' : preset.name
            }

            const get_subtitle = (): string => {
              const { chatbot, model } = preset

              if (!chatbot) {
                return model || ''
              }

              const model_display_name = model
                ? (CHATBOTS[chatbot].models as any)[model]?.label || model
                : null

              if (is_unnamed) {
                return model_display_name || ''
              }

              if (model_display_name) {
                return `${chatbot} · ${model_display_name}`
              }

              return chatbot
            }

            return (
              <div
                key={preset.name}
                className={cn(styles.presets__item, {
                  [styles['presets__item--highlighted']]:
                    props.selected_preset_name == preset.name
                })}
                onClick={() => {
                  if (preset.chatbot) {
                    props.on_preset_click(preset.name)
                  } else {
                    props.on_group_click(preset.name)
                  }
                }}
                onContextMenu={(e) =>
                  handle_context_menu(e, {
                    preset_name: preset.name,
                    is_group: !preset.chatbot
                  })
                }
                role="button"
              >
                <div className={styles.presets__item__left}>
                  <div
                    className={styles.presets__item__left__drag_handle}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <span className="codicon codicon-gripper" />
                  </div>
                  {preset.chatbot && (
                    <Checkbox
                      checked={!!preset.is_selected}
                      on_change={() =>
                        props.on_toggle_selected_preset(preset.name)
                      }
                      on_click={(e) => e.stopPropagation()}
                      title={
                        preset.is_selected
                          ? 'Unset as selected'
                          : 'Set as selected'
                      }
                    />
                  )}
                  {preset.chatbot && (
                    <div className={styles.presets__item__left__icon}>
                      <Icon variant={chatbot_to_icon[preset.chatbot]} />
                    </div>
                  )}
                  {!preset.chatbot && (
                    <div
                      className={styles['presets__item__left__collapse-icon']}
                      style={{ cursor: 'pointer' }}
                      title={preset.is_collapsed ? 'Expand' : 'Collapse'}
                      onClick={(e) => {
                        e.stopPropagation()
                        props.on_toggle_group_collapsed(preset.name)
                      }}
                    >
                      <span
                        className={cn('codicon', {
                          'codicon-chevron-down': preset.is_collapsed,
                          'codicon-chevron-up': !preset.is_collapsed
                        })}
                      />
                    </div>
                  )}
                  <div className={styles.presets__item__left__text}>
                    <span>{display_name}</span>
                    <span>{get_subtitle()}</span>
                  </div>
                </div>

                <div
                  className={styles.presets__item__right}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  {preset.chatbot &&
                    (preset.prompt_prefix || preset.prompt_suffix) && (
                      <IconButton
                        codicon_icon="copy"
                        title="Copy to clipboard"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_preset_copy(preset.name)
                        }}
                      />
                    )}
                  <IconButton
                    codicon_icon="files"
                    title="Duplicate"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_duplicate(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title="Edit"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_edit(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title="Delete"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_delete(preset.name)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </ReactSortable>
      </div>
      {context_menu && (
        <div
          ref={context_menu_ref}
          className={styles['context-menu']}
          style={{
            top: context_menu.y,
            left: context_menu.x
          }}
        >
          <div
            className={styles['context-menu__item']}
            onClick={() => {
              if (context_menu.data.is_group) {
                props.on_group_click(context_menu.data.preset_name, true)
              } else {
                props.on_preset_click(context_menu.data.preset_name, true)
              }
              close_context_menu()
            }}
          >
            {'Run without submission'}
          </div>
        </div>
      )}
      <div className={styles.footer}>
        <Button on_click={props.on_create_preset}>Add New Preset</Button>
      </div>
    </div>
  )
}
