import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@ui/components/editor/common/Input'
import { Item } from '@ui/components/editor/settings/Item'
import { Section } from '@ui/components/editor/settings/Section'
import { Group } from '@ui/components/editor/settings/Group/Group'
import { Textarea } from '@ui/components/editor/common/Textarea'
import { EditFormatInstructions } from '@/views/settings/types/messages'

type Props = {
  gemini_user_id: number | null
  edit_format_instructions: EditFormatInstructions
  on_gemini_user_id_change: (id: number | null) => void
  on_edit_format_instructions_change: (
    instructions: EditFormatInstructions
  ) => void
  on_stuck_change: (is_stuck: boolean) => void
}

export const PresetsSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const [gemini_user_id_str, set_gemini_user_id_str] = useState('')
    const [instructions, set_instructions] = useState<EditFormatInstructions>({
      whole: '',
      truncated: '',
      diff: ''
    })

    useEffect(() => {
      set_gemini_user_id_str(
        props.gemini_user_id === null || props.gemini_user_id === undefined
          ? ''
          : String(props.gemini_user_id)
      )
    }, [props.gemini_user_id])

    useEffect(() => {
      if (props.edit_format_instructions) {
        set_instructions(props.edit_format_instructions)
      }
    }, [props.edit_format_instructions])

    useEffect(() => {
      const handler = setTimeout(() => {
        if (gemini_user_id_str == '') {
          if (props.gemini_user_id !== null) {
            props.on_gemini_user_id_change(null)
          }
          return
        }

        const num_id = parseInt(gemini_user_id_str, 10)
        if (
          !isNaN(num_id) &&
          num_id >= 0 &&
          props.gemini_user_id !== undefined &&
          num_id != props.gemini_user_id
        ) {
          props.on_gemini_user_id_change(num_id)
        }
      }, 500)
      return () => clearTimeout(handler)
    }, [
      gemini_user_id_str,
      props.on_gemini_user_id_change,
      props.gemini_user_id
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
        title="Presets"
        subtitle="Set up your favorite chatbot to run with a model of choice, prompt prefix or suffix, and more."
        on_stuck_change={props.on_stuck_change}
      >
        <Group>
          <Item
            title="Gemini User ID"
            description="Run Gemini chatbot as non-default user. Check URL for the numeric ID."
            slot={
              <Input
                type="number"
                value={gemini_user_id_str}
                onChange={set_gemini_user_id_str}
                max_width={60}
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
PresetsSection.displayName = 'PresetsSection'
