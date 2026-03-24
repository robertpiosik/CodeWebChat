import * as vscode from 'vscode'
import * as path from 'path'

export const get_imports_for_uri = async (
  document_uri: vscode.Uri
): Promise<string[]> => {
  const found_uris = new Set<string>()
  try {
    const document = await vscode.workspace.openTextDocument(document_uri)
    const text = document.getText()
    const lines = text.split('\n')
    const ext = path.extname(document_uri.fsPath).toLowerCase()

    let in_import_block = false
    const positions_to_check: vscode.Position[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (
        [
          '.ts',
          '.js',
          '.tsx',
          '.jsx',
          '.mjs',
          '.cjs',
          '.vue',
          '.svelte',
          '.astro'
        ].includes(ext)
      ) {
        if (/\b(import|export|require)\b/.test(line)) {
          in_import_block = true
        }

        if (in_import_block) {
          const import_keywords = new Set([
            'import',
            'export',
            'from',
            'as',
            'require',
            'type',
            'typeof',
            'default',
            'const',
            'let',
            'var',
            'function',
            'class',
            'interface',
            'enum'
          ])
          const identifier_matches = [
            ...line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g)
          ]
          for (const id_match of identifier_matches) {
            if (!import_keywords.has(id_match[1])) {
              positions_to_check.push(
                new vscode.Position(
                  i,
                  id_match.index! + Math.floor(id_match[1].length / 2)
                )
              )
            }
          }

          const matches = [...line.matchAll(/["']([^"']+)["']/g)]
          if (matches.length > 0) {
            for (const match of matches) {
              positions_to_check.push(new vscode.Position(i, match.index! + 1))
            }
            in_import_block = false
          } else if (
            !/\b(import|export|require)\b/.test(line) &&
            (/[;]/.test(line) ||
              /^\s*(const|let|var|class|function|interface|type|enum)\b/.test(
                line
              ))
          ) {
            in_import_block = false
          }
        }
      } else if (ext == '.py') {
        const from_match = line.match(/^\s*from\s+([a-zA-Z0-9_.]+)/)
        if (from_match) {
          const offset = line.indexOf(from_match[1], from_match.index)
          positions_to_check.push(
            new vscode.Position(
              i,
              offset + Math.floor(from_match[1].length / 2)
            )
          )
        }
        const import_match = line.match(/^\s*import\s+([a-zA-Z0-9_., ]+)/)
        if (import_match) {
          const group_offset = line.indexOf(import_match[1], import_match.index)
          const words = [...import_match[1].matchAll(/[a-zA-Z0-9_.]+/g)]
          for (const word of words) {
            const offset = group_offset + word.index!
            positions_to_check.push(
              new vscode.Position(i, offset + Math.floor(word[0].length / 2))
            )
          }
        }
      } else if (['.c', '.cpp', '.h', '.hpp', '.cc', '.cxx'].includes(ext)) {
        const inc_match = line.match(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/)
        if (inc_match) {
          const offset = line.indexOf(inc_match[1], inc_match.index)
          positions_to_check.push(
            new vscode.Position(i, offset + Math.floor(inc_match[1].length / 2))
          )
        }
      } else if (['.cs', '.java'].includes(ext)) {
        const regex =
          ext == '.cs'
            ? /^\s*using\s+([a-zA-Z0-9_.]+)\s*;/
            : /^\s*import\s+([a-zA-Z0-9_.*]+)\s*;/
        const match = line.match(regex)
        if (match) {
          const offset = line.indexOf(match[1], match.index)
          positions_to_check.push(
            new vscode.Position(i, offset + Math.floor(match[1].length / 2))
          )
        }
      } else if (ext == '.rs') {
        const match = line.match(/^\s*(?:use|mod)\s+([a-zA-Z0-9_:]+)/)
        if (match) {
          const offset = line.indexOf(match[1], match.index)
          positions_to_check.push(
            new vscode.Position(i, offset + Math.floor(match[1].length / 2))
          )
        }
      } else if (ext == '.go') {
        if (/^\s*import\s+\(/.test(line)) {
          in_import_block = true
        } else if (in_import_block && /\)/.test(line)) {
          in_import_block = false
        } else if (in_import_block || /^\s*import\s+/.test(line)) {
          const match = line.match(/"([^"]+)"/)
          if (match) {
            const offset = line.indexOf(match[1], match.index)
            positions_to_check.push(
              new vscode.Position(i, offset + Math.floor(match[1].length / 2))
            )
          }
        }
      } else if (ext == '.rb') {
        if (/^\s*require(?:_relative)?\b/.test(line)) {
          const match = line.match(/['"]([^'"]+)['"]/)
          if (match) {
            const offset = line.indexOf(match[1], match.index)
            positions_to_check.push(
              new vscode.Position(i, offset + Math.floor(match[1].length / 2))
            )
          }
        }
      } else if (ext == '.php') {
        if (
          /^\s*(?:include|require|include_once|require_once|use)\b/.test(line)
        ) {
          const str_match = line.match(/['"]([^'"]+)['"]/)
          if (str_match) {
            const offset = line.indexOf(str_match[1], str_match.index)
            positions_to_check.push(
              new vscode.Position(
                i,
                offset + Math.floor(str_match[1].length / 2)
              )
            )
          } else {
            const use_match = line.match(/^\s*use\s+([a-zA-Z0-9_\\]+)/)
            if (use_match) {
              const offset = line.indexOf(use_match[1], use_match.index)
              positions_to_check.push(
                new vscode.Position(
                  i,
                  offset + Math.floor(use_match[1].length / 2)
                )
              )
            }
          }
        }
      } else {
        let is_import_line = false

        if (
          /^\s*(?:#\s*)?(import|from|require|include|using|use)\b/.test(line)
        ) {
          is_import_line = true
          if (/[{(]/.test(line) && !/[})]/.test(line)) {
            in_import_block = true
          }
        } else if (in_import_block) {
          is_import_line = true
          if (/[})]/.test(line)) {
            in_import_block = false
          }
        } else if (/\b(from|require|import|include)\s*\(?["']/.test(line)) {
          is_import_line = true
        }

        if (is_import_line) {
          const matches = [...line.matchAll(/["']([^"']+)["']/g)]
          if (matches.length > 0) {
            for (const match of matches) {
              positions_to_check.push(new vscode.Position(i, match.index! + 1))
            }
          } else {
            const words = [...line.matchAll(/[\w./\\]+/g)]
            for (const word of words) {
              if (
                [
                  'import',
                  'from',
                  'require',
                  'include',
                  'using',
                  'use',
                  'as'
                ].includes(word[0])
              )
                continue
              positions_to_check.push(
                new vscode.Position(
                  i,
                  word.index! + Math.floor(word[0].length / 2)
                )
              )
            }
          }
        }
      }
    }

    for (const position of positions_to_check) {
      try {
        const definitions = await vscode.commands.executeCommand<
          vscode.Location[] | vscode.LocationLink[]
        >('vscode.executeDefinitionProvider', document.uri, position)
        if (definitions) {
          for (const def of definitions) {
            const uri = 'uri' in def ? def.uri : def.targetUri
            if (uri.scheme == 'file') found_uris.add(uri.toString())
          }
        }
      } catch {}
    }
  } catch {}
  return Array.from(found_uris)
}
