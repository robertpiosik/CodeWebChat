import { PromptNotice } from './PromptNotice'

export default {
  component: PromptNotice
}

export const Default = () => {
  return (
    <PromptNotice
      warning="Select context to edit"
      token_count={12500}
      files_count={5}
      translations={{
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}

export const OnlyWarning = () => {
  return <PromptNotice warning="Select context to edit" />
}

export const OnlyFiles = () => {
  return (
    <PromptNotice
      token_count={12500}
      files_count={5}
      translations={{
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}
