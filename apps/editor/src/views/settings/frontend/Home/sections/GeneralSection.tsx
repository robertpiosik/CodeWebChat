import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@ui/components/editor/common/Input'
import { Toggler } from '@ui/components/editor/common/Toggler'
import { Dropdown } from '@ui/components/editor/common/Dropdown'
import { Item } from '@ui/components/editor/settings/Item'
import { Group } from '@ui/components/editor/settings/Group/Group'
import { Section } from '@ui/components/editor/settings/Section'
import { TextButton } from '@ui/components/editor/settings/TextButton'
import { Textarea } from '@ui/components/editor/common/Textarea'
import { EditFormatInstructions } from '@/views/settings/types/messages'
import {
  CHECKPOINT_DEFAULT_LIFESPAN,
  DEFAULT_CONTEXT_SIZE_WARNING_THRESHOLD
} from '@/constants/values'
import {
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'
import { use_translation } from '@/views/i18n/use-translation'

type ClearChecksBehavior = 'ignore-open-editors' | 'uncheck-all'

type Props = {
  context_size_warning_threshold: number
  are_automatic_checkpoints_disabled: boolean
  send_with_shift_enter: boolean
  check_new_files: boolean
  checkpoint_lifespan: number
  gemini_user_id: number | null
  ai_studio_user_id: number | null
  on_gemini_user_id_change: (id: number | null) => void
  on_ai_studio_user_id_change: (id: number | null) => void
  on_automatic_checkpoints_toggle: (disabled: boolean) => void
  on_send_with_shift_enter_change: (enabled: boolean) => void
  on_check_new_files_change: (enabled: boolean) => void
  on_checkpoint_lifespan_change: (hours: number | undefined) => void
  clear_checks_in_workspace_behavior: ClearChecksBehavior
  edit_format_instructions: EditFormatInstructions
  on_context_size_warning_threshold_change: (
    threshold: number | undefined
  ) => void
  on_clear_checks_in_workspace_behavior_change: (
    value: ClearChecksBehavior
  ) => void
  on_edit_format_instructions_change: (
    instructions: EditFormatInstructions
  ) => void
  on_open_editor_settings: () => void
  on_open_ignore_patterns_settings: () => void
  on_open_allow_patterns_settings: () => void
  on_stuck_change: (is_stuck: boolean) => void
}

export const GeneralSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { t } = use_translation()
    const [context_size_warning_threshold, set_context_size_warning_threshold] =
      useState<number>()
    const [checkpoint_lifespan, set_checkpoint_lifespan] = useState<number>()
    const [gemini_user_id_str, set_gemini_user_id_str] = useState('')
    const [ai_studio_user_id_str, set_ai_studio_user_id_str] = useState('')
    const [instructions, set_instructions] = useState<EditFormatInstructions>({
      whole: '',
      truncated: '',
      before_after: '',
      diff: ''
    })
    const [instructions_visibility, set_instructions_visibility] = useState({
      whole: false,
      truncated: false,
      before_after: false,
      diff: false
    })

    useEffect(() => {
      set_context_size_warning_threshold(props.context_size_warning_threshold)
    }, [props.context_size_warning_threshold])

    useEffect(() => {
      set_checkpoint_lifespan(props.checkpoint_lifespan)
    }, [props.checkpoint_lifespan])

    useEffect(() => {
      set_gemini_user_id_str(
        props.gemini_user_id === null || props.gemini_user_id === undefined
          ? ''
          : String(props.gemini_user_id)
      )
    }, [props.gemini_user_id])

    useEffect(() => {
      set_ai_studio_user_id_str(
        props.ai_studio_user_id === null ||
          props.ai_studio_user_id === undefined
          ? ''
          : String(props.ai_studio_user_id)
      )
    }, [props.ai_studio_user_id])

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

    const handle_checkpoint_lifespan_blur = () => {
      if (checkpoint_lifespan && checkpoint_lifespan > 0) {
        props.on_checkpoint_lifespan_change(checkpoint_lifespan)
      } else {
        props.on_checkpoint_lifespan_change(undefined)
        set_checkpoint_lifespan(CHECKPOINT_DEFAULT_LIFESPAN)
      }
    }

    const handle_gemini_user_id_blur = () => {
      if (gemini_user_id_str == '') {
        props.on_gemini_user_id_change(null)
        return
      }
      const num_id = parseInt(gemini_user_id_str, 10)
      if (!isNaN(num_id) && num_id >= 0) {
        props.on_gemini_user_id_change(num_id)
      }
    }

    const handle_ai_studio_user_id_blur = () => {
      if (ai_studio_user_id_str == '') {
        props.on_ai_studio_user_id_change(null)
        return
      }
      const num_id = parseInt(ai_studio_user_id_str, 10)
      if (!isNaN(num_id) && num_id >= 0) {
        props.on_ai_studio_user_id_change(num_id)
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
        before_after:
          prev.before_after == '' &&
          props.edit_format_instructions.before_after ==
            EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER
            ? EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER
            : prev.before_after,
        diff:
          prev.diff == '' &&
          props.edit_format_instructions.diff == EDIT_FORMAT_INSTRUCTIONS_DIFF
            ? EDIT_FORMAT_INSTRUCTIONS_DIFF
            : prev.diff
      }))
    }

    return (
      <Section
        ref={ref}
        title={t('settings.sidebar.general')}
        subtitle={t('settings.general.subtitle')}
        on_stuck_change={props.on_stuck_change}
      >
        <Group>
          <Item
            title={t('settings.general.open-editor-settings.title')}
            description={t('settings.general.open-editor-settings.description')}
            slot_right={
              <TextButton on_click={props.on_open_editor_settings}>
                {t('settings.general.open-editor-settings.action')}
              </TextButton>
            }
          />
          <Item
            title={t('settings.general.ignore-patterns.title')}
            description={t('settings.general.ignore-patterns.description')}
            slot_right={
              <TextButton on_click={props.on_open_ignore_patterns_settings}>
                {t('settings.general.ignore-patterns.action')}
              </TextButton>
            }
          />
          <Item
            title={t('settings.general.allow-patterns.title')}
            description={t('settings.general.allow-patterns.description')}
            slot_right={
              <TextButton on_click={props.on_open_allow_patterns_settings}>
                {t('settings.general.allow-patterns.action')}
              </TextButton>
            }
          />
          <Item
            title={t('settings.general.context-size-warning-threshold.title')}
            description={t(
              'settings.general.context-size-warning-threshold.description'
            )}
            slot_right={
              <Input
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
          <Item
            title={t('settings.general.check-new-files.title')}
            description={t('settings.general.check-new-files.description')}
            slot_right={
              <Toggler
                is_on={props.check_new_files}
                on_toggle={props.on_check_new_files_change}
              />
            }
          />
          <Item
            title={t('settings.general.send-with-shift-enter.title')}
            description={t(
              'settings.general.send-with-shift-enter.description'
            )}
            slot_right={
              <Toggler
                is_on={props.send_with_shift_enter}
                on_toggle={props.on_send_with_shift_enter_change}
              />
            }
          />
          <Item
            title={t(
              'settings.general.clear-checks-in-workspace-behavior.title'
            )}
            description={t(
              'settings.general.clear-checks-in-workspace-behavior.description'
            )}
            slot_right={
              <Dropdown
                options={[
                  {
                    value: 'ignore-open-editors',
                    label: t(
                      'settings.general.clear-checks.ignore-open-editors'
                    )
                  },
                  {
                    value: 'uncheck-all',
                    label: t('settings.general.clear-checks.uncheck-all')
                  }
                ]}
                value={props.clear_checks_in_workspace_behavior}
                onChange={props.on_clear_checks_in_workspace_behavior_change}
              />
            }
          />
        </Group>
        <Group title={t('settings.general.checkpoints.title')}>
          <Item
            title={t('settings.general.automatic-checkpoints.title')}
            description={t(
              'settings.general.automatic-checkpoints.description'
            )}
            slot_right={
              <Toggler
                is_on={!props.are_automatic_checkpoints_disabled}
                on_toggle={(is_on) =>
                  props.on_automatic_checkpoints_toggle(!is_on)
                }
              />
            }
          />
          <Item
            title={t('settings.general.checkpoint-lifespan.title')}
            description={t('settings.general.checkpoint-lifespan.description')}
            slot_right={
              <Input
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
        </Group>
        <Group title={t('settings.general.edit-format-instructions.title')}>
          <Item
            title={t('settings.general.edit-format.whole.title')}
            description={t('settings.general.edit-format.whole.description')}
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    whole: !prev.whole
                  }))
                }
              >
                {instructions_visibility.whole
                  ? t('settings.general.edit-format.hide')
                  : t('settings.general.edit-format.show')}
              </TextButton>
            }
            slot_below={
              instructions_visibility.whole && (
                <Textarea
                  value={instructions.whole}
                  min_rows={3}
                  on_change={(value) =>
                    set_instructions((prev) => ({ ...prev, whole: value }))
                  }
                  on_blur={handle_instructions_blur}
                />
              )
            }
          />
          <Item
            title={t('settings.general.edit-format.truncated.title')}
            description={t(
              'settings.general.edit-format.truncated.description'
            )}
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    truncated: !prev.truncated
                  }))
                }
              >
                {instructions_visibility.truncated
                  ? t('settings.general.edit-format.hide')
                  : t('settings.general.edit-format.show')}
              </TextButton>
            }
            slot_below={
              instructions_visibility.truncated && (
                <Textarea
                  value={instructions.truncated}
                  min_rows={3}
                  on_change={(value) =>
                    set_instructions((prev) => ({ ...prev, truncated: value }))
                  }
                  on_blur={handle_instructions_blur}
                />
              )
            }
          />
          <Item
            title={t('settings.general.edit-format.before-after.title')}
            description={t(
              'settings.general.edit-format.before-after.description'
            )}
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    before_after: !prev.before_after
                  }))
                }
              >
                {instructions_visibility.before_after
                  ? t('settings.general.edit-format.hide')
                  : t('settings.general.edit-format.show')}
              </TextButton>
            }
            slot_below={
              instructions_visibility.before_after && (
                <Textarea
                  value={instructions.before_after}
                  min_rows={3}
                  on_change={(value) =>
                    set_instructions((prev) => ({
                      ...prev,
                      before_after: value
                    }))
                  }
                  on_blur={handle_instructions_blur}
                />
              )
            }
          />
          <Item
            title={t('settings.general.edit-format.diff.title')}
            description={t('settings.general.edit-format.diff.description')}
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    diff: !prev.diff
                  }))
                }
              >
                {instructions_visibility.diff
                  ? t('settings.general.edit-format.hide')
                  : t('settings.general.edit-format.show')}
              </TextButton>
            }
            slot_below={
              instructions_visibility.diff && (
                <Textarea
                  value={instructions.diff}
                  min_rows={3}
                  on_change={(value) =>
                    set_instructions((prev) => ({ ...prev, diff: value }))
                  }
                  on_blur={handle_instructions_blur}
                />
              )
            }
          />
        </Group>
        <Group title={t('settings.general.presets.title')}>
          <Item
            title={t('settings.general.gemini-user-id.title')}
            description={t('settings.general.gemini-user-id.description')}
            slot_right={
              <Input
                type="number"
                value={gemini_user_id_str}
                on_change={set_gemini_user_id_str}
                on_blur={handle_gemini_user_id_blur}
                max_width={60}
              />
            }
          />
          <Item
            title={t('settings.general.ai-studio-user-id.title')}
            description={t('settings.general.ai-studio-user-id.description')}
            slot_right={
              <Input
                type="number"
                value={ai_studio_user_id_str}
                on_change={set_ai_studio_user_id_str}
                on_blur={handle_ai_studio_user_id_blur}
                max_width={60}
              />
            }
          />
        </Group>
      </Section>
    )
  }
)
GeneralSection.displayName = 'GeneralSection'
