import { forwardRef, useEffect, useState } from 'react'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { Dropdown as UiDropdown } from '@ui/components/editor/common/Dropdown'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import {
  CHECKPOINT_DEFAULT_LIFESPAN,
  DEFAULT_CONTEXT_SIZE_WARNING_THRESHOLD
} from '@/constants/values'
import { use_translation } from '../../i18n/use-translation'
import { NavItem } from '../Home'
import { Templates } from '@ui/components/editor/settings/Templates'
import { Template } from '@/views/settings/types/messages'

type ClearChecksBehavior = 'ignore-open-editors' | 'uncheck-all'

type Props = {
  context_size_warning_threshold: number
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
  on_context_size_warning_threshold_change: (
    threshold: number | undefined
  ) => void
  on_clear_checks_in_workspace_behavior_change: (
    value: ClearChecksBehavior
  ) => void
  on_open_editor_settings: () => void
  on_open_ignore_patterns_settings: () => void
  on_open_allow_patterns_settings: () => void
  on_open_keybindings: (search?: string) => void
  set_section_ref: (id: NavItem, el: HTMLDivElement | null) => void
  attach_ascii_tree_of_context: 'ask' | 'always' | 'never'
  on_attach_ascii_tree_of_context_change: (
    value: 'ask' | 'always' | 'never'
  ) => void
  use_context_files_in_commit_message_prompt: 'ask' | 'always' | 'never'
  on_use_context_files_in_commit_message_prompt_change: (
    value: 'ask' | 'always' | 'never'
  ) => void
  select_all_prompts_in_commit_messages_by_default: boolean
  on_select_all_prompts_in_commit_messages_by_default_change: (
    enabled: boolean
  ) => void
  commit_instructions: string
  set_commit_instructions: (instructions: string) => void
  on_commit_instructions_blur: () => void
  default_commit_instructions: string
  on_restore_commit_instructions: () => void
  intelligent_file_search_instructions: string
  set_intelligent_file_search_instructions: (instructions: string) => void
  on_intelligent_file_search_instructions_blur: () => void
  default_intelligent_file_search_instructions: string
  on_restore_intelligent_file_search_instructions: () => void
  on_open_external_url: (url: string) => void
  templates: Record<string, Template[]>
  on_update_templates: (key: string, templates: Template[]) => void
  on_edit_template: (key: string, index: number) => void
  on_add_template: (
    key: string,
    params?: { insertion_index?: number; exact_insertion?: boolean }
  ) => void
  on_delete_template: (key: string, index: number) => void
}

export const GeneralSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { t } = use_translation()
    const [context_size_warning_threshold, set_context_size_warning_threshold] =
      useState<number>()
    const [checkpoint_lifespan, set_checkpoint_lifespan] = useState<number>()

    useEffect(() => {
      set_context_size_warning_threshold(props.context_size_warning_threshold)
    }, [props.context_size_warning_threshold])

    useEffect(() => {
      set_checkpoint_lifespan(props.checkpoint_lifespan)
    }, [props.checkpoint_lifespan])

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

    const handle_checkpoint_lifespan_blur = () => {
      if (checkpoint_lifespan && checkpoint_lifespan > 0) {
        props.on_checkpoint_lifespan_change(checkpoint_lifespan)
      } else {
        props.on_checkpoint_lifespan_change(undefined)
        set_checkpoint_lifespan(CHECKPOINT_DEFAULT_LIFESPAN)
      }
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
              title={t('general.open-links.open-editor-settings.title')}
              description={t(
                'general.open-links.open-editor-settings.description'
              )}
              slot_right={
                <UiTextButton on_click={props.on_open_editor_settings}>
                  {t('general.open-links.open-editor-settings.action')}
                </UiTextButton>
              }
            />
            <UiItem
              title={t('general.open-links.ignore-patterns.title')}
              description={t('general.open-links.ignore-patterns.description')}
              slot_right={
                <UiTextButton on_click={props.on_open_ignore_patterns_settings}>
                  {t('general.open-links.ignore-patterns.action')}
                </UiTextButton>
              }
            />
            <UiItem
              title={t('general.open-links.allow-patterns.title')}
              description={t('general.open-links.allow-patterns.description')}
              slot_right={
                <UiTextButton on_click={props.on_open_allow_patterns_settings}>
                  {t('general.open-links.allow-patterns.action')}
                </UiTextButton>
              }
            />
            <UiItem
              title={t(
                'general.open-links.code-at-cursor.keyboard-shortcut.title'
              )}
              description={t(
                'general.open-links.code-at-cursor.keyboard-shortcut.description'
              )}
              slot_right={
                <UiTextButton
                  on_click={() =>
                    props.on_open_keybindings('codeWebChat.codeAtCursor')
                  }
                >
                  {t(
                    'general.open-links.code-at-cursor.keyboard-shortcut.action'
                  )}
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
              title={t('general.context.check-new-files.title')}
              description={t('general.context.check-new-files.description')}
              slot_right={
                <UiToggler
                  is_on={props.check_new_files}
                  on_toggle={props.on_check_new_files_change}
                />
              }
            />
            <UiItem
              title={t(
                'general.context.clear-checks-in-workspace-behavior.title'
              )}
              description={t(
                'general.context.clear-checks-in-workspace-behavior.description'
              )}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'ignore-open-editors',
                      label: t(
                        'general.context.clear-checks.ignore-open-editors'
                      )
                    },
                    {
                      value: 'uncheck-all',
                      label: t('general.context.clear-checks.uncheck-all')
                    }
                  ]}
                  value={props.clear_checks_in_workspace_behavior}
                  onChange={props.on_clear_checks_in_workspace_behavior_change}
                />
              }
            />
            <UiItem
              title={t(
                'general.context.intelligent-file-search-instructions.title'
              )}
              description={t(
                'general.context.intelligent-file-search-instructions.description'
              )}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={props.intelligent_file_search_instructions}
                min_rows={3}
                on_change={props.set_intelligent_file_search_instructions}
                on_blur={props.on_intelligent_file_search_instructions_blur}
                action_icon={
                  props.intelligent_file_search_instructions !=
                  props.default_intelligent_file_search_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={
                  props.on_restore_intelligent_file_search_instructions
                }
              />
            </UiItem>
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:prompt-field', el)
          }
        >
          <UiGroup title={t('general.prompt-field.title')}>
            <UiItem
              title={t('general.prompt-field.templates.title')}
              description={t('general.prompt-field.templates.description')}
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <Templates
                templates={props.templates}
                on_reorder={(key, templates) =>
                  props.on_update_templates(key, templates)
                }
                on_delete={props.on_delete_template}
                on_edit={props.on_edit_template}
                on_add={props.on_add_template}
                translations={{
                  item_text: t('general.prompt-field.templates.item'),
                  items_text: t('general.prompt-field.templates.items'),
                  items_text_many: t(
                    'general.prompt-field.templates.items-many'
                  ),
                  expand: t('common.expand'),
                  collapse: t('common.collapse'),
                  add_new: t('action.add-new'),
                  types: {
                    templatesForEditFiles: t(
                      'general.prompt-field.templates.types.templatesForEditFiles'
                    ),
                    templatesForAskAboutFiles: t(
                      'general.prompt-field.templates.types.templatesForAskAboutFiles'
                    ),
                    templatesForCodeAtCursor: t(
                      'general.prompt-field.templates.types.templatesForCodeAtCursor'
                    ),
                    templatesForWithoutFiles: t(
                      'general.prompt-field.templates.types.templatesForWithoutFiles'
                    )
                  }
                }}
              />
            </UiItem>
            <UiItem
              title={t(
                'general.prompt-field.context-size-warning-threshold.title'
              )}
              description={t(
                'general.prompt-field.context-size-warning-threshold.description'
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
              title={t('general.prompt-field.send-with-shift-enter.title')}
              description={t(
                'general.prompt-field.send-with-shift-enter.description'
              )}
              slot_right={
                <UiToggler
                  is_on={props.send_with_shift_enter}
                  on_toggle={props.on_send_with_shift_enter_change}
                />
              }
            />
            <UiItem
              title={t('general.prompt-field.synchronize-edit-format.title')}
              description={t(
                'general.prompt-field.synchronize-edit-format.description'
              )}
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
              title={t('general.history.automatic-checkpoints.title')}
              description={t(
                'general.history.automatic-checkpoints.description'
              )}
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
              title={t('general.history.checkpoint-lifespan.title')}
              description={t('general.history.checkpoint-lifespan.description')}
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
                'general.commit-messages.commit-message-instructions.title'
              )}
              description={t(
                'general.commit-messages.commit-message-instructions.description'
              )}
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
            <UiItem
              title={t(
                'general.commit-messages.use-context-files-in-commit-message-prompt.title'
              )}
              description={t(
                'general.commit-messages.use-context-files-in-commit-message-prompt.description'
              )}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'ask',
                      label: t(
                        'general.commit-messages.use-context-files-in-commit-message-prompt.ask'
                      )
                    },
                    {
                      value: 'always',
                      label: t(
                        'general.commit-messages.use-context-files-in-commit-message-prompt.always'
                      )
                    },
                    {
                      value: 'never',
                      label: t(
                        'general.commit-messages.use-context-files-in-commit-message-prompt.never'
                      )
                    }
                  ]}
                  value={props.use_context_files_in_commit_message_prompt}
                  onChange={
                    props.on_use_context_files_in_commit_message_prompt_change
                  }
                />
              }
            />
            <UiItem
              title={t(
                'general.commit-messages.attach-ascii-tree-of-context.title'
              )}
              description={t(
                'general.commit-messages.attach-ascii-tree-of-context.description'
              )}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'ask',
                      label: t(
                        'general.commit-messages.attach-ascii-tree-of-context.ask'
                      )
                    },
                    {
                      value: 'always',
                      label: t(
                        'general.commit-messages.attach-ascii-tree-of-context.always'
                      )
                    },
                    {
                      value: 'never',
                      label: t(
                        'general.commit-messages.attach-ascii-tree-of-context.never'
                      )
                    }
                  ]}
                  value={props.attach_ascii_tree_of_context}
                  onChange={props.on_attach_ascii_tree_of_context_change}
                />
              }
            />
            <UiItem
              title={t(
                'general.commit-messages.select-all-prompts-in-commit-messages-by-default.title'
              )}
              description={t(
                'general.commit-messages.select-all-prompts-in-commit-messages-by-default.description'
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
          </UiGroup>
        </div>
      </UiSection>
    )
  }
)

GeneralSection.displayName = 'GeneralSection'
