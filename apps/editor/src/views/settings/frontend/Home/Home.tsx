import { useState, useRef, useEffect, useCallback } from 'react'
import { Layout as UiLayout } from '@ui/components/editor/settings/Layout'
import { NavigationItem as UiNavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ModelProvidersSection } from './sections/ModelProvidersSection'
import { NavigationDivider as UiNavigationDivider } from '@ui/components/editor/settings/NavigationDivider'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { ApiToolConfigurationSection } from './sections/ApiToolConfigurationSection'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { Button as UiButton } from '@ui/components/editor/common/Button'
import { TextButton as UiTextButton } from '@ui/components/editor/settings/TextButton'
import { Notice as UiNotice } from '@ui/components/editor/settings/Notice'
import {
  ConfigurationForClient,
  ProviderForClient,
  EditFormatInstructions
} from '@/views/settings/types/messages'
import { GeneralSection } from './sections/GeneralSection'
import {
  Translation,
  use_translation,
  TranslationKey
} from '../i18n/use-translation'
import {
  commit_message_instructions as default_commit_message_instructions,
  voice_input_instructions as default_voice_input_instructions
} from '@/constants/instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'

type NavItem =
  | 'general'
  | 'model-providers'
  | 'intelligent-update'
  | 'edit-context'
  | 'code-at-cursor'
  | 'prune-context'
  | 'commit-messages'
  | 'voice-input'

type NavConfigItem =
  | { type: 'item'; id: NavItem; label: TranslationKey }
  | { type: 'divider'; text?: TranslationKey }

const NAV_ITEMS_CONFIG: NavConfigItem[] = [
  {
    type: 'item',
    id: 'general',
    label: 'sidebar.general'
  },
  {
    type: 'item',
    id: 'model-providers',
    label: 'sidebar.model-providers'
  },
  { type: 'divider', text: 'sidebar.api-tools' },
  {
    type: 'item',
    id: 'intelligent-update',
    label: 'sidebar.intelligent-update'
  },
  { type: 'item', id: 'edit-context', label: 'sidebar.edit-context' },
  {
    type: 'item',
    id: 'code-at-cursor',
    label: 'sidebar.code-at-cursor'
  },
  {
    type: 'item',
    id: 'prune-context',
    label: 'sidebar.prune-context'
  },
  {
    type: 'item',
    id: 'commit-messages',
    label: 'sidebar.commit-messages'
  },
  {
    type: 'item',
    id: 'voice-input',
    label: 'sidebar.voice-input'
  }
]

type Props = {
  providers: ProviderForClient[]
  code_at_cursor_configs: ConfigurationForClient[]
  commit_messages_configs: ConfigurationForClient[]
  edit_context_configs: ConfigurationForClient[]
  voice_input_configs: ConfigurationForClient[]
  edit_context_system_instructions: string
  intelligent_update_configs: ConfigurationForClient[]
  prune_context_configs: ConfigurationForClient[]
  voice_input_instructions: string
  commit_message_instructions: string
  include_prompts_in_commit_messages: boolean
  context_size_warning_threshold: number
  gemini_user_id: number | null
  ai_studio_user_id: number | null
  send_with_shift_enter: boolean
  check_new_files: boolean
  are_automatic_checkpoints_disabled: boolean
  checkpoint_lifespan: number
  edit_format_instructions: EditFormatInstructions
  clear_checks_in_workspace_behavior: 'ignore-open-editors' | 'uncheck-all'
  fix_all_automatically: boolean
  set_providers: (providers: ProviderForClient[]) => void
  set_edit_context_configs: (configs: ConfigurationForClient[]) => void
  set_code_at_cursor_configs: (configs: ConfigurationForClient[]) => void
  set_intelligent_update_configs: (configs: ConfigurationForClient[]) => void
  set_voice_input_configs: (configs: ConfigurationForClient[]) => void
  set_prune_context_configs: (configs: ConfigurationForClient[]) => void
  set_commit_messages_configs: (configs: ConfigurationForClient[]) => void
  on_context_size_warning_threshold_change: (
    threshold: number | undefined
  ) => void
  on_commit_instructions_change: (instructions: string) => void
  on_include_prompts_in_commit_messages_change: (enabled: boolean) => void
  on_edit_format_instructions_change: (
    instructions: EditFormatInstructions
  ) => void
  on_edit_context_system_instructions_change: (instructions: string) => void
  on_voice_input_instructions_change: (instructions: string) => void
  on_automatic_checkpoints_toggle: (disabled: boolean) => void
  on_checkpoint_lifespan_change: (hours: number | undefined) => void
  on_gemini_user_id_change: (id: number | null) => void
  on_ai_studio_user_id_change: (id: number | null) => void
  on_send_with_shift_enter_change: (enabled: boolean) => void
  on_check_new_files_change: (enabled: boolean) => void
  on_clear_checks_in_workspace_behavior_change: (
    value: 'ignore-open-editors' | 'uncheck-all'
  ) => void
  on_fix_all_automatically_change: (enabled: boolean) => void
  on_open_keybindings: (search?: string) => void
  on_open_editor_settings: () => void
  on_open_ignore_patterns_settings: () => void
  on_open_allow_patterns_settings: () => void
  on_add_provider: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
  on_delete_provider: (provider_name: string) => void
  on_edit_provider: (provider_name: string) => void
  on_change_api_key: (provider_name: string) => void
  on_reorder_providers: (reordered_providers: ProviderForClient[]) => void
  on_add_config: (
    tool_name: string,
    params?: { insertion_index?: number; create_on_top?: boolean }
  ) => void
  on_reorder_configs: (
    tool_name: string,
    reordered: ConfigurationForClient[]
  ) => void
  on_edit_config: (tool_name: string, configuration_id: string) => void
  on_duplicate_config: (tool_name: string, configuration_id: string) => void
  on_delete_config: (tool_name: string, configuration_id: string) => void
  on_set_default_config: (tool_name: string, configuration_id: string) => void
  on_unset_default_config: (tool_name: string) => void
  on_open_external_url: (url: string) => void
  scroll_to_section_on_load?: NavItem
}

export const Home: React.FC<Props> = (props) => {
  const { t } = use_translation()

  const scroll_container_ref = useRef<HTMLDivElement>(null)
  const section_refs = useRef<Record<NavItem, HTMLDivElement | null>>({
    general: null,
    'model-providers': null,
    'intelligent-update': null,
    'edit-context': null,
    'code-at-cursor': null,
    'prune-context': null,
    'commit-messages': null,
    'voice-input': null
  })
  const [commit_instructions, set_commit_instructions] = useState('')
  const [voice_input_instructions, set_voice_input_instructions] = useState('')
  const [edit_context_instructions, set_edit_context_instructions] =
    useState('')
  const [stuck_sections, set_stuck_sections] = useState(new Set<NavItem>())

  const handle_stuck_change = useCallback((id: NavItem, is_stuck: boolean) => {
    set_stuck_sections((prev) => {
      const is_currently_stuck = prev.has(id)
      if (is_stuck === is_currently_stuck) {
        return prev
      }
      const next = new Set(prev)
      if (is_stuck) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const general_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('general', is_stuck),
    [handle_stuck_change]
  )
  const model_providers_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('model-providers', is_stuck),
    [handle_stuck_change]
  )
  const edit_context_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('edit-context', is_stuck),
    [handle_stuck_change]
  )
  const code_at_cursor_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('code-at-cursor', is_stuck),
    [handle_stuck_change]
  )
  const intelligent_update_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('intelligent-update', is_stuck),
    [handle_stuck_change]
  )
  const voice_input_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('voice-input', is_stuck),
    [handle_stuck_change]
  )
  const prune_context_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('prune-context', is_stuck),
    [handle_stuck_change]
  )
  const commit_messages_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('commit-messages', is_stuck),
    [handle_stuck_change]
  )

  const get_has_warning = (id: NavItem): boolean => {
    if (id == 'model-providers') {
      return props.providers.length == 0
    } else if (id == 'edit-context') {
      return props.edit_context_configs.length == 0
    } else if (id == 'intelligent-update') {
      return props.intelligent_update_configs.length == 0
    } else if (id == 'prune-context') {
      return props.prune_context_configs.length == 0
    } else if (id == 'code-at-cursor') {
      return props.code_at_cursor_configs.length == 0
    } else if (id == 'voice-input') {
      return props.voice_input_configs.length == 0
    } else if (id == 'commit-messages') {
      return props.commit_messages_configs.length == 0
    } else {
      return false
    }
  }

  const nav_item_ids = NAV_ITEMS_CONFIG.filter(
    (item): item is Extract<NavConfigItem, { type: 'item' }> =>
      item.type == 'item'
  ).map((item) => item.id)
  const active_nav_item_id =
    nav_item_ids.filter((id) => stuck_sections.has(id)).pop() || nav_item_ids[0]

  useEffect(() => {
    set_commit_instructions(props.commit_message_instructions || '')
  }, [props.commit_message_instructions])

  useEffect(() => {
    set_voice_input_instructions(props.voice_input_instructions || '')
  }, [props.voice_input_instructions])

  useEffect(() => {
    set_edit_context_instructions(props.edit_context_system_instructions || '')
  }, [props.edit_context_system_instructions])

  const handle_scroll_to_section = (item_id: NavItem) => {
    const section = section_refs.current[item_id]
    const scroll_container = scroll_container_ref.current

    if (section && scroll_container) {
      const container_rect = scroll_container.getBoundingClientRect()
      const section_rect = section.getBoundingClientRect()

      const offset = section_rect.top - container_rect.top
      const target_scroll_top = scroll_container.scrollTop + offset

      scroll_container.scrollTo({
        top: target_scroll_top,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    if (props.scroll_to_section_on_load) {
      handle_scroll_to_section(props.scroll_to_section_on_load)
    }
  }, [props.scroll_to_section_on_load])

  const handle_nav_click = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item_id: NavItem
  ) => {
    e.preventDefault()
    handle_scroll_to_section(item_id)
  }

  return (
    <div style={{ height: '100vh' }}>
      <UiLayout
        ref={scroll_container_ref}
        title={t('sidebar.settings')}
        sidebar={NAV_ITEMS_CONFIG.map((item, i) => {
          if (item.type == 'divider') {
            return (
              <UiNavigationDivider
                key={i}
                text={item.text ? t(item.text) : undefined}
              />
            )
          }

          return (
            <UiNavigationItem
              key={i}
              href={`#${item.id}`}
              label={t(item.label)}
              is_active={item.id === active_nav_item_id}
              has_warning={get_has_warning(item.id)}
              on_click={(e) => handle_nav_click(e, item.id)}
            />
          )
        })}
      >
        <GeneralSection
          ref={(el) => (section_refs.current['general'] = el)}
          context_size_warning_threshold={props.context_size_warning_threshold}
          on_context_size_warning_threshold_change={
            props.on_context_size_warning_threshold_change
          }
          send_with_shift_enter={props.send_with_shift_enter}
          on_send_with_shift_enter_change={
            props.on_send_with_shift_enter_change
          }
          check_new_files={props.check_new_files}
          on_check_new_files_change={props.on_check_new_files_change}
          clear_checks_in_workspace_behavior={
            props.clear_checks_in_workspace_behavior
          }
          on_clear_checks_in_workspace_behavior_change={
            props.on_clear_checks_in_workspace_behavior_change
          }
          edit_format_instructions={props.edit_format_instructions}
          on_edit_format_instructions_change={
            props.on_edit_format_instructions_change
          }
          are_automatic_checkpoints_disabled={
            props.are_automatic_checkpoints_disabled
          }
          on_automatic_checkpoints_toggle={
            props.on_automatic_checkpoints_toggle
          }
          checkpoint_lifespan={props.checkpoint_lifespan}
          on_checkpoint_lifespan_change={props.on_checkpoint_lifespan_change}
          on_open_editor_settings={props.on_open_editor_settings}
          on_open_ignore_patterns_settings={
            props.on_open_ignore_patterns_settings
          }
          on_open_allow_patterns_settings={
            props.on_open_allow_patterns_settings
          }
          gemini_user_id={props.gemini_user_id}
          ai_studio_user_id={props.ai_studio_user_id}
          on_gemini_user_id_change={props.on_gemini_user_id_change}
          on_ai_studio_user_id_change={props.on_ai_studio_user_id_change}
          on_stuck_change={general_on_stuck_change}
        />

        <UiSection
          ref={(el) => (section_refs.current['model-providers'] = el)}
          title={t('sidebar.model-providers')}
          subtitle={t('model-providers.subtitle')}
          on_stuck_change={model_providers_on_stuck_change}
          actions={
            <UiButton on_click={() => props.on_add_provider()}>
              {t('action.add-new')}
            </UiButton>
          }
        >
          <UiNotice type="info">
            <Translation
              id="model-providers.notice.credentials"
              components={{
                link: (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      props.on_open_external_url(
                        'https://code.visualstudio.com/api/references/vscode-api#SecretStorage'
                      )
                    }}
                  >
                    SecretStorage
                  </a>
                )
              }}
            />
          </UiNotice>
          {props.providers.length == 0 && (
            <UiNotice type="warning">
              {t('model-providers.notice.missing')}
            </UiNotice>
          )}
          <UiGroup>
            <ModelProvidersSection
              providers={props.providers}
              on_reorder={(reordered) => {
                props.set_providers(reordered)
                props.on_reorder_providers(reordered)
              }}
              on_add_provider={props.on_add_provider}
              on_delete_provider={props.on_delete_provider}
              on_edit_provider={props.on_edit_provider}
              on_change_api_key={props.on_change_api_key}
            />
          </UiGroup>
        </UiSection>
        <UiSection
          ref={(el) => (section_refs.current['intelligent-update'] = el)}
          group={t('section.api-tool')}
          title={t('sidebar.intelligent-update')}
          subtitle={t('intelligent-update.subtitle')}
          on_stuck_change={intelligent_update_on_stuck_change}
          actions={
            <UiButton
              on_click={() =>
                props.on_add_config('INTELLIGENT_UPDATE', {
                  create_on_top: true
                })
              }
            >
              {t('action.add-new')}
            </UiButton>
          }
        >
          <UiNotice type="info">{t('intelligent-update.notice')}</UiNotice>
          {props.intelligent_update_configs.length == 0 && (
            <UiNotice type="warning">
              {t('message.missing-configuration')}
            </UiNotice>
          )}
          <UiGroup>
            <ApiToolConfigurationSection
              configurations={props.intelligent_update_configs}
              set_configurations={props.set_intelligent_update_configs}
              tool_name="INTELLIGENT_UPDATE"
              can_have_default={true}
              on_add={(params) =>
                props.on_add_config('INTELLIGENT_UPDATE', params)
              }
              on_reorder={(reordered) =>
                props.on_reorder_configs('INTELLIGENT_UPDATE', reordered)
              }
              on_edit={(id) => props.on_edit_config('INTELLIGENT_UPDATE', id)}
              on_duplicate={(id) =>
                props.on_duplicate_config('INTELLIGENT_UPDATE', id)
              }
              on_delete={(id) =>
                props.on_delete_config('INTELLIGENT_UPDATE', id)
              }
              on_set_default={(id) =>
                props.on_set_default_config('INTELLIGENT_UPDATE', id)
              }
              on_unset_default={() =>
                props.on_unset_default_config('INTELLIGENT_UPDATE')
              }
            />
            <UiItem
              title={t('intelligent-update.fix-all-automatically.title')}
              description={t(
                'intelligent-update.fix-all-automatically.description'
              )}
              slot_right={
                <UiToggler
                  is_on={props.fix_all_automatically}
                  on_toggle={props.on_fix_all_automatically_change}
                />
              }
            />
          </UiGroup>
        </UiSection>

        <UiSection
          ref={(el) => (section_refs.current['edit-context'] = el)}
          group={t('section.api-tool')}
          title={t('sidebar.edit-context')}
          subtitle={t('edit-context.subtitle')}
          on_stuck_change={edit_context_on_stuck_change}
          actions={
            <UiButton
              on_click={() =>
                props.on_add_config('EDIT_CONTEXT', { create_on_top: true })
              }
            >
              {t('action.add-new')}
            </UiButton>
          }
        >
          <UiNotice type="info">{t('edit-context.notice')}</UiNotice>
          {props.edit_context_configs.length == 0 && (
            <UiNotice type="warning">
              {t('message.missing-configuration')}
            </UiNotice>
          )}
          <UiGroup>
            <ApiToolConfigurationSection
              configurations={props.edit_context_configs}
              set_configurations={props.set_edit_context_configs}
              tool_name="EDIT_CONTEXT"
              can_have_default={false}
              on_add={(params) => props.on_add_config('EDIT_CONTEXT', params)}
              on_reorder={(reordered) =>
                props.on_reorder_configs('EDIT_CONTEXT', reordered)
              }
              on_edit={(id) => props.on_edit_config('EDIT_CONTEXT', id)}
              on_duplicate={(id) =>
                props.on_duplicate_config('EDIT_CONTEXT', id)
              }
              on_delete={(id) => props.on_delete_config('EDIT_CONTEXT', id)}
            />
            <UiItem
              title={t('edit-context.system-instructions.title')}
              description={t('edit-context.system-instructions.description')}
              slot_below={
                <UiTextarea
                  value={edit_context_instructions}
                  on_change={set_edit_context_instructions}
                  on_blur={() => {
                    props.on_edit_context_system_instructions_change(
                      edit_context_instructions
                    )
                    if (
                      edit_context_instructions == '' &&
                      props.edit_context_system_instructions ==
                        default_system_instructions
                    ) {
                      set_edit_context_instructions(default_system_instructions)
                    }
                  }}
                />
              }
            />
          </UiGroup>
        </UiSection>

        <UiSection
          ref={(el) => (section_refs.current['code-at-cursor'] = el)}
          group={t('section.api-tool')}
          title={t('sidebar.code-at-cursor')}
          subtitle={t('code-at-cursor.subtitle')}
          on_stuck_change={code_at_cursor_on_stuck_change}
          actions={
            <UiButton
              on_click={() =>
                props.on_add_config('CODE_AT_CURSOR', { create_on_top: true })
              }
            >
              {t('action.add-new')}
            </UiButton>
          }
        >
          <UiNotice type="info">{t('code-at-cursor.notice')}</UiNotice>
          {props.code_at_cursor_configs.length == 0 && (
            <UiNotice type="warning">
              {t('message.missing-configuration')}
            </UiNotice>
          )}
          <UiGroup>
            <ApiToolConfigurationSection
              configurations={props.code_at_cursor_configs}
              set_configurations={props.set_code_at_cursor_configs}
              tool_name="CODE_AT_CURSOR"
              can_have_default={true}
              on_add={(params) => props.on_add_config('CODE_AT_CURSOR', params)}
              on_reorder={(reordered) =>
                props.on_reorder_configs('CODE_AT_CURSOR', reordered)
              }
              on_edit={(id) => props.on_edit_config('CODE_AT_CURSOR', id)}
              on_duplicate={(id) =>
                props.on_duplicate_config('CODE_AT_CURSOR', id)
              }
              on_delete={(id) => props.on_delete_config('CODE_AT_CURSOR', id)}
              on_set_default={(id) =>
                props.on_set_default_config('CODE_AT_CURSOR', id)
              }
              on_unset_default={() =>
                props.on_unset_default_config('CODE_AT_CURSOR')
              }
            />
            <UiItem
              title={t('code-at-cursor.keyboard-shortcut.title')}
              description={t('code-at-cursor.keyboard-shortcut.description')}
              slot_right={
                <UiTextButton
                  on_click={() =>
                    props.on_open_keybindings('codeWebChat.codeAtCursor')
                  }
                >
                  {t('code-at-cursor.keyboard-shortcut.action')}
                </UiTextButton>
              }
            />
          </UiGroup>
        </UiSection>

        <UiSection
          ref={(el) => (section_refs.current['prune-context'] = el)}
          group={t('section.api-tool')}
          title={t('sidebar.prune-context')}
          subtitle={t('prune-context.subtitle')}
          on_stuck_change={prune_context_on_stuck_change}
          actions={
            <UiButton
              on_click={() =>
                props.on_add_config('PRUNE_CONTEXT', { create_on_top: true })
              }
            >
              {t('action.add-new')}
            </UiButton>
          }
        >
          <UiNotice type="info">{t('prune-context.notice')}</UiNotice>
          {props.prune_context_configs.length == 0 && (
            <UiNotice type="warning">
              {t('message.missing-configuration')}
            </UiNotice>
          )}
          <UiGroup>
            <ApiToolConfigurationSection
              configurations={props.prune_context_configs}
              set_configurations={props.set_prune_context_configs}
              tool_name="PRUNE_CONTEXT"
              can_have_default={false}
              on_add={(params) => props.on_add_config('PRUNE_CONTEXT', params)}
              on_reorder={(reordered) =>
                props.on_reorder_configs('PRUNE_CONTEXT', reordered)
              }
              on_edit={(id) => props.on_edit_config('PRUNE_CONTEXT', id)}
              on_duplicate={(id) =>
                props.on_duplicate_config('PRUNE_CONTEXT', id)
              }
              on_delete={(id) => props.on_delete_config('PRUNE_CONTEXT', id)}
            />
          </UiGroup>
        </UiSection>

        <UiSection
          ref={(el) => (section_refs.current['commit-messages'] = el)}
          group={t('section.api-tool')}
          title={t('sidebar.commit-messages')}
          subtitle={t('commit-messages.subtitle')}
          on_stuck_change={commit_messages_on_stuck_change}
          actions={
            <UiButton
              on_click={() =>
                props.on_add_config('COMMIT_MESSAGES', { create_on_top: true })
              }
            >
              {t('action.add-new')}
            </UiButton>
          }
        >
          <UiNotice type="info">{t('commit-messages.notice')}</UiNotice>
          {props.commit_messages_configs.length == 0 && (
            <UiNotice type="warning">
              {t('message.missing-configuration')}
            </UiNotice>
          )}
          <UiGroup>
            <ApiToolConfigurationSection
              configurations={props.commit_messages_configs}
              set_configurations={props.set_commit_messages_configs}
              tool_name="COMMIT_MESSAGES"
              can_have_default={true}
              on_add={(params) =>
                props.on_add_config('COMMIT_MESSAGES', params)
              }
              on_reorder={(reordered) =>
                props.on_reorder_configs('COMMIT_MESSAGES', reordered)
              }
              on_edit={(id) => props.on_edit_config('COMMIT_MESSAGES', id)}
              on_duplicate={(id) =>
                props.on_duplicate_config('COMMIT_MESSAGES', id)
              }
              on_delete={(id) => props.on_delete_config('COMMIT_MESSAGES', id)}
              on_set_default={(id) =>
                props.on_set_default_config('COMMIT_MESSAGES', id)
              }
              on_unset_default={() =>
                props.on_unset_default_config('COMMIT_MESSAGES')
              }
            />
            <UiItem
              title={t('commit-messages.instructions.title')}
              description={t('commit-messages.instructions.description')}
              slot_below={
                <UiTextarea
                  value={commit_instructions}
                  on_change={set_commit_instructions}
                  on_blur={() => {
                    props.on_commit_instructions_change(commit_instructions)
                    if (
                      commit_instructions == '' &&
                      props.commit_message_instructions ==
                        default_commit_message_instructions
                    ) {
                      set_commit_instructions(
                        default_commit_message_instructions
                      )
                    }
                  }}
                />
              }
            />
            <UiItem
              title={t('commit-messages.include-prompts.title')}
              description={t('commit-messages.include-prompts.description')}
              slot_right={
                <UiToggler
                  is_on={props.include_prompts_in_commit_messages}
                  on_toggle={props.on_include_prompts_in_commit_messages_change}
                />
              }
            />
          </UiGroup>
        </UiSection>

        <UiSection
          ref={(el) => (section_refs.current['voice-input'] = el)}
          group={t('section.api-tool')}
          title={t('sidebar.voice-input')}
          subtitle={t('voice-input.subtitle')}
          on_stuck_change={voice_input_on_stuck_change}
          actions={
            <UiButton
              on_click={() =>
                props.on_add_config('VOICE_INPUT', {
                  create_on_top: true
                })
              }
            >
              {t('action.add-new')}
            </UiButton>
          }
        >
          <UiNotice type="info">
            <Translation
              id="voice-input.notice"
              components={{
                link: (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      props.on_open_external_url(
                        'https://ai.google.dev/gemini-api/docs/audio'
                      )
                    }}
                  >
                    {t('voice-input.notice.link')}
                  </a>
                )
              }}
            />
          </UiNotice>
          {props.voice_input_configs.length == 0 && (
            <UiNotice type="warning">
              {t('message.missing-configuration')}
            </UiNotice>
          )}
          <UiGroup>
            <ApiToolConfigurationSection
              configurations={props.voice_input_configs}
              set_configurations={props.set_voice_input_configs}
              tool_name="VOICE_INPUT"
              can_have_default={true}
              on_add={(params) => props.on_add_config('VOICE_INPUT', params)}
              on_reorder={(reordered) =>
                props.on_reorder_configs('VOICE_INPUT', reordered)
              }
              on_edit={(id) => props.on_edit_config('VOICE_INPUT', id)}
              on_duplicate={(id) =>
                props.on_duplicate_config('VOICE_INPUT', id)
              }
              on_delete={(id) => props.on_delete_config('VOICE_INPUT', id)}
              on_set_default={(id) =>
                props.on_set_default_config('VOICE_INPUT', id)
              }
              on_unset_default={() =>
                props.on_unset_default_config('VOICE_INPUT')
              }
            />
            <UiItem
              title={t('voice-input.instructions.title')}
              description={t('voice-input.instructions.description')}
              slot_below={
                <UiTextarea
                  value={voice_input_instructions}
                  on_change={set_voice_input_instructions}
                  on_blur={() => {
                    props.on_voice_input_instructions_change(
                      voice_input_instructions
                    )
                    if (
                      voice_input_instructions == '' &&
                      props.voice_input_instructions ==
                        default_voice_input_instructions
                    ) {
                      set_voice_input_instructions(
                        default_voice_input_instructions
                      )
                    }
                  }}
                />
              }
            />
          </UiGroup>
        </UiSection>
      </UiLayout>
    </div>
  )
}
