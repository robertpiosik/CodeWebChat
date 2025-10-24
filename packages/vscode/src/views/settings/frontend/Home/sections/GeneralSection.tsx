import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@ui/components/editor/common/Input'
import { Item } from '@ui/components/editor/settings/Item'
import { Section } from '@ui/components/editor/settings/Section'
import { TextButton } from '@ui/components/editor/settings/TextButton'

type Props = {
  context_size_warning_threshold: number
  on_context_size_warning_threshold_change: (threshold: number) => void
  on_open_editor_settings: () => void
  on_stuck_change: (is_stuck: boolean) => void
}

export const GeneralSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const [context_size_warning_threshold, set_context_size_warning_threshold] =
      useState('')

    useEffect(() => {
      set_context_size_warning_threshold(
        String(props.context_size_warning_threshold)
      )
    }, [props.context_size_warning_threshold])

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

    return (
      <Section
        ref={ref}
        title="General"
        subtitle="General settings for the extension."
        on_stuck_change={props.on_stuck_change}
      >
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
          slot_placement="below"
          slot={
            <Input
              type="number"
              value={context_size_warning_threshold}
              onChange={set_context_size_warning_threshold}
              max_width={100}
            />
          }
        />
      </Section>
    )
  }
)
GeneralSection.displayName = 'GeneralSection'
