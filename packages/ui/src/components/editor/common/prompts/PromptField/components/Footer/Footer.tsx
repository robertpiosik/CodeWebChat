import { useRef, useEffect, useState, RefObject } from 'react'
import cn from 'classnames'
import styles from '../../PromptField.module.scss'
import { Icon } from '../../../../Icon'
import { DropdownMenu } from '../../../../DropdownMenu'
import { Tooltip } from '../../../../Tooltip'
import { KeycapWrapper } from '../../../../../prompt-view/KeycapWrapper'
import { Target } from '@shared/types/target'
import type { PromptFieldProps, EditFormat } from '../../PromptField'

type Props = {
  props: PromptFieldProps
  input_ref: RefObject<HTMLDivElement>
  is_mac: boolean
  is_alt_pressed: boolean
  is_dropdown_open: boolean
  toggle_dropdown: () => void
  close_dropdown: () => void
  dropdown_ref: RefObject<HTMLDivElement>
  handle_submit: (e: any) => void
  handle_copy_click: () => void
  handle_select_click: () => void
}

export const Footer: React.FC<Props> = (props) => {
  const [show_submit_tooltip, set_show_submit_tooltip] = useState(false)
  const [is_recording_hovered, set_is_recording_hovered] = useState(false)
  const [is_edit_format_hovered, set_is_edit_format_hovered] = useState(false)
  const [is_more_hovered, set_is_more_hovered] = useState(false)
  const [is_target_dropdown_open, set_is_target_dropdown_open] = useState(false)
  const [hovered_left_action, set_hovered_left_action] = useState<
    'at' | 'hash' | 'slash' | null
  >(null)

  const chevron_button_ref = useRef<HTMLButtonElement>(null)
  const disconnected_chevron_button_ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const has_submit_button =
      !props.props.is_copy_only &&
      (!props.props.is_web_target ||
        (props.props.is_web_target && props.props.is_connected)) &&
      !props.props.is_recording &&
      !!props.props.value

    if (!has_submit_button) {
      set_show_submit_tooltip(false)
    }
  }, [
    props.props.value,
    props.props.is_recording,
    props.props.is_web_target,
    props.props.is_connected,
    props.props.is_copy_only
  ])

  useEffect(() => {
    const has_mic_button = props.props.is_recording || !props.props.value

    if (!has_mic_button) {
      set_is_recording_hovered(false)
    }
  }, [
    props.props.value,
    props.props.is_recording,
    props.props.is_web_target,
    props.props.is_connected
  ])

  useEffect(() => {
    if (is_target_dropdown_open) {
      const handle_click = () => {
        set_is_target_dropdown_open(false)
      }

      document.addEventListener('click', handle_click)
      return () => {
        document.removeEventListener('click', handle_click)
      }
    }
  }, [is_target_dropdown_open])

  const primary_dropdown_items =
    (props.props.target == 'API' || props.props.target == 'CLI') &&
    !props.props.value
      ? []
      : [
          ...(!props.props.value
            ? [
                {
                  label: props.props.translations.send,
                  shortcut: props.is_mac ? '↩' : 'Enter',
                  on_click: () => {
                    props.handle_submit({
                      stopPropagation: () => {}
                    } as any)
                    props.close_dropdown()
                  }
                }
              ]
            : []),
          {
            label: props.props.translations.send_with_ellipsis,
            shortcut: props.is_mac ? '⌘↩' : 'Ctrl+Enter',
            on_click: props.handle_select_click
          },
          ...(props.props.target == 'WEB'
            ? [
                {
                  label: props.props.translations.copy_prompt,
                  shortcut: props.is_mac ? '⌘C' : 'Ctrl+C',
                  on_click: props.handle_copy_click
                }
              ]
            : []),
          ...(props.props.value
            ? [
                {
                  label: props.props.translations.voice_input,
                  shortcut: props.is_mac ? '⇧⌘Space' : 'Ctrl+Shift+Space',
                  on_click: () => {
                    props.props.on_recording_started()
                    props.close_dropdown()
                  }
                }
              ]
            : []),
          {
            label: props.props.translations.preview_prompt,
            on_click: () => {
              props.props.on_preview_prompt?.()
              props.close_dropdown()
            }
          }
        ]

  const disconnected_dropdown_items =
    (props.props.target == 'API' || props.props.target == 'CLI') &&
    !props.props.value
      ? []
      : [
          ...(!props.props.value
            ? [
                {
                  label: props.props.translations.copy_prompt,
                  shortcut: props.is_mac ? '⌘C' : 'Ctrl+C',
                  on_click: props.handle_copy_click
                }
              ]
            : []),
          ...(props.props.value
            ? [
                {
                  label: props.props.translations.voice_input,
                  shortcut: props.is_mac ? '⇧⌘Space' : 'Ctrl+Shift+Space',
                  on_click: () => {
                    props.props.on_recording_started()
                    props.close_dropdown()
                  }
                }
              ]
            : []),
          {
            label: props.props.translations.preview_prompt,
            on_click: () => {
              props.props.on_preview_prompt?.()
              props.close_dropdown()
            }
          }
        ]

  return (
    <div
      className={styles.footer}
      onClick={() => {
        if (props.input_ref.current) {
          props.input_ref.current.focus()
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.selectNodeContents(props.input_ref.current)
            if (!props.props.value) {
              range.collapse(true)
            }
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }}
    >
      {hovered_left_action == 'at' && (
        <Tooltip
          message={props.props.translations.reference_file}
          align="left"
          offset={9}
        />
      )}
      {hovered_left_action == 'hash' && (
        <Tooltip
          message={props.props.translations.insert_symbol}
          align="left"
          offset={28}
        />
      )}
      {hovered_left_action == 'slash' && (
        <Tooltip
          message={props.props.translations.use_template}
          align="left"
          offset={48}
        />
      )}
      {show_submit_tooltip && (
        <Tooltip
          message={
            props.props.last_choice_tooltip
              ? `${props.props.translations.send_with} ${props.props.last_choice_tooltip.name}`
              : props.props.translations.send_with_ellipsis
          }
          details={props.props.last_choice_tooltip?.details}
          offset={28}
          align="right"
        />
      )}
      {is_recording_hovered && (
        <Tooltip
          message={
            props.props.is_recording
              ? props.props.translations.stop_recording
              : props.props.translations.voice_input
          }
          offset={
            !props.props.is_copy_only &&
            (!props.props.is_web_target ||
              (props.props.is_web_target && props.props.is_connected)) &&
            primary_dropdown_items.length > 0
              ? 28
              : 12
          }
          align="right"
        />
      )}
      {is_more_hovered && !props.is_dropdown_open && (
        <Tooltip
          message={props.props.translations.more}
          align="right"
          offset={11}
        />
      )}
      <div
        className={styles.footer__left}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <button
          onClick={() => {
            props.props.on_at_sign_click()
          }}
          className={cn(styles['footer__left__button'])}
          onMouseEnter={() => set_hovered_left_action('at')}
          onMouseLeave={() => set_hovered_left_action(null)}
        >
          <Icon variant="AT_SIGN" />
        </button>
        <button
          onClick={props.props.on_hash_sign_click}
          className={cn(styles['footer__left__button'])}
          onMouseEnter={() => set_hovered_left_action('hash')}
          onMouseLeave={() => set_hovered_left_action(null)}
        >
          <Icon variant="HASH_SIGN" />
        </button>
        <button
          onClick={props.props.on_slash_click}
          className={cn(styles['footer__left__button'])}
          onMouseEnter={() => set_hovered_left_action('slash')}
          onMouseLeave={() => set_hovered_left_action(null)}
        >
          <Icon variant="SLASH" />
        </button>
        <span className={styles.icon}></span>
      </div>
      <div
        className={styles.footer__right}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {props.props.show_edit_format_selector && props.props.edit_format && (
          <div className={styles['footer__right__edit-format']}>
            {is_edit_format_hovered && (
              <Tooltip
                message={props.props.translations.edit_format}
                align="center"
              />
            )}
            {!props.is_alt_pressed && (
              <span className={styles['footer__right__edit-format__plus']}>
                +{' '}
              </span>
            )}
            <button
              className={cn(styles['footer__right__edit-format__button'], {
                [styles['footer__right__edit-format__button--alt-pressed']]:
                  props.is_alt_pressed
              })}
              onClick={() => props.props.on_edit_format_change?.()}
              onMouseEnter={() => set_is_edit_format_hovered(true)}
              onMouseLeave={() => set_is_edit_format_hovered(false)}
            >
              {props.is_alt_pressed ? (
                <span className={styles['footer__right__edit-format__keycaps']}>
                  <KeycapWrapper
                    char={props.props.edit_format != 'whole' ? 'W' : undefined}
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.props.edit_format == 'whole'
                        }
                      )}
                      style={{
                        visibility:
                          props.props.edit_format != 'whole'
                            ? 'hidden'
                            : undefined
                      }}
                    >
                      W
                    </span>
                  </KeycapWrapper>
                  <KeycapWrapper
                    char={
                      props.props.edit_format != 'search-replace'
                        ? 'S'
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.props.edit_format == 'search-replace'
                        }
                      )}
                      style={{
                        visibility:
                          props.props.edit_format != 'search-replace'
                            ? 'hidden'
                            : undefined
                      }}
                    >
                      S
                    </span>
                  </KeycapWrapper>
                  <KeycapWrapper
                    char={props.props.edit_format != 'diff' ? 'D' : undefined}
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.props.edit_format == 'diff'
                        }
                      )}
                      style={{
                        visibility:
                          props.props.edit_format != 'diff'
                            ? 'hidden'
                            : undefined
                      }}
                    >
                      D
                    </span>
                  </KeycapWrapper>
                  <KeycapWrapper
                    char={
                      props.props.edit_format != 'truncated' ? 'T' : undefined
                    }
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.props.edit_format == 'truncated'
                        }
                      )}
                      style={{
                        visibility:
                          props.props.edit_format != 'truncated'
                            ? 'hidden'
                            : undefined
                      }}
                    >
                      T
                    </span>
                  </KeycapWrapper>
                </span>
              ) : (
                <span className={styles['footer__right__edit-format__text']}>
                  {
                    {
                      whole: props.props.translations.edit_format_whole,
                      'search-replace':
                        props.props.translations.edit_format_search_replace,
                      diff: props.props.translations.edit_format_diff,
                      truncated: props.props.translations.edit_format_truncated
                    }[props.props.edit_format as EditFormat]
                  }
                </span>
              )}
            </button>
          </div>
        )}

        <div
          className={styles['footer__right__submit']}
          ref={props.dropdown_ref}
        >
          {props.props.target && props.props.on_target_change && (
            <div className={styles['footer__right__target-switch']}>
              {(is_target_dropdown_open || props.is_alt_pressed) && (
                <div
                  className={
                    styles['footer__right__target-switch__dropdown-wrapper']
                  }
                >
                  <div
                    className={styles['footer__right__target-switch__dropdown']}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(['WEB', 'API', 'CLI'] as Target[]).map((t, idx) => (
                      <button
                        key={t}
                        className={
                          styles['footer__right__target-switch__dropdown-item']
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          props.props.on_target_change!(t)
                          set_is_target_dropdown_open(false)
                        }}
                        disabled={t == props.props.target}
                      >
                        {props.is_alt_pressed && t != props.props.target ? (
                          <KeycapWrapper char={(idx + 1).toString()}>
                            <span>{t}</span>
                          </KeycapWrapper>
                        ) : (
                          t
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                className={cn(
                  styles['footer__right__submit__button'],
                  styles['footer__right__target-switch__button'],
                  {
                    [styles['footer__right__submit__button--hovered']]:
                      is_target_dropdown_open || props.is_alt_pressed
                  }
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  set_is_target_dropdown_open(!is_target_dropdown_open)
                }}
              >
                <span className={styles['footer__right__target-switch__label']}>
                  {props.props.target == 'WEB'
                    ? 'WEB'
                    : props.props.target == 'API'
                      ? 'API'
                      : 'CLI'}
                </span>
              </button>
            </div>
          )}
          {!props.props.is_copy_only &&
            (!props.props.is_web_target ||
              (props.props.is_web_target && props.props.is_connected)) && (
              <>
                {props.props.is_recording ? (
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--submit'],
                      styles['footer__right__submit__button--recording'],
                      'codicon',
                      is_recording_hovered
                        ? 'codicon-debug-stop'
                        : 'codicon-mic-filled'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.props.on_recording_finished()
                    }}
                    onMouseEnter={() => set_is_recording_hovered(true)}
                    onMouseLeave={() => set_is_recording_hovered(false)}
                  />
                ) : !props.props.value ? (
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--submit'],
                      'codicon',
                      'codicon-mic'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.props.on_recording_started()
                    }}
                    onMouseEnter={() => set_is_recording_hovered(true)}
                    onMouseLeave={() => set_is_recording_hovered(false)}
                  />
                ) : (
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--submit'],
                      'codicon',
                      'codicon-send'
                    )}
                    onClick={(e) => {
                      props.handle_submit(e as any)
                    }}
                    onMouseEnter={() => set_show_submit_tooltip(true)}
                    onMouseLeave={() => set_show_submit_tooltip(false)}
                  />
                )}
                {primary_dropdown_items.length > 0 && (
                  <>
                    <button
                      ref={chevron_button_ref}
                      className={styles['footer__right__submit__button']}
                      onClick={() => {
                        props.toggle_dropdown()
                      }}
                      onMouseEnter={() => set_is_more_hovered(true)}
                      onMouseLeave={() => set_is_more_hovered(false)}
                    >
                      <span
                        className={cn(
                          {
                            [styles['footer__right__submit__button--toggled']]:
                              props.is_dropdown_open
                          },
                          'codicon',
                          'codicon-chevron-down'
                        )}
                      />
                    </button>
                    <DropdownMenu
                      anchor_ref={chevron_button_ref}
                      is_open={props.is_dropdown_open}
                      items={primary_dropdown_items}
                    />
                  </>
                )}
              </>
            )}
          {(props.props.is_copy_only ||
            (props.props.is_web_target && !props.props.is_connected)) && (
            <>
              {props.props.is_recording ? (
                <button
                  className={cn(
                    styles['footer__right__submit__button'],
                    styles['footer__right__submit__button--submit'],
                    styles['footer__right__submit__button--recording'],
                    'codicon',
                    is_recording_hovered
                      ? 'codicon-debug-stop'
                      : 'codicon-mic-filled'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.props.on_recording_finished()
                  }}
                  onMouseEnter={() => set_is_recording_hovered(true)}
                  onMouseLeave={() => set_is_recording_hovered(false)}
                />
              ) : !props.props.value ? (
                <button
                  className={cn(
                    styles['footer__right__submit__button'],
                    styles['footer__right__submit__button--submit'],
                    'codicon',
                    'codicon-mic'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.props.on_recording_started()
                  }}
                  onMouseEnter={() => set_is_recording_hovered(true)}
                  onMouseLeave={() => set_is_recording_hovered(false)}
                />
              ) : (
                <>
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--copy'],
                      'codicon',
                      'codicon-copy'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.props.on_copy()
                    }}
                    title={props.props.translations.copy_prompt}
                  />
                  {disconnected_dropdown_items.length > 0 && (
                    <>
                      <button
                        ref={disconnected_chevron_button_ref}
                        className={styles['footer__right__submit__button']}
                        onClick={() => {
                          props.toggle_dropdown()
                        }}
                        onMouseEnter={() => set_is_more_hovered(true)}
                        onMouseLeave={() => set_is_more_hovered(false)}
                      >
                        <span
                          className={cn(
                            {
                              [styles[
                                'footer__right__submit__button--toggled'
                              ]]: props.is_dropdown_open
                            },
                            'codicon',
                            'codicon-chevron-down'
                          )}
                        />
                      </button>
                      <DropdownMenu
                        anchor_ref={disconnected_chevron_button_ref}
                        is_open={props.is_dropdown_open}
                        items={disconnected_dropdown_items}
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
