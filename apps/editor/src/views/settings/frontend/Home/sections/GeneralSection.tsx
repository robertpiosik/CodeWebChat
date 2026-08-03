import { forwardRef, useEffect, useState } from 'react'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { Dropdown as UiDropdown } from '@ui/components/editor/common/Dropdown'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { EditFormatInstructions } from '@/views/settings/types/messages'
import {
  CHECKPOINT_DEFAULT_LIFESPAN,
  DEFAULT_CONTEXT_SIZE_WARNING_THRESHOLD,
  LIMIT_SEMANTIC_SEARCH_RESULTS
} from '@/constants/values'
import {
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'
import { use_translation } from '../../i18n/use-translation'
import { NavItem } from '../Home'

type ClearChecksBehavior = 'ignore-open-editors' | 'uncheck-all'

type Props = {
  context_size_warning_threshold: number
  limit_semantic_search_results: number
  are_automatic_checkpoints_disabled: boolean
  synchronize_edit_format_between_modes: boolean
  send_with_shift_enter: boolean
  check_new_files: boolean
  checkpoint_lifespan: number
  on_synchronize_edit_format_between_modes_change: (enabled: boolean) => void
  on_automatic_checkpoints_toggle: (disabled: boolean) => void
  on_send_with_shift_enter_change: (enabled: boolean) => void
  on_check_new_files_change: (enabled: boolean) => void
  on_checkpoint_lifespan_change: (hours: number | undefined) => void
  clear_checks_in_workspace_behavior: ClearChecksBehavior
  edit_format_instructions: EditFormatInstructions
  on_context_size_warning_threshold_change: (
    threshold: number | undefined
  ) => void
  on_limit_semantic_search_results_change: (limit: number | undefined) => void
  on_clear_checks_in_workspace_behavior_change: (
    value: ClearChecksBehavior
  ) => void
  copy_paths_format: 'bullet-list' | 'comma-separated' | 'ascii-tree'
  on_copy_paths_format_change: (
    value: 'bullet-list' | 'comma-separated' | 'ascii-tree'
  ) => void
  on_edit_format_instructions_change: (
    instructions: EditFormatInstructions
  ) => void
  on_open_editor_settings: () => void
  on_open_ignore_patterns_settings: () => void
  on_open_allow_patterns_settings: () => void
  on_open_keybindings: (search?: string) => void
  set_section_ref: (id: NavItem, el: HTMLDivElement | null) => void
  select_all_prompts_in_commit_messages_by_default: boolean
  on_select_all_prompts_in_commit_messages_by_default_change: (
    enabled: boolean
  ) => void
  commit_instructions: string
  set_commit_instructions: (instructions: string) => void
  on_commit_instructions_blur: () => void
  default_commit_instructions: string
  on_restore_commit_instructions: () => void
  find_relevant_instructions: string
  set_find_relevant_instructions: (instructions: string) => void
  on_find_relevant_instructions_blur: () => void
  default_find_relevant_instructions: string
  on_restore_find_relevant_instructions: () => void
  on_open_external_url: (url: string) => void
}

export const GeneralSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { t } = use_translation()
    const [context_size_warning_threshold, set_context_size_warning_threshold] =
      useState<number>()
    const [limit_semantic_search_results, set_limit_semantic_search_results] =
      useState<number>()
    const [checkpoint_lifespan, set_checkpoint_lifespan] = useState<number>()
    const [instructions, set_instructions] = useState<EditFormatInstructions>({
      whole: '',
      truncated: '',
      search_replace: '',
      diff: ''
    })

    useEffect(() => {
      set_context_size_warning_threshold(props.context_size_warning_threshold)
    }, [props.context_size_warning_threshold])

    useEffect(() => {
      set_limit_semantic_search_results(props.limit_semantic_search_results)
    }, [props.limit_semantic_search_results])

    useEffect(() => {
      set_checkpoint_lifespan(props.checkpoint_lifespan)
    }, [props.checkpoint_lifespan])

    useEffect(() => {
      if (props.edit_format_instructions) {
        set_instructions(props.edit_format_instructions)
      }
    }, [props.edit_format_instructions])

    const handle_context_size_warning_threshold_blur = () => {
      if (
        context_size_warning_threshold &&
        context_size_warning_threshold > 0
      ) {
        props.on_context_size_warning_threshold_change(
          context_size_warning_threshold
        )
      } else {
        props.on_context_size_warning_threshold_change(undefined)
        set_context_size_warning_threshold(
          DEFAULT_CONTEXT_SIZE_WARNING_THRESHOLD
        )
      }
    }

    const handle_limit_semantic_search_results_blur = () => {
      if (limit_semantic_search_results && limit_semantic_search_results > 0) {
        props.on_limit_semantic_search_results_change(
          limit_semantic_search_results
        )
      } else {
        props.on_limit_semantic_search_results_change(undefined)
        set_limit_semantic_search_results(LIMIT_SEMANTIC_SEARCH_RESULTS)
      }
    }

    const handle_checkpoint_lifespan_blur = () => {
      if (checkpoint_lifespan && checkpoint_lifespan > 0) {
        props.on_checkpoint_lifespan_change(checkpoint_lifespan)
      } else {
        props.on_checkpoint_lifespan_change(undefined)
        set_checkpoint_lifespan(CHECKPOINT_DEFAULT_LIFESPAN)
      }
    }

    const handle_instructions_blur = () => {
      props.on_edit_format_instructions_change(instructions)

      set_instructions((prev) => ({
        whole:
          prev.whole == '' &&
          props.edit_format_instructions.whole == EDIT_FORMAT_INSTRUCTIONS_WHOLE
            ? EDIT_FORMAT_INSTRUCTIONS_WHOLE
            : prev.whole,
        truncated:
          prev.truncated == '' &&
          props.edit_format_instructions.truncated ==
            EDIT_FORMAT_INSTRUCTIONS_TRUNCATED
            ? EDIT_FORMAT_INSTRUCTIONS_TRUNCATED
            : prev.truncated,
        search_replace:
          prev.search_replace == '' &&
          props.edit_format_instructions.search_replace ==
            EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
            ? EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
            : prev.search_replace,
        diff:
          prev.diff == '' &&
          props.edit_format_instructions.diff == EDIT_FORMAT_INSTRUCTIONS_DIFF
            ? EDIT_FORMAT_INSTRUCTIONS_DIFF
            : prev.diff
      }))
    }

    const handle_reset_instruction = (
      key: keyof EditFormatInstructions,
      default_value: string
    ) => {
      const new_instructions = { ...instructions, [key]: default_value }
      set_instructions(new_instructions)
      props.on_edit_format_instructions_change(new_instructions)
    }

    return (
      <UiSection
        ref={ref}
        title={t('sections.general')}
        subtitle={t('general.subtitle')}
      >
        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:open-links', el)
          }
        >
          <UiGroup title={t('general.open-links.title')}>
            <UiItem
              title={t('general.open-editor-settings.title')}
              description={t('general.open-editor-settings.description')}
              slot_right={
                <UiTextButton on_click={props.on_open_editor_settings}>
                  {t('general.open-editor-settings.action')}
                </UiTextButton>
              }
            />
            <UiItem
              title={t('general.ignore-patterns.title')}
              description={t('general.ignore-patterns.description')}
              slot_right={
                <UiTextButton on_click={props.on_open_ignore_patterns_settings}>
                  {t('general.ignore-patterns.action')}
                </UiTextButton>
              }
            />
            <UiItem
              title={t('general.allow-patterns.title')}
              description={t('general.allow-patterns.description')}
              slot_right={
                <UiTextButton on_click={props.on_open_allow_patterns_settings}>
                  {t('general.allow-patterns.action')}
                </UiTextButton>
              }
            />
            <UiItem
              title={t('general.code-at-cursor.keyboard-shortcut.title')}
              description={t(
                'general.code-at-cursor.keyboard-shortcut.description'
              )}
              slot_right={
                <UiTextButton
                  on_click={() =>
                    props.on_open_keybindings('codeWebChat.codeAtCursor')
                  }
                >
                  {t('general.code-at-cursor.keyboard-shortcut.action')}
                </UiTextButton>
              }
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:context', el)
          }
        >
          <UiGroup title={t('general.context.title')}>
            <UiItem
              title={t('general.check-new-files.title')}
              description={t('general.check-new-files.description')}
              slot_right={
                <UiToggler
                  is_on={props.check_new_files}
                  on_toggle={props.on_check_new_files_change}
                />
              }
            />
            <UiItem
              title={t('general.clear-checks-in-workspace-behavior.title')}
              description={t(
                'general.clear-checks-in-workspace-behavior.description'
              )}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'ignore-open-editors',
                      label: t('general.clear-checks.ignore-open-editors')
                    },
                    {
                      value: 'uncheck-all',
                      label: t('general.clear-checks.uncheck-all')
                    }
                  ]}
                  value={props.clear_checks_in_workspace_behavior}
                  onChange={props.on_clear_checks_in_workspace_behavior_change}
                />
              }
            />
            <UiItem
              title={t('general.copy-paths-format.title')}
              description={t('general.copy-paths-format.description')}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'bullet-list',
                      label: t('general.copy-paths-format.bullet-list')
                    },
                    {
                      value: 'comma-separated',
                      label: t('general.copy-paths-format.comma-separated')
                    },
                    {
                      value: 'ascii-tree',
                      label: t('general.copy-paths-format.ascii-tree')
                    }
                  ]}
                  value={props.copy_paths_format}
                  onChange={props.on_copy_paths_format_change}
                />
              }
            />
            <UiItem
              title={t('general.find-relevant-files-instructions.title')}
              description={t(
                'general.find-relevant-files-instructions.description'
              )}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={props.find_relevant_instructions}
                min_rows={3}
                on_change={props.set_find_relevant_instructions}
                on_blur={props.on_find_relevant_instructions_blur}
                action_icon={
                  props.find_relevant_instructions !=
                  props.default_find_relevant_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={props.on_restore_find_relevant_instructions}
              />
            </UiItem>
            <UiItem
              title={t('general.limit-semantic-search-results.title')}
              description={
                <>
                  {t('general.limit-semantic-search-results.description')}{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      props.on_open_external_url(
                        'https://github.com/MinishLab/semble#cli'
                      )
                    }}
                  >
                    {t('general.limit-semantic-search-results.learn-more')}
                  </a>
                </>
              }
              slot_right={
                <UiInput
                  type="number"
                  value={limit_semantic_search_results?.toString() ?? ''}
                  on_change={(val) =>
                    set_limit_semantic_search_results(
                      val == '' ? undefined : parseInt(val, 10)
                    )
                  }
                  on_blur={handle_limit_semantic_search_results_blur}
                  max_width={100}
                />
              }
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:prompt-field', el)
          }
        >
          <UiGroup title={t('general.prompt-field.title')}>
            <UiItem
              title={t('general.context-size-warning-threshold.title')}
              description={t(
                'general.context-size-warning-threshold.description'
              )}
              slot_right={
                <UiInput
                  type="number"
                  value={context_size_warning_threshold?.toString() ?? ''}
                  on_change={(val) =>
                    set_context_size_warning_threshold(
                      val == '' ? undefined : parseInt(val, 10)
                    )
                  }
                  on_blur={handle_context_size_warning_threshold_blur}
                  max_width={100}
                />
              }
            />
            <UiItem
              title={t('general.send-with-shift-enter.title')}
              description={t('general.send-with-shift-enter.description')}
              slot_right={
                <UiToggler
                  is_on={props.send_with_shift_enter}
                  on_toggle={props.on_send_with_shift_enter_change}
                />
              }
            />
            <UiItem
              title={t('general.synchronize-edit-format.title')}
              description={t('general.synchronize-edit-format.description')}
              slot_right={
                <UiToggler
                  is_on={props.synchronize_edit_format_between_modes}
                  on_toggle={
                    props.on_synchronize_edit_format_between_modes_change
                  }
                />
              }
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:history', el)
          }
        >
          <UiGroup title={t('general.history.title')}>
            <UiItem
              title={t('general.automatic-checkpoints.title')}
              description={t('general.automatic-checkpoints.description')}
              slot_right={
                <UiToggler
                  is_on={!props.are_automatic_checkpoints_disabled}
                  on_toggle={(is_on) =>
                    props.on_automatic_checkpoints_toggle(!is_on)
                  }
                />
              }
            />
            <UiItem
              title={t('general.checkpoint-lifespan.title')}
              description={t('general.checkpoint-lifespan.description')}
              slot_right={
                <UiInput
                  type="number"
                  value={checkpoint_lifespan?.toString() || ''}
                  on_change={(val) =>
                    set_checkpoint_lifespan(
                      val == '' ? undefined : parseInt(val, 10)
                    )
                  }
                  on_blur={handle_checkpoint_lifespan_blur}
                  max_width={100}
                />
              }
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:commit-messages', el)
          }
        >
          <UiGroup title={t('general.commit-messages.title')}>
            <UiItem
              title={t(
                'general.select-all-prompts-in-commit-messages-by-default.title'
              )}
              description={t(
                'general.select-all-prompts-in-commit-messages-by-default.description'
              )}
              slot_right={
                <UiToggler
                  is_on={props.select_all_prompts_in_commit_messages_by_default}
                  on_toggle={
                    props.on_select_all_prompts_in_commit_messages_by_default_change
                  }
                />
              }
            />
            <UiItem
              title={t('general.commit-message-instructions.title')}
              description={t('general.commit-message-instructions.description')}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={props.commit_instructions}
                min_rows={3}
                on_change={props.set_commit_instructions}
                on_blur={props.on_commit_instructions_blur}
                action_icon={
                  props.commit_instructions !==
                  props.default_commit_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={props.on_restore_commit_instructions}
              />
            </UiItem>
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:edit-format', el)
          }
        >
          <UiGroup title={t('general.edit-formats.title')}>
            <UiItem
              title={t('general.edit-format.whole.title')}
              description={t('general.edit-format.whole.description')}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={instructions.whole}
                min_rows={3}
                on_change={(value) =>
                  set_instructions((prev) => ({ ...prev, whole: value }))
                }
                on_blur={handle_instructions_blur}
                action_icon={
                  instructions.whole != '' &&
                  instructions.whole != EDIT_FORMAT_INSTRUCTIONS_WHOLE
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={() =>
                  handle_reset_instruction(
                    'whole',
                    EDIT_FORMAT_INSTRUCTIONS_WHOLE
                  )
                }
              />
            </UiItem>

            <UiItem
              title={t('general.edit-format.truncated.title')}
              description={t('general.edit-format.truncated.description')}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={instructions.truncated}
                min_rows={3}
                on_change={(value) =>
                  set_instructions((prev) => ({
                    ...prev,
                    truncated: value
                  }))
                }
                on_blur={handle_instructions_blur}
                action_icon={
                  instructions.truncated != '' &&
                  instructions.truncated != EDIT_FORMAT_INSTRUCTIONS_TRUNCATED
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={() =>
                  handle_reset_instruction(
                    'truncated',
                    EDIT_FORMAT_INSTRUCTIONS_TRUNCATED
                  )
                }
              />
            </UiItem>

            <UiItem
              title={t('general.edit-format.search-replace.title')}
              description={t('general.edit-format.search-replace.description')}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={instructions.search_replace}
                min_rows={3}
                on_change={(value) =>
                  set_instructions((prev) => ({
                    ...prev,
                    search_replace: value
                  }))
                }
                on_blur={handle_instructions_blur}
                action_icon={
                  instructions.search_replace != '' &&
                  instructions.search_replace !=
                    EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={() =>
                  handle_reset_instruction(
                    'search_replace',
                    EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
                  )
                }
              />
            </UiItem>

            <UiItem
              title={t('general.edit-format.diff.title')}
              description={t('general.edit-format.diff.description')}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={instructions.diff}
                min_rows={3}
                on_change={(value) =>
                  set_instructions((prev) => ({ ...prev, diff: value }))
                }
                on_blur={handle_instructions_blur}
                action_icon={
                  instructions.diff != '' &&
                  instructions.diff != EDIT_FORMAT_INSTRUCTIONS_DIFF
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={() =>
                  handle_reset_instruction(
                    'diff',
                    EDIT_FORMAT_INSTRUCTIONS_DIFF
                  )
                }
              />
            </UiItem>
          </UiGroup>
        </div>
      </UiSection>
    )
  }
)

GeneralSection.displayName = 'GeneralSection'
