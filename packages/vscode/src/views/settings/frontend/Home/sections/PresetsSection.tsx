import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@ui/components/editor/common/Input'
import { Item } from '@ui/components/editor/settings/Item'
import { Section } from '@ui/components/editor/settings/Section'

type Props = {
  gemini_user_id: number | null
  on_gemini_user_id_change: (id: number | null) => void
  on_stuck_change: (is_stuck: boolean) => void
}

export const PresetsSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const [gemini_user_id_str, set_gemini_user_id_str] = useState('')

    useEffect(() => {
      set_gemini_user_id_str(
        props.gemini_user_id === null || props.gemini_user_id === undefined
          ? ''
          : String(props.gemini_user_id)
      )
    }, [props.gemini_user_id])

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

    return (
      <Section
        ref={ref}
        title="Presets"
        subtitle="Set up your favorite chatbot to run with a model of choice, prompt prefix or suffix, and more."
        on_stuck_change={props.on_stuck_change}
      >
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
      </Section>
    )
  }
)
PresetsSection.displayName = 'PresetsSection'
