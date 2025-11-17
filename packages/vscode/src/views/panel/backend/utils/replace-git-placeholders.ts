import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { get_git_repository } from '@/utils/git-repository-utils';
import { WorkspaceProvider } from '@/context/providers/workspace-provider';
import { Logger } from '@shared/utils/logger';

const build_changes_xml = (
  diff: string,
  cwd: string,
  workspace_provider: WorkspaceProvider
): string => {
  // Split diff into per-file sections. Each section starts with 'diff --git '.
  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '');

  if (file_diffs.length == 0) {
    return '';
  }

  let changes_content = '';
  const checked_files = new Set(workspace_provider.get_checked_files());

  for (const file_diff_content of file_diffs) {
    const full_file_diff = 'diff --git ' + file_diff_content;
    const lines = full_file_diff.split('\n');
    const old_path_line = lines.find((l) => l.startsWith('--- a/'));
    const new_path_line = lines.find((l) => l.startsWith('+++ b/'));

    const old_path = old_path_line
      ? old_path_line.substring('--- a/'.length)
      : undefined;
    const new_path = new_path_line
      ? new_path_line.substring('+++ b/'.length)
      : undefined;

    let file_path: string | undefined;
    let is_deleted = false;

    if (new_path && new_path != '/dev/null') {
      file_path = new_path;
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path;
      if (new_path == '/dev/null') {
        is_deleted = true;
      }
    }

    if (file_path) {
      changes_content += `<change path="${file_path}">\n`;
      changes_content += `<diff>\n<![CDATA[\n${full_file_diff}\n]]>\n</diff>\n`;

      const absolute_path = path.join(cwd, file_path);
      if (checked_files.has(absolute_path)) {
        const workspace_root =
          workspace_provider.get_workspace_root_for_file(absolute_path);
        let display_path: string;
        if (workspace_root) {
          const relative_path = path
            .relative(workspace_root, absolute_path)
            .replace(/\\/g, '/');
          if (workspace_provider.getWorkspaceRoots().length > 1) {
            const workspace_name =
              workspace_provider.get_workspace_name(workspace_root);
            display_path = `${workspace_name}/${relative_path}`;
          } else {
            display_path = relative_path;
          }
        } else {
          display_path = file_path.replace(/\\/g, '/');
        }
        changes_content += `<file path="${display_path}" />\n`;
      } else {
        let file_content = '';
        if (!is_deleted) {
          try {
            file_content = fs.readFileSync(absolute_path, 'utf-8');
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
              Logger.error({
                function_name: 'build_changes_xml',
                message: `Could not read file for diff: ${absolute_path}`,
                data: e
              });
            }
          }
        }
        changes_content += `<file>\n<![CDATA[\n${file_content}\n]]>\n</file>\n`;
      }
      changes_content += `</change>\n`;
    }
  }

  if (changes_content) {
    return `\n<changes>\n${changes_content}</changes>\n`;
  }
  return '';
};

export const replace_changes_placeholder = async (params: {
  instruction: string;
  after_context?: boolean;
  workspace_provider: WorkspaceProvider;
}): Promise<string> => {
  const matches = params.instruction.match(
    /#Changes:([^\s,;:.!?]+(?:\/[^\s,;:.!?]+)?)/
  );
  if (!matches) {
    return params.instruction;
  }

  const branch_spec = matches[1];

  if (params.after_context) {
    return params.instruction.replace(
      new RegExp(`#Changes:${branch_spec}`, 'g'),
      '<changes/>'
    );
  }

  const multi_root_match = branch_spec.match(/^([^/]+)\/(.+)$/);

  if (multi_root_match) {
    const [, folder_name, branch_name] = multi_root_match;

    const workspace_folders = vscode.workspace.workspaceFolders;
    if (!workspace_folders) {
      vscode.window.showErrorMessage('No workspace folders found.');
      return params.instruction.replace(
        new RegExp(`#Changes:${branch_spec}`, 'g'),
        ''
      );
    }

    const target_folder = workspace_folders.find(
      (folder) => folder.name == folder_name
    );
    if (!target_folder) {
      vscode.window.showErrorMessage(
        `Workspace folder "${folder_name}" not found.`
      );
      return params.instruction.replace(
        new RegExp(`#Changes:${branch_spec}`, 'g'),
        ''
      );
    }

    try {
      // Get current branch name
      const current_branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: target_folder.uri.fsPath
      })
        .toString()
        .trim();

      // If comparing to same branch, use merge-base to show changes since branch point
      const diff_command =
        current_branch == branch_name
          ? `git diff $(git merge-base HEAD origin/${branch_name})`
          : `git diff ${branch_name}`;
      const diff = execSync(diff_command, {
        cwd: target_folder.uri.fsPath
      }).toString();

      if (!diff || diff.length == 0) {
        vscode.window.showInformationMessage(
          `No changes found between current branch and ${branch_name} in ${folder_name}.`
        );
        return params.instruction.replace(
          new RegExp(`#Changes:${branch_spec}`, 'g'),
          ''
        );
      }

      const replacement_text = build_changes_xml(
        diff,
        target_folder.uri.fsPath,
        params.workspace_provider
      );
      return params.instruction.replace(
        new RegExp(`#Changes:${branch_spec}`, 'g'),
        replacement_text
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get changes from branch ${branch_name} in ${folder_name}. Make sure the branch exists.`
      );
      Logger.error({
        function_name: 'replace_changes_placeholder',
        message: `Error getting diff from branch ${branch_name} in folder ${folder_name}`,
        data: error
      });
      return params.instruction.replace(
        new RegExp(`#Changes:${branch_spec}`, 'g'),
        ''
      );
    }
  } else {
    const branch_name = branch_spec;
    const repository = get_git_repository();
    if (!repository) {
      vscode.window.showErrorMessage('No Git repository found.');
      return params.instruction.replace(
        new RegExp(`#Changes:${branch_name}`, 'g'),
        ''
      );
    }

    try {
      // Get current branch name
      const current_branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repository.rootUri.fsPath
      })
        .toString()
        .trim();

      // If comparing to same branch, use merge-base to show changes since branch point
      const diff_command =
        current_branch == branch_name
          ? `git diff $(git merge-base HEAD origin/${branch_name})`
          : `git diff ${branch_name}`;
      const diff = execSync(diff_command, {
        cwd: repository.rootUri.fsPath
      }).toString();

      if (!diff || diff.length == 0) {
        vscode.window.showInformationMessage(
          `No changes found between current branch and ${branch_name}.`
        );
        return params.instruction.replace(
          new RegExp(`#Changes:${branch_name}`, 'g'),
          ''
        );
      }

      const replacement_text = build_changes_xml(
        diff,
        repository.rootUri.fsPath,
        params.workspace_provider
      );
      return params.instruction.replace(
        new RegExp(`#Changes:${branch_name}`, 'g'),
        replacement_text
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get changes from branch ${branch_name}. Make sure the branch exists.`
      );
      Logger.error({
        function_name: 'replace_changes_placeholder',
        message: `Error getting diff from branch ${branch_name}`,
        data: error
      });
      return params.instruction.replace(
        new RegExp(`#Changes:${branch_name}`, 'g'),
        ''
      );
    }
  }
};

const build_commit_changes_xml = (
  diff: string,
  cwd: string,
  commit_hash: string,
  commit_message?: string
): string => {
  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '');

  if (file_diffs.length == 0) {
    return '';
  }

  let changes_content = '';

  for (const file_diff_content of file_diffs) {
    const full_file_diff = 'diff --git ' + file_diff_content;
    const lines = full_file_diff.split('\n');
    const old_path_line = lines.find((l) => l.startsWith('--- a/'));
    const new_path_line = lines.find((l) => l.startsWith('+++ b/'));

    const old_path = old_path_line
      ? old_path_line.substring('--- a/'.length)
      : undefined;
    const new_path = new_path_line
      ? new_path_line.substring('+++ b/'.length)
      : undefined;

    let file_path: string | undefined;
    let is_deleted = false;

    if (new_path && new_path != '/dev/null') {
      file_path = new_path;
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path;
      if (new_path == '/dev/null') {
        is_deleted = true;
      }
    }

    if (file_path) {
      let file_content = '';
      if (!is_deleted) {
        try {
          file_content = execSync(`git show ${commit_hash}:"./${file_path}"`, {
            cwd,
            encoding: 'utf-8'
          });
        } catch (e) {
          Logger.error({
            function_name: 'build_commit_changes_xml',
            message: `Could not read file for diff from commit: ${file_path}`,
            data: e
          });
        }
      }

      changes_content += `<change path="${file_path}">\n`;
      changes_content += `<diff>\n<![CDATA[\n${full_file_diff}\n]]>\n</diff>\n`;
      changes_content += `<file>\n<![CDATA[\n${file_content}\n]]>\n</file>\n`;
      changes_content += `</change>\n`;
    }
  }

  if (changes_content) {
    const message_attribute = commit_message
      ? ` message="${commit_message.replace(/"/g, '&quot;')}"`
      : '';
    return `\n<commit${message_attribute}>\n<changes>\n${changes_content}</changes>\n</commit>\n`;
  }
  return '';
};

export const replace_commit_placeholder = async (params: {
  instruction: string;
  after_context?: boolean;
}): Promise<string> => {
  const regex = /#Commit:([^:]+):([a-fA-F0-9]+)\s*(?:"([^"]*)")?/g;
  if (params.after_context) {
    return params.instruction.replace(
      regex,
      (_match, _folder, _hash, message) => {
        const message_attr = message
          ? ` message="${message.replace(/"/g, '&quot;')}"`
          : '';
        return `<commit${message_attr}/>`;
      }
    );
  }

  let result_instruction = params.instruction;
  const matches = [...result_instruction.matchAll(regex)];

  const workspace_folders = vscode.workspace.workspaceFolders;
  if (!workspace_folders) {
    return result_instruction.replace(regex, '');
  }

  for (const match of matches) {
    const full_match = match[0];
    const folder_name = match[1];
    const commit_hash = match[2];
    const commit_message = match[3];

    const target_folder = workspace_folders.find(
      (folder) => folder.name === folder_name
    );
    if (!target_folder) {
      vscode.window.showErrorMessage(
        `Workspace folder "${folder_name}" not found.`
      );
      result_instruction = result_instruction.replace(full_match, '');
      continue;
    }

    try {
      const diff = execSync(`git show ${commit_hash}`, {
        cwd: target_folder.uri.fsPath,
        encoding: 'utf-8'
      }).toString();

      if (!diff || diff.length == 0) {
        vscode.window.showInformationMessage(
          `Commit ${commit_hash} seems empty.`
        );
        result_instruction = result_instruction.replace(full_match, '');
        continue;
      }

      const replacement_text = build_commit_changes_xml(
        diff,
        target_folder.uri.fsPath,
        commit_hash,
        commit_message
      );
      result_instruction = result_instruction.replace(
        full_match,
        replacement_text
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get diff for commit ${commit_hash}.`
      );
      Logger.error({
        function_name: 'replace_commit_placeholder',
        message: `Error getting diff for commit ${commit_hash}`,
        data: error
      });
      result_instruction = result_instruction.replace(full_match, '');
    }
  }
  return result_instruction;
};
