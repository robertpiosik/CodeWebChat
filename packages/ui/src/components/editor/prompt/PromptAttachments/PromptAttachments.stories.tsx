import { PromptAttachments } from './PromptAttachments'

export default {
  component: PromptAttachments
}

export const Default = () => {
  return (
    <PromptAttachments
      token_count={12500}
      files_count={5}
      translations={{
        warning: 'Select context to edit',
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}

export const OnlyWarning = () => {
  return (
    <PromptAttachments
      translations={{
        warning: 'Select context to edit',
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}

export const OnlyFiles = () => {
  return (
    <PromptAttachments
      token_count={12500}
      files_count={5}
      translations={{
        attaching_files: 'Attaching {files} files'
      }}
    />
  )
}
