import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@ui/components/editor/common/Input'
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
  checkpoint_lifespan: number
  on_checkpoint_lifespan_change: (hours: number) => void
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
  on_stuck_change: (is_stuck: boolean) => void
}

export const GeneralSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const [context_size_warning_threshold, set_context_size_warning_threshold] =
      useState('')
    const [checkpoint_lifespan_str, set_checkpoint_lifespan_str] = useState('')
    const [instructions, set_instructions] = useState<EditFormatInstructions>({
      whole: '',
      truncated: '',
      diff: ''
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
      if (props.edit_format_instructions) {
        set_instructions(props.edit_format_instructions)
      }
    }, [props.edit_format_instructions])

    useEffect(() => {
      const handler = setTimeout(() => {
        const num_threshold = parseInt(context_size_warning_threshold, 10)
        if (
          !isNaN(num_threshold) &&
          num_threshold >= 0 &&
          props.context_size_warning_threshold !== undefined &&
          num_threshold != props.context_size_warning_threshold
        ) {
          props.on_context_size_warning_threshold_change(num_threshold)
        }
      }, 500)
      return () => clearTimeout(handler)
    }, [
      context_size_warning_threshold,
      props.on_context_size_warning_threshold_change,
      props.context_size_warning_threshold
    ])

    useEffect(() => {
      const handler = setTimeout(() => {
        const num_hours = parseInt(checkpoint_lifespan_str, 10)
        if (
          !isNaN(num_hours) &&
          num_hours > 0 &&
          props.checkpoint_lifespan !== undefined &&
          num_hours != props.checkpoint_lifespan
        ) {
          props.on_checkpoint_lifespan_change(num_hours)
        }
      }, 500)
      return () => clearTimeout(handler)
    }, [
      checkpoint_lifespan_str,
      props.on_checkpoint_lifespan_change,
      props.checkpoint_lifespan
    ])

    useEffect(() => {
      const handler = setTimeout(() => {
        if (
          props.edit_format_instructions &&
          JSON.stringify(instructions) !==
            JSON.stringify(props.edit_format_instructions)
        ) {
          props.on_edit_format_instructions_change(instructions)
        }
      }, 500)
      return () => clearTimeout(handler)
    }, [
      instructions,
      props.on_edit_format_instructions_change,
      props.edit_format_instructions
    ])

    return (
      <Section
        ref={ref}
        title="General"
        subtitle="Configure your experience with CWC."
        on_stuck_change={props.on_stuck_change}
      >
        <Group>
          <Item
            title="Open Editor Settings"
            description="For general editor settings, visit the Editor Settings Page."
            slot={
              <TextButton on_click={props.on_open_editor_settings}>
                Open Editor Settings
              </TextButton>
            }
          />
          <Item
            title="Context Size Warning Threshold"
            description="Set the token count threshold for showing a warning about large context sizes."
            slot={
              <Input
                type="number"
                value={context_size_warning_threshold}
                on_change={set_context_size_warning_threshold}
                max_width={100}
              />
            }
          />
          <Item
            title="Checkpoint Lifespan"
            description="The lifespan of checkpoints in hours. Checkpoints older than this will be automatically deleted."
            slot={
              <Input
                type="number"
                value={checkpoint_lifespan_str}
                on_change={set_checkpoint_lifespan_str}
                max_width={100}
                min={1}
              />
            }
          />
          <Item
            title="Clear Checks in Workspace Behavior"
            description="Behavior of the 'Clear Checks' button in the Workspace view."
            slot={
              <Dropdown
                options={CLEAR_CHECKS_OPTIONS}
                value={props.clear_checks_in_workspace_behavior}
                onChange={props.on_clear_checks_in_workspace_behavior_change}
              />
            }
          />
        </Group>
        <Group title="Edit Format Instructions">
          <Item
            title="Whole"
            description="Instructions for generating code in 'whole' edit format."
            slot_placement="below"
            slot={
              <Textarea
                value={instructions.whole}
                on_change={(value) =>
                  set_instructions((prev) => ({ ...prev, whole: value }))
                }
              />
            }
          />
          <Item
            title="Truncated"
            description="Instructions for generating code in 'truncated' edit format."
            slot_placement="below"
            slot={
              <Textarea
                value={instructions.truncated}
                on_change={(value) =>
                  set_instructions((prev) => ({ ...prev, truncated: value }))
                }
              />
            }
          />
          <Item
            title="Diff"
            description="Instructions for generating code in 'diff' edit format."
            slot_placement="below"
            slot={
              <Textarea
                value={instructions.diff}
                on_change={(value) =>
                  set_instructions((prev) => ({ ...prev, diff: value }))
                }
              />
            }
          />
        </Group>
      </Section>
    )
  }
)
GeneralSection.displayName = 'GeneralSection'
