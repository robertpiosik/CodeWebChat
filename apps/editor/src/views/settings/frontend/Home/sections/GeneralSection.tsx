import { forwardRef } from 'react'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { Dropdown as UiDropdown } from '@ui/components/editor/common/Dropdown'
import { Item as UiItem } from '@ui/components/editor/settings-view/Item'
import { Group as UiGroup } from '@ui/components/editor/settings-view/Group/Group'
import { Section as UiSection } from '@ui/components/editor/settings-view/Section'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { Notices as UiNotices } from '@ui/components/editor/settings-view/Notices'
import { Translation, use_translation } from '../../i18n/use-translation'
import { NavItem } from '../Home'
import {
  PromptInstruction,
  PromptInstructionKey
} from '@/views/settings/types/messages'
import { TemplatesForm } from '../../forms/TemplatesForm'
import { SnippetsForm } from '../../forms/SnippetsForm'

type Props = {
  send_with_shift_enter: boolean
  on_send_with_shift_enter_change: (enabled: boolean) => void
  on_open_editor_settings: () => void
  on_open_ignore_patterns_settings: () => void
  on_open_allow_patterns_settings: () => void
  on_open_keybindings: (search?: string) => void
  update_check_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  on_update_check_frequency_change: (
    value: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ) => void
  minimum_release_age: number
  on_minimum_release_age_change: (value: number) => void
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
  default_option_for_voice_input: 'ask' | 'send-request' | 'invoke-agent'
  on_default_option_for_voice_input_change: (
    value: 'ask' | 'send-request' | 'invoke-agent'
  ) => void
  voice_instructions: string
  set_voice_instructions: (instructions: string) => void
  on_voice_instructions_blur: () => void
  default_voice_instructions: string
  on_restore_voice_instructions: () => void
  agentic_search_instructions: string
  set_agentic_search_instructions: (instructions: string) => void
  on_agentic_search_instructions_blur: () => void
  default_agentic_search_instructions: string
  on_restore_agentic_search_instructions: () => void
  agentic_search_invocation_count: 1 | 2 | 3
  on_agentic_search_invocation_count_change: (count: 1 | 2 | 3) => void
  commit_instructions: string
  set_commit_instructions: (instructions: string) => void
  on_commit_instructions_blur: () => void
  default_commit_instructions: string
  on_restore_commit_instructions: () => void
  prompt_instructions: Partial<
    Record<PromptInstructionKey, PromptInstruction[]>
  >
  on_update_prompt_instructions: (
    key: PromptInstructionKey,
    instructions: PromptInstruction[]
  ) => void
  on_edit_prompt_instruction: (key: PromptInstructionKey, index: number) => void
  on_add_prompt_instruction: (
    key: PromptInstructionKey,
    params?: { insertion_index?: number; exact_insertion?: boolean }
  ) => void
  on_delete_prompt_instruction: (
    key: PromptInstructionKey,
    index: number
  ) => void
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
            props.set_section_ref('section:general:group:updates', el)
          }
        >
          <UiGroup
            title={t('general.updates.title')}
            notice_slot={
              <UiNotices
                notices={[
                  {
                    type: 'info',
                    message: (
                      <Translation
                        id="general.updates.notice"
                        components={{
                          link: (
                            <a href="https://docs.github.com/en/enterprise-server@3.20/rest/repos/repos?apiVersion=2022-11-28#list-repository-tags">
                              GitHub REST API
                            </a>
                          )
                        }}
                      />
                    )
                  }
                ]}
              />
            }
          >
            <UiItem
              title={t('general.updates.check-frequency.title')}
              description={t('general.updates.check-frequency.description')}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'hourly',
                      label: t('general.updates.frequency.hourly')
                    },
                    {
                      value: 'daily',
                      label: t('general.updates.frequency.daily')
                    },
                    {
                      value: 'weekly',
                      label: t('general.updates.frequency.weekly')
                    },
                    {
                      value: 'monthly',
                      label: t('general.updates.frequency.monthly')
                    }
                  ]}
                  value={props.update_check_frequency}
                  onChange={(val) =>
                    props.on_update_check_frequency_change(val as any)
                  }
                />
              }
            />
            <UiItem
              title={t('general.updates.minimum-release-age.title')}
              description={t('general.updates.minimum-release-age.description')}
              slot_right={
                <UiInput
                  value={props.minimum_release_age}
                  type="number"
                  min={0}
                  on_change={(val) => {
                    if (val === '') {
                      props.on_minimum_release_age_change(0)
                    } else {
                      const num = parseInt(val, 10)
                      if (!isNaN(num)) {
                        props.on_minimum_release_age_change(num)
                      }
                    }
                  }}
                  width={60}
                />
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
              <TemplatesForm
                prompt_instructions={props.prompt_instructions}
                on_reorder={props.on_update_prompt_instructions}
                on_delete={props.on_delete_prompt_instruction}
                on_edit={props.on_edit_prompt_instruction}
                on_add={props.on_add_prompt_instruction}
              />
            </UiItem>
            <UiItem
              title={t('general.prompt.snippets.title')}
              description={t('general.prompt.snippets.description')}
            >
              <SnippetsForm
                prompt_instructions={props.prompt_instructions}
                on_reorder={props.on_update_prompt_instructions}
                on_delete={props.on_delete_prompt_instruction}
                on_edit={props.on_edit_prompt_instruction}
                on_add={props.on_add_prompt_instruction}
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
              title={t('common.instructions')}
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
                      label: t('common.ask')
                    },
                    {
                      value: 'always',
                      label: t('common.always')
                    },
                    {
                      value: 'never',
                      label: t('common.never')
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
                      label: t('common.ask')
                    },
                    {
                      value: 'always',
                      label: t('common.always')
                    },
                    {
                      value: 'never',
                      label: t('common.never')
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

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:voice-input', el)
          }
        >
          <UiGroup title={t('general.voice-input.title')}>
            <UiItem
              title={t('common.instructions')}
              description={t('general.voice-input.instructions.description')}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={props.voice_instructions}
                min_rows={3}
                on_change={props.set_voice_instructions}
                on_blur={props.on_voice_instructions_blur}
                action_icon={
                  props.voice_instructions !== props.default_voice_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={props.on_restore_voice_instructions}
              />
            </UiItem>
            <UiItem
              title={t('general.voice-input.default-option.title')}
              description={t('general.voice-input.default-action.description')}
              slot_right={
                <UiDropdown
                  options={[
                    {
                      value: 'ask',
                      label: t('common.ask')
                    },
                    {
                      value: 'send-request',
                      label: t(
                        'general.voice-input.default-action.send-request'
                      )
                    },
                    {
                      value: 'invoke-agent',
                      label: t(
                        'general.voice-input.default-action.invoke-agent'
                      )
                    }
                  ]}
                  value={props.default_option_for_voice_input}
                  onChange={props.on_default_option_for_voice_input_change}
                />
              }
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:general:group:agentic-search', el)
          }
        >
          <UiGroup title={t('general.agentic-search.title')}>
            <UiItem
              title={t('common.instructions')}
              description={t('general.agentic-search.instructions.description')}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={props.agentic_search_instructions}
                min_rows={3}
                on_change={props.set_agentic_search_instructions}
                on_blur={props.on_agentic_search_instructions_blur}
                action_icon={
                  props.agentic_search_instructions !=
                  props.default_agentic_search_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={props.on_restore_agentic_search_instructions}
              />
            </UiItem>
            <UiItem
              title={t('general.agentic-search.invocation-count.title')}
              description={t(
                'general.agentic-search.invocation-count.description'
              )}
              slot_right={
                <UiDropdown
                  options={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' }
                  ]}
                  value={props.agentic_search_invocation_count.toString()}
                  onChange={(val) =>
                    props.on_agentic_search_invocation_count_change(
                      parseInt(val, 10) as 1 | 2 | 3
                    )
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
