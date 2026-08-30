import { SelectedFiles } from './SelectedFiles'

export default {
  component: SelectedFiles
}

export const Default = () => {
  return (
    <SelectedFiles
      token_count={12500}
      files_count={5}
      translations={{
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}

export const ZeroTokens = () => {
  return (
    <SelectedFiles
      token_count={0}
      files_count={0}
      translations={{
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}
