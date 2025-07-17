import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../Icon'
import { useState } from 'react'
import { CHATBOTS } from '@shared/constants/chatbots'
import { chatbot_to_icon } from '../../../constants/chatbot-to-icon'
import { TextButton } from '../TextButton'

export namespace Presets {
  export type Preset = {
    id?: string | number
    name: string
    model?: string
    chatbot: keyof typeof CHATBOTS
    has_affixes: boolean
  }

  export type Props = {
    presets: Preset[]
    is_disabled: boolean
    on_preset_click: (name: string) => void
    selected_presets: string[]
    on_create_preset: () => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
    on_set_default_presets: () => void
  }
}

const with_ids = (
  presets: Presets.Preset[]
): (Presets.Preset & { id: string })[] => {
  return presets.map((preset) => ({
    ...preset,
    id: preset.id?.toString() || preset.name
  }))
}

const ChatbotIcon: React.FC<{
  chatbot: keyof typeof CHATBOTS
  is_disabled: boolean
}> = (params) => {
  const icon_variant = chatbot_to_icon[params.chatbot]

  if (!icon_variant) return null

  return (
    <div
      className={cn(styles.presets__item__left__icon, {
        [styles['presets__item__left__icon--disabled']]: params.is_disabled
      })}
    >
      <Icon variant={icon_variant} />
    </div>
  )
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const [highlighted_preset_name, set_highlighted_preset_name] =
    useState<string>()

  return (
    <div
      className={cn(styles.container, {
        [styles['container--disabled']]: props.is_disabled
      })}
    >
      <div className={styles['my-presets']}>
        <div className={styles['my-presets__left']}>MY PRESETS</div>

        <TextButton
          on_click={props.on_set_default_presets}
          title="Set presets opening by default"
        >
          Select default
        </TextButton>
      </div>

      <div className={styles.presets}>
        <ReactSortable
          list={with_ids(props.presets)}
          setList={(new_state) => {
            if (props.on_presets_reorder) {
              const clean_presets = new_state.map(({ id, ...preset }) => preset)
              props.on_presets_reorder(clean_presets)
            }
          }}
          animation={150}
          handle={`.${styles.presets__item__right__drag_handle}`}
        >
          {props.presets.map((preset, i) => {
            const is_unnamed =
              !preset.name || /^\(\d+\)$/.test(preset.name.trim())
            const display_name = is_unnamed ? preset.chatbot : preset.name

            const get_subtitle = (): string => {
              const { chatbot, model } = preset

              const model_display_name = model
                ? (CHATBOTS[chatbot] as any).models[model] || model
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
                key={i}
                className={cn(styles.presets__item, {
                  [styles['presets__item--highlighted']]:
                    highlighted_preset_name == preset.name
                })}
                onClick={() => {
                  props.on_preset_click(preset.name)
                  set_highlighted_preset_name(preset.name)
                }}
                role="button"
                title={display_name}
              >
                <div className={styles.presets__item__left}>
                  <ChatbotIcon chatbot={preset.chatbot} is_disabled={false} />

                  <div
                    className={cn(styles.presets__item__left__text, {
                      [styles['presets__item__left__text--selected']]:
                        props.selected_presets.includes(preset.name)
                    })}
                  >
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
                  {preset.has_affixes && (
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
                      set_highlighted_preset_name(preset.name)
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
                  <div className={styles.presets__item__right__drag_handle}>
                    <span className="codicon codicon-gripper" />
                  </div>
                </div>
              </div>
            )
          })}
        </ReactSortable>
      </div>

      <div className={styles.presets__create}>
        <Button on_click={props.on_create_preset}>Create Preset</Button>
      </div>
    </div>
  )
}
