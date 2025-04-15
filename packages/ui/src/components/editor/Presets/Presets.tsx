import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../Icon'

export namespace Presets {
  export type Preset = {
    id?: string | number
    name: string
    chatbot: string
    has_affixes: boolean
  }

  export type Props = {
    presets: Preset[]
    on_preset_click: (name: string) => void
    disabled: boolean
    selected_presets: string[]
    on_create_preset: () => void
    is_fim_mode: boolean
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
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

export const Presets: React.FC<Presets.Props> = (props) => {
  if (props.presets.length == 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <span>MY PRESETS</span>
        <IconButton
          codicon_icon="info"
          href="https://gemini-coder.netlify.app/docs/features/chat/presets"
        />
      </div>

      <div
        className={cn(styles.presets, {
          [styles['presets--disabled']]: props.disabled
        })}
      >
        <ReactSortable
          list={with_ids(props.presets)}
          setList={(new_state) => {
            if (props.on_presets_reorder) {
              const clean_presets = new_state.map(({ id, ...preset }) => preset)
              props.on_presets_reorder(clean_presets)
            }
          }}
          animation={150}
          handle={`.${styles.presets__item__header__right__drag_handle}`}
          disabled={props.disabled}
        >
          {props.presets.map((preset, i) => {
            const is_disabled_in_fim = props.is_fim_mode && preset.has_affixes

            return (
              <div key={i} className={styles.presets__item}>
                <div className={styles.presets__item__header}>
                  <div className={styles.presets__item__header__left}>
                    {preset.chatbot == 'AI Studio' && (
                      <div className={styles.presets__item__header__left__icon}>
                        <Icon variant="AI_STUDIO" />
                      </div>
                    )}
                    {preset.chatbot == 'Gemini' && (
                      <div className={styles.presets__item__header__left__icon}>
                        <Icon variant="GEMINI" />
                      </div>
                    )}

                    <div
                      className={cn(styles.presets__item__header__left__title, {
                        [styles['presets__item__header__title--default']]:
                          props.selected_presets.includes(preset.name),
                        [styles['presets__item__header__title--disabled']]:
                          is_disabled_in_fim
                      })}
                      onClick={(e) => {
                        if (is_disabled_in_fim) return
                        e.stopPropagation()
                        props.on_preset_click(preset.name)
                      }}
                      title={preset.name}
                    >
                      {preset.name}
                    </div>
                  </div>
                  <div className={styles.presets__item__header__right}>
                    {preset.has_affixes && (
                      <IconButton
                        codicon_icon="copy"
                        title="Copy to clipboard"
                        on_click={() => {
                          props.on_preset_copy(preset.name)
                        }}
                      />
                    )}
                    <IconButton
                      codicon_icon="files"
                      title="Duplicate"
                      on_click={() => {
                        props.on_preset_duplicate(preset.name)
                      }}
                    />
                    <IconButton
                      codicon_icon="edit"
                      title="Edit"
                      on_click={() => {
                        props.on_preset_edit(preset.name)
                      }}
                    />
                    <IconButton
                      codicon_icon="trash"
                      title="Delete"
                      on_click={() => {
                        props.on_preset_delete(preset.name)
                      }}
                    />
                    <div
                      className={
                        styles.presets__item__header__right__drag_handle
                      }
                    >
                      <span className="codicon codicon-gripper" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </ReactSortable>

        <div className={styles.presets__create}>
          <Button on_click={props.on_create_preset}>Create Preset</Button>
        </div>
      </div>
    </div>
  )
}
