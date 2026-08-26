import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { get_imports_for_uri } from '@/utils/get-imports-for-uri'

export const get_referencing_files_for_uris = async (params: {
  uris: vscode.Uri[]
  workspace_provider: WorkspaceProvider
  ignore_paths: string[]
  progress: vscode.Progress<{ message?: string; increment?: number }>
  token: vscode.CancellationToken
}): Promise<{ file_path: string; range: vscode.Range }[]> => {
  const file_map = new Map<string, vscode.Range>()
  const cached_imports = new Map<string, string[]>()

  for (const uri of params.uris) {
    if (params.token.isCancellationRequested) {
      break
    }

    try {
      const positions: vscode.Position[] = []

      const is_unsupported_for_symbol_search =
        /\.(css|scss|sass|less|styl|json|yaml|yml|md|html|xml)$/i.test(
          uri.fsPath
        )

      if (is_unsupported_for_symbol_search) {
        positions.push(new vscode.Position(0, 0))
      } else {
        let symbols = await vscode.commands.executeCommand<
          vscode.DocumentSymbol[] | vscode.SymbolInformation[]
        >('vscode.executeDocumentSymbolProvider', uri)

        if (!symbols || symbols.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          symbols = await vscode.commands.executeCommand<
            vscode.DocumentSymbol[] | vscode.SymbolInformation[]
          >('vscode.executeDocumentSymbolProvider', uri)
        }

        if (symbols) {
          const top_level_containers = new Set<string>()

          const traverse = (syms: any[]) => {
            for (const sym of syms) {
              if (sym.selectionRange) {
                positions.push(sym.selectionRange.start)
                const is_container =
                  sym.kind === vscode.SymbolKind.Module ||
                  sym.kind === vscode.SymbolKind.Namespace ||
                  sym.kind === vscode.SymbolKind.Package

                if (is_container && sym.children && sym.children.length > 0) {
                  traverse(sym.children)
                }
              } else if (sym.location) {
                const is_container =
                  sym.kind === vscode.SymbolKind.Module ||
                  sym.kind === vscode.SymbolKind.Namespace ||
                  sym.kind === vscode.SymbolKind.Package

                if (is_container) {
                  top_level_containers.add(sym.name)
                }

                if (
                  !sym.containerName ||
                  top_level_containers.has(sym.containerName)
                ) {
                  positions.push(sym.location.range.start)
                }
              }
            }
          }
          traverse(symbols)
        }
      }

      let has_retried_references = false

      for (let i = 0; i < positions.length; i++) {
        if (params.token.isCancellationRequested) {
          break
        }
        const position = positions[i]

        let locations = await vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeReferenceProvider',
          uri,
          position
        )

        if ((!locations || locations.length === 0) && !has_retried_references) {
          has_retried_references = true
          await new Promise((resolve) => setTimeout(resolve, 500))
          locations = await vscode.commands.executeCommand<vscode.Location[]>(
            'vscode.executeReferenceProvider',
            uri,
            position
          )
        }

        if (locations) {
          for (const loc of locations) {
            const file_path = loc.uri.fsPath
            if (params.ignore_paths.includes(file_path)) continue
            if (
              params.workspace_provider.get_workspace_root_for_file(
                file_path
              ) &&
              !params.workspace_provider.is_ignored_by_patterns(file_path)
            ) {
              if (!file_map.has(file_path)) {
                let imports = cached_imports.get(file_path)
                if (!imports) {
                  imports = await get_imports_for_uri(loc.uri, params.token)
                  cached_imports.set(file_path, imports)
                }

                if (imports.includes(uri.toString())) {
                  file_map.set(file_path, loc.range)
                }
              }
            }
          }
        }
      }
    } catch (err) {
      Logger.error({
        function_name: 'get_referencing_files_for_uris',
        message: `Error processing symbols for ${uri.fsPath}`,
        data: err
      })
    }

    params.progress.report({
      increment: (1 / params.uris.length) * 100
    })
  }

  return Array.from(file_map.entries()).map(([file_path, range]) => ({
    file_path,
    range
  }))
}
