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

type ClearChecksBehavior = 'ignore-open-editors' | 'uncheck-all'

const CLEAR_CHECKS_OPTIONS: Dropdown.Option<ClearChecksBehavior>[] = [
  { value: 'ignore-open-editors', label: 'Ignore Open Editors' },
  { value: 'uncheck-all', label: 'Uncheck All' }
]

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
  on_context_size_warning_threshold_change: (threshold: number) => void
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
    const [context_size_warning_threshold, set_context_size_warning_threshold] =
      useState('')
    const [checkpoint_lifespan_str, set_checkpoint_lifespan_str] = useState('')
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
      set_context_size_warning_threshold(
        String(props.context_size_warning_threshold)
      )
    }, [props.context_size_warning_threshold])

    useEffect(() => {
      set_checkpoint_lifespan_str(String(props.checkpoint_lifespan))
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
      const num_threshold = parseInt(context_size_warning_threshold, 10)
      if (!isNaN(num_threshold) && num_threshold >= 0) {
        props.on_context_size_warning_threshold_change(num_threshold)
      }
    }

    const handle_checkpoint_lifespan_blur = () => {
      const num_hours = parseInt(checkpoint_lifespan_str, 10)
      if (!isNaN(num_hours) && num_hours > 0) {
        props.on_checkpoint_lifespan_change(num_hours)
      } else {
        props.on_checkpoint_lifespan_change(undefined)
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
    }

    return (
      <Section
        ref={ref}
        title="General"
        subtitle="Configure your experience."
        on_stuck_change={props.on_stuck_change}
      >
        <Group>
          <Item
            title="Open Editor Settings"
            description="For general editor settings, visit the Editor Settings Page."
            slot_right={
              <TextButton on_click={props.on_open_editor_settings}>
                Open Editor Settings
              </TextButton>
            }
          />
          <Item
            title="Ignore patterns"
            description="Glob patterns that you don't want to place in .gitignore files."
            slot_right={
              <TextButton on_click={props.on_open_ignore_patterns_settings}>
                Open settings file
              </TextButton>
            }
          />
          <Item
            title="Allow patterns"
            description="Glob patterns that you want to include despite being ignored by .gitignore."
            slot_right={
              <TextButton on_click={props.on_open_allow_patterns_settings}>
                Open settings file
              </TextButton>
            }
          />
          <Item
            title="Context Size Warning Threshold"
            description="Set the token count threshold for showing a warning about large context sizes."
            slot_right={
              <Input
                type="number"
                value={context_size_warning_threshold}
                on_change={set_context_size_warning_threshold}
                on_blur={handle_context_size_warning_threshold_blur}
                max_width={100}
              />
            }
          />
          <Item
            title="Check New Files"
            description="Automatically include newly created files in context."
            slot_right={
              <Toggler
                is_on={props.check_new_files}
                on_toggle={props.on_check_new_files_change}
              />
            }
          />
          <Item
            title="Send with Shift+Enter"
            description="Use Shift+Enter to send messages and Enter to insert a new line."
            slot_right={
              <Toggler
                is_on={props.send_with_shift_enter}
                on_toggle={props.on_send_with_shift_enter_change}
              />
            }
          />
          <Item
            title="Clear Checks in Workspace Behavior"
            description="Behavior of the 'Clear Checks' button in the Workspace view."
            slot_right={
              <Dropdown
                options={CLEAR_CHECKS_OPTIONS}
                value={props.clear_checks_in_workspace_behavior}
                onChange={props.on_clear_checks_in_workspace_behavior_change}
              />
            }
          />
        </Group>
        <Group title="Checkpoints">
          <Item
            title="Automatic Checkpoints"
            description="A checkpoint will be created whenever a response is accepted or changes commited."
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
            title="Checkpoint Lifespan"
            description="The lifespan of checkpoints in hours. Checkpoints older than this will be automatically deleted."
            slot_right={
              <Input
                type="number"
                value={checkpoint_lifespan_str}
                on_change={set_checkpoint_lifespan_str}
                on_blur={handle_checkpoint_lifespan_blur}
                max_width={100}
              />
            }
          />
        </Group>
        <Group title="Edit Format Instructions">
          <Item
            title="Whole"
            description="Instructions for generating code in 'whole' edit format."
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    whole: !prev.whole
                  }))
                }
              >
                {instructions_visibility.whole ? 'Hide' : 'Show'}
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
            title="Truncated"
            description="Instructions for generating code in 'truncated' edit format."
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    truncated: !prev.truncated
                  }))
                }
              >
                {instructions_visibility.truncated ? 'Hide' : 'Show'}
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
            title="Before and After"
            description="Instructions for generating code in 'before/after' edit format."
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    before_after: !prev.before_after
                  }))
                }
              >
                {instructions_visibility.before_after ? 'Hide' : 'Show'}
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
            title="Diff"
            description="Instructions for generating code in 'diff' edit format."
            slot_right={
              <TextButton
                on_click={() =>
                  set_instructions_visibility((prev) => ({
                    ...prev,
                    diff: !prev.diff
                  }))
                }
              >
                {instructions_visibility.diff ? 'Hide' : 'Show'}
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
        <Group title="Presets">
          <Item
            title="Gemini User ID"
            description="Run Gemini chatbot as non-default user. Check URL for the numeric ID."
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
            title="AI Studio User ID"
            description="Run AI Studio chatbot as non-default user. Check URL for the numeric ID."
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
