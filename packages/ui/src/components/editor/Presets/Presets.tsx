import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'

export namespace Presets {
  export type Preset = {
    id?: string | number
    name: string
    chatbot: string
    prompt_prefix?: string
    prompt_suffix?: string
    model?: string
    temperature?: number
    system_instructions?: string
    options?: string[]
    port?: number
  }

  export type Props = {
    presets: Preset[]
    on_preset_click: (name: string) => void
    disabled: boolean
    selected_presets: string[]
    on_selected_presets_change: (selected_names: string[]) => void
    on_edit_presets: () => void
    expanded_presets: number[]
    on_expanded_presets_change: (expanded_indices: number[]) => void
    is_fim_mode: boolean
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
  }
}

const DetailField = ({
  label,
  value
}: {
  label: string
  value: string | number | undefined
}) => {
  if (!value) return null

  return (
    <div className={styles.presets__item__details__row__field}>
      <span className={styles.presets__item__details__row__field__label}>
        {label}
      </span>
      <span className={styles.presets__item__details__row__field__value}>
        {value}
      </span>
    </div>
  )
}

const DetailArrayField = ({
  label,
  values
}: {
  label: string
  values: string[] | undefined
}) => {
  if (!values || values.length === 0) return null

  return (
    <div className={styles.presets__item__details__row__field}>
      <span className={styles.presets__item__details__row__field__label}>
        {label}
      </span>
      <span className={styles.presets__item__details__row__field__value}>
        {values.join(', ')}
      </span>
    </div>
  )
}

const with_ids = (
  presets: Presets.Preset[]
): (Presets.Preset & { id: string })[] => {
  return presets.map((preset) => ({
    ...preset,
    id: preset.id?.toString() || preset.name
  }))
}

const is_preset_disabled_in_fim = (
  is_fim_mode: boolean | undefined,
  preset: Presets.Preset
): boolean => {
  return !!is_fim_mode && !!(preset.prompt_prefix || preset.prompt_suffix)
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const toggle_expand = (index: number) => {
    const new_expanded = props.expanded_presets.includes(index)
      ? props.expanded_presets.filter((i) => i != index)
      : [...props.expanded_presets, index]
    props.on_expanded_presets_change(new_expanded)
  }

  const handle_checkbox_change = (name: string) => {
    if (props.on_selected_presets_change) {
      const new_selected = props.selected_presets.includes(name)
        ? props.selected_presets.filter((n) => n != name)
        : [...(props.selected_presets || []), name]
      props.on_selected_presets_change(new_selected)
    }
  }

  if (props.presets.length == 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <span>MY PRESETS</span>
        {!props.disabled && (
          <IconButton codicon_icon="edit" on_click={props.on_edit_presets} />
        )}
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
            const is_disabled_in_fim = is_preset_disabled_in_fim(
              props.is_fim_mode,
              preset
            )
            const has_affixes = !!(preset.prompt_prefix || preset.prompt_suffix)

            return (
              <div key={i} className={styles.presets__item}>
                <div
                  className={styles.presets__item__header}
                  onClick={() => toggle_expand(i)}
                  role="button"
                >
                  <div
                    className={cn(styles.presets__item__header__title, {
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
                  >
                    <span>{preset.name}</span>
                  </div>
                  <div className={styles.presets__item__header__right}>
                    <div
                      className={
                        styles.presets__item__header__right__drag_handle
                      }
                    >
                      <span className="codicon codicon-gripper" />
                    </div>

                    <div
                      className={cn(
                        'codicon',
                        props.expanded_presets.includes(i)
                          ? 'codicon-chevron-up'
                          : 'codicon-chevron-down'
                      )}
                    />
                  </div>
                </div>

                {props.expanded_presets.includes(i) && (
                  <>
                    {is_disabled_in_fim && (
                      <div className={styles.presets__item__info}>
                        <span className="codicon codicon-info" />
                        <span>Unavailable in FIM due to affix</span>
                      </div>
                    )}

                    <div
                      className={cn(styles.presets__item__details, {
                        [styles['presets__item__details--disabled']]:
                          is_disabled_in_fim
                      })}
                    >
                      <div className={styles.presets__item__details__actions}>
                        {has_affixes && (
                          <IconButton
                            codicon_icon="copy"
                            on_click={() => props.on_preset_copy!(preset.name)}
                            title="Copy to clipboard"
                          />
                        )}
                        <IconButton
                          codicon_icon="send"
                          on_click={() => props.on_preset_click(preset.name)}
                          title="Send"
                        />
                      </div>

                      <div className={styles.presets__item__details__row}>
                        <DetailField label="Chatbot" value={preset.chatbot} />
                        <DetailField label="Model" value={preset.model} />
                        <DetailField
                          label="Temperature"
                          value={preset.temperature}
                        />
                        <DetailField
                          label="Prompt Prefix"
                          value={preset.prompt_prefix}
                        />
                        <DetailField
                          label="Prompt Suffix"
                          value={preset.prompt_suffix}
                        />
                        <DetailField
                          label="System Instructions"
                          value={preset.system_instructions}
                        />
                        <DetailArrayField
                          label="Options"
                          values={preset.options}
                        />
                      </div>

                      {/* Checkbox moved below details */}
                      <label
                        className={styles.presets__item__details__default_check}
                      >
                        Use by default
                        <input
                          type="checkbox"
                          checked={
                            props.selected_presets.includes(preset.name) ||
                            false
                          }
                          onChange={() => handle_checkbox_change(preset.name)}
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </ReactSortable>
        <div className={styles.presets__edit}>
          <Button on_click={props.on_edit_presets}>Edit Presets</Button>
        </div>
      </div>
    </div>
  )
}
