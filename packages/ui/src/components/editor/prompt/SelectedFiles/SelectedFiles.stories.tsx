import { useState } from 'react'
import { SelectedFiles } from './SelectedFiles'

export default {
  component: SelectedFiles
}

export const Default = () => {
  const [include, set_include] = useState(true)

  return (
    <SelectedFiles
      selected_files_token_count={12500}
      selected_files_count={5}
      include_selected_files={include}
      on_toggle_include_selected_files={set_include}
      translations={{
        attach_selected_files: 'Attach selected files',
        tokens_in_selected_files: 'Attaching {tokens} tokens in {files} files',
        disabled_attaching_selected_files: 'Disabled attaching selected files'
      }}
    />
  )
}

export const ZeroTokens = () => {
  const [include, set_include] = useState(false)

  return (
    <SelectedFiles
      selected_files_token_count={0}
      selected_files_count={0}
      include_selected_files={include}
      on_toggle_include_selected_files={set_include}
      translations={{
        attach_selected_files: 'Attach selected files',
        tokens_in_selected_files: 'Attaching {tokens} tokens in {files} files',
        disabled_attaching_selected_files: 'Disabled attaching selected files'
      }}
    />
  )
}
