import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@ui/components/editor/common/Input'
import { Dropdown } from '@ui/components/editor/common/Dropdown'
import { Item } from '@ui/components/editor/settings/Item'
import { Section } from '@ui/components/editor/settings/Section'
import { TextButton } from '@ui/components/editor/settings/TextButton'

type ClearChecksBehavior = 'ignore-open-editors' | 'uncheck-all'

const CLEAR_CHECKS_OPTIONS: Dropdown.Option<ClearChecksBehavior>[] = [
  { value: 'ignore-open-editors', label: 'Ignore Open Editors' },
  { value: 'uncheck-all', label: 'Uncheck All' }
]

type Props = {
  context_size_warning_threshold: number
  clear_checks_in_workspace_behavior: ClearChecksBehavior
  on_context_size_warning_threshold_change: (threshold: number) => void
  on_clear_checks_in_workspace_behavior_change: (
    value: ClearChecksBehavior
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
      </Section>
    )
  }
)
GeneralSection.displayName = 'GeneralSection'
