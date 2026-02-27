import { PreparedFile } from './types'
import * as vscode from 'vscode'
import { preview_document_provider } from './virtual-document-provider'

export const create_temp_files_with_original_content = (
  prepared_files: PreparedFile[]
) => {
  prepared_files.forEach((file) => {
    preview_document_provider.setContent(
      vscode.Uri.parse(file.original_uri),
      file.original_content
    )
  })
}

export const cleanup_temp_files = (prepared_files: PreparedFile[]) => {
  prepared_files.forEach((file) => {
    preview_document_provider.deleteContent(vscode.Uri.parse(file.original_uri))
  })
}
