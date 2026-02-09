import { SettingsButton } from './SettingsButton'

export default {
  component: SettingsButton
}

export const IconOnly = () => (
  <SettingsButton on_click={() => {}} title="Settings" />
)

export const WithLabel = () => (
  <SettingsButton on_click={() => {}} title="Settings" label="Settings" />
)

export const WithWarning = () => (
  <SettingsButton
    on_click={() => {}}
    title="Settings"
    show_warning_icon={true}
  />
)

export const WithLabelAndWarning = () => (
  <SettingsButton
    on_click={() => {}}
    title="Settings"
    label="Settings"
    show_warning_icon={true}
  />
)
