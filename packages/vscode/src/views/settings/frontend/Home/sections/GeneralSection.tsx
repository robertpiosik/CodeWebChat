import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@ui/components/editor/common/Input'
import { Item } from '@ui/components/editor/settings/Item'
import { Section } from '@ui/components/editor/settings/Section'
import { TextButton } from '@ui/components/editor/settings/TextButton'

type Props = {
  context_size_warning_threshold: number
  clear_checks_in_workspace: 'ignore-open-editors' | 'uncheck-all'
  on_context_size_warning_threshold_change: (threshold: number) => void
  on_clear_checks_in_workspace_change: (
    value: 'ignore-open-editors' | 'uncheck-all'
  ) => void
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
        subtitle="Configure your experience with CWC."
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
          slot={
            <Input
              type="number"
              value={context_size_warning_threshold}
              onChange={set_context_size_warning_threshold}
              max_width={100}
            />
          }
        />
        <Item
          title="Clear Checks in Workspace"
          description="Behavior of the 'Clear Checks' command in the Workspace view."
          slot={
            <select
              value={props.clear_checks_in_workspace}
              onChange={(e) =>
                props.on_clear_checks_in_workspace_change(
                  e.target.value as 'ignore-open-editors' | 'uncheck-all'
                )
              }
            >
              <option value="ignore-open-editors">Ignore Open Editors</option>
              <option value="uncheck-all">Uncheck All</option>
            </select>
          }
        />
      </Section>
    )
  }
)
GeneralSection.displayName = 'GeneralSection'
