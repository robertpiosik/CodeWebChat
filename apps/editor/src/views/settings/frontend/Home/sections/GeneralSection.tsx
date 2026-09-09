import { forwardRef } from 'react'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { Dropdown as UiDropdown } from '@ui/components/editor/common/Dropdown'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { use_translation } from '../../i18n/use-translation'
import { NavItem } from '../Home'
import { Templates } from '@ui/components/editor/settings/Templates'
import { Template } from '@/views/settings/types/messages'

type Props = {
  send_with_shift_enter: boolean
  on_send_with_shift_enter_change: (enabled: boolean) => void
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
            props.set_section_ref('section:general:group:prompt', el)
          }
        >
          <UiGroup title={t('general.prompt.title')}>
            <UiItem
              title={t('general.prompt.templates.title')}
              description={t('general.prompt.templates.description')}
            >
              <Templates
                templates={[
                  {
                    key: 'templatesForEditFiles',
                    label: 'Edit',
                    icon: 'edit-sparkle',
                    accent_color: 'blue',
                    items: props.templates.templatesForEditFiles || []
                  },
                  {
                    key: 'templatesForAskAboutFiles',
                    label: 'Ask',
                    icon: 'chat-sparkle',
                    accent_color: 'purple',
                    items: props.templates.templatesForAskAboutFiles || []
                  }
                ]}
                on_reorder={(key, templates) =>
                  props.on_update_templates(key, templates)
                }
                on_delete={props.on_delete_template}
                on_edit={props.on_edit_template}
                on_add={props.on_add_template}
                translations={{
                  item_text: t('general.prompt.templates.item'),
                  items_text: t('general.prompt.templates.items'),
                  items_text_many: t('general.prompt.templates.items-many'),
                  expand: t('common.expand'),
                  collapse: t('common.collapse'),
                  add_new: t('action.add-new')
                }}
              />
            </UiItem>
            <UiItem
              title={t('general.prompt.send-with-shift-enter.title')}
              description={t(
                'general.prompt.send-with-shift-enter.description'
              )}
              slot_right={
                <UiToggler
                  is_on={props.send_with_shift_enter}
                  on_toggle={props.on_send_with_shift_enter_change}
                />
              }
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:commits', el)
          }
        >
          <UiGroup title={t('general.commits.title')}>
            <UiItem
              title={t('general.commits.commit-message-instructions.title')}
              description={t(
                'general.commits.commit-message-instructions.description'
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
                'general.commits.use-context-files-in-commit-message-prompt.title'
              )}
              description={t(
                'general.commits.use-context-files-in-commit-message-prompt.description'
              )}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'ask',
                      label: t(
                        'general.commits.use-context-files-in-commit-message-prompt.ask'
                      )
                    },
                    {
                      value: 'always',
                      label: t(
                        'general.commits.use-context-files-in-commit-message-prompt.always'
                      )
                    },
                    {
                      value: 'never',
                      label: t(
                        'general.commits.use-context-files-in-commit-message-prompt.never'
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
              title={t('general.commits.attach-ascii-tree-of-context.title')}
              description={t(
                'general.commits.attach-ascii-tree-of-context.description'
              )}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'ask',
                      label: t(
                        'general.commits.attach-ascii-tree-of-context.ask'
                      )
                    },
                    {
                      value: 'always',
                      label: t(
                        'general.commits.attach-ascii-tree-of-context.always'
                      )
                    },
                    {
                      value: 'never',
                      label: t(
                        'general.commits.attach-ascii-tree-of-context.never'
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
                'general.commits.select-all-prompts-in-commit-messages-by-default.title'
              )}
              description={t(
                'general.commits.select-all-prompts-in-commit-messages-by-default.description'
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
