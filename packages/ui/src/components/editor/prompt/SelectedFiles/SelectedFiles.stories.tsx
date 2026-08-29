import { SelectedFiles } from './SelectedFiles'

export default {
  component: SelectedFiles
}

export const Default = () => {
  return (
    <SelectedFiles
      selected_files_token_count={12500}
      selected_files_count={5}
      translations={{
        attach_selected_files: 'Attach selected files',
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}

export const ZeroTokens = () => {
  return (
    <SelectedFiles
      selected_files_token_count={0}
      selected_files_count={0}
      translations={{
        attach_selected_files: 'Attach selected files',
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}
