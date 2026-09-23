import { translations as show_parent_folder_quick_pick } from './show-parent-folder-quick-pick'
import { translations as git_repository_utils } from './git-repository-utils'
import { translations as show_missing_configuration_notification } from './show-missing-configuration-notification'
import { translations as agentic_cli_invocation } from './agentic-cli-invocation'

export const translations = {
  ...show_parent_folder_quick_pick,
  ...git_repository_utils,
  ...show_missing_configuration_notification,
  ...agentic_cli_invocation
}
