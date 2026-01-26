import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const home = os.homedir()

export interface AgentConfig {
  name: string
  display_name: string
  global_skills_dir: string
  detect_installed: () => boolean
}

export const agents: Record<string, AgentConfig> = {
  amp: {
    name: 'amp',
    display_name: 'Amp',
    global_skills_dir: path.join(home, '.config/agents/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.config/amp'))
  },
  antigravity: {
    name: 'antigravity',
    display_name: 'Antigravity',
    global_skills_dir: path.join(home, '.gemini/antigravity/skills'),
    detect_installed: () =>
      fs.existsSync(path.join(home, '.gemini/antigravity'))
  },
  'claude-code': {
    name: 'claude-code',
    display_name: 'Claude Code',
    global_skills_dir: path.join(home, '.claude/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.claude'))
  },
  clawdbot: {
    name: 'clawdbot',
    display_name: 'Clawdbot',
    global_skills_dir: path.join(home, '.clawdbot/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.clawdbot'))
  },
  cline: {
    name: 'cline',
    display_name: 'Cline',
    global_skills_dir: path.join(home, '.cline/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.cline'))
  },
  codex: {
    name: 'codex',
    display_name: 'Codex',
    global_skills_dir: path.join(home, '.codex/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.codex'))
  },
  'command-code': {
    name: 'command-code',
    display_name: 'Command Code',
    global_skills_dir: path.join(home, '.commandcode/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.commandcode'))
  },
  cursor: {
    name: 'cursor',
    display_name: 'Cursor',
    global_skills_dir: path.join(home, '.cursor/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.cursor'))
  },
  droid: {
    name: 'droid',
    display_name: 'Droid',
    global_skills_dir: path.join(home, '.factory/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.factory/skills'))
  },
  'gemini-cli': {
    name: 'gemini-cli',
    display_name: 'Gemini CLI',
    global_skills_dir: path.join(home, '.gemini/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.gemini'))
  },
  'github-copilot': {
    name: 'github-copilot',
    display_name: 'GitHub Copilot',
    global_skills_dir: path.join(home, '.copilot/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.copilot'))
  },
  goose: {
    name: 'goose',
    display_name: 'Goose',
    global_skills_dir: path.join(home, '.config/goose/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.config/goose'))
  },
  kilo: {
    name: 'kilo',
    display_name: 'Kilo Code',
    global_skills_dir: path.join(home, '.kilocode/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.kilocode'))
  },
  'kiro-cli': {
    name: 'kiro-cli',
    display_name: 'Kiro CLI',
    global_skills_dir: path.join(home, '.kiro/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.kiro'))
  },
  mcpjam: {
    name: 'mcpjam',
    display_name: 'MCPJam',
    global_skills_dir: path.join(home, '.mcpjam/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.mcpjam'))
  },
  opencode: {
    name: 'opencode',
    display_name: 'OpenCode',
    global_skills_dir: path.join(home, '.config/opencode/skills'),
    detect_installed: () =>
      fs.existsSync(path.join(home, '.config/opencode')) ||
      fs.existsSync(path.join(home, '.claude/skills'))
  },
  openhands: {
    name: 'openhands',
    display_name: 'OpenHands',
    global_skills_dir: path.join(home, '.openhands/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.openhands'))
  },
  pi: {
    name: 'pi',
    display_name: 'Pi',
    global_skills_dir: path.join(home, '.pi/agent/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.pi/agent'))
  },
  qoder: {
    name: 'qoder',
    display_name: 'Qoder',
    global_skills_dir: path.join(home, '.qoder/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.qoder'))
  },
  'qwen-code': {
    name: 'qwen-code',
    display_name: 'Qwen Code',
    global_skills_dir: path.join(home, '.qwen/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.qwen'))
  },
  roo: {
    name: 'roo',
    display_name: 'Roo Code',
    global_skills_dir: path.join(home, '.roo/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.roo'))
  },
  trae: {
    name: 'trae',
    display_name: 'Trae',
    global_skills_dir: path.join(home, '.trae/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.trae'))
  },
  windsurf: {
    name: 'windsurf',
    display_name: 'Windsurf',
    global_skills_dir: path.join(home, '.codeium/windsurf/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.codeium/windsurf'))
  },
  zencoder: {
    name: 'zencoder',
    display_name: 'Zencoder',
    global_skills_dir: path.join(home, '.zencoder/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.zencoder'))
  },
  neovate: {
    name: 'neovate',
    display_name: 'Neovate',
    global_skills_dir: path.join(home, '.neovate/skills'),
    detect_installed: () => fs.existsSync(path.join(home, '.neovate'))
  }
}

export type Skill = {
  name: string
  description: string
  path: string
}

export const parse_skill_md = (file_path: string): Skill | null => {
  try {
    const content = fs.readFileSync(file_path, 'utf-8')
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!match) return null
    const frontmatter = match[1]

    const name_match = frontmatter.match(/name:\s*(.*)/)
    const desc_match = frontmatter.match(/description:\s*(.*)/)

    if (!name_match || !desc_match) return null

    return {
      name: name_match[1].trim(),
      description: desc_match[1].trim(),
      path: path.dirname(file_path)
    }
  } catch {
    return null
  }
}

export const discover_skills = (dir: string): Skill[] => {
  const skills: Skill[] = []
  try {
    if (!fs.existsSync(dir)) return []
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const skill_dir = path.join(dir, entry.name)
        const skill_md = path.join(skill_dir, 'SKILL.md')
        if (fs.existsSync(skill_md)) {
          const skill = parse_skill_md(skill_md)
          if (skill) {
            skills.push(skill)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error discovering skills:', error)
  }
  return skills
}

const get_skill_lock = (): Record<string, { sourceUrl: string }> => {
  try {
    const lock_path = path.join(home, '.agents', '.skill-lock.json')
    if (fs.existsSync(lock_path)) {
      const content = fs.readFileSync(lock_path, 'utf-8')
      const json = JSON.parse(content)
      return json.skills || {}
    }
  } catch {}
  return {}
}

export const handle_skill_item = async (): Promise<
  string | 'continue' | undefined
> => {
  const detected_agents = Object.values(agents).filter(
    (agent) =>
      agent.detect_installed() &&
      discover_skills(agent.global_skills_dir).length > 0
  )

  if (detected_agents.length === 0) {
    vscode.window.showInformationMessage(
      'No supported coding agents with skills detected.'
    )
    return 'continue'
  }

  let last_selected_agent_label: string | undefined

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const agent_pick = vscode.window.createQuickPick()
    agent_pick.items = detected_agents.map((agent) => {
      const count = discover_skills(agent.global_skills_dir).length
      return {
        label: agent.display_name,
        description: `${count} skill${count == 1 ? '' : 's'}`
      }
    })

    if (last_selected_agent_label) {
      const active = agent_pick.items.find(
        (item) => item.label == last_selected_agent_label
      )
      if (active) {
        agent_pick.activeItems = [active]
      }
    }

    agent_pick.placeholder = 'Select an agent'
    agent_pick.title = 'Select Agent'
    agent_pick.buttons = [vscode.QuickInputButtons.Back]

    const selected_agent_item = await new Promise<
      vscode.QuickPickItem | 'back' | undefined
    >((resolve) => {
      let is_accepted = false
      let did_trigger_back = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        agent_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            agent_pick.hide()
            resolve('back')
          }
        }),
        agent_pick.onDidAccept(() => {
          is_accepted = true
          resolve(agent_pick.selectedItems[0])
          agent_pick.hide()
        }),
        agent_pick.onDidHide(() => {
          if (!is_accepted && !did_trigger_back) {
            resolve(undefined)
          }
          disposables.forEach((d) => d.dispose())
          agent_pick.dispose()
        })
      )
      agent_pick.show()
    })

    if (!selected_agent_item || selected_agent_item === 'back') {
      return 'continue'
    }

    last_selected_agent_label = selected_agent_item.label

    const agent = detected_agents.find(
      (a) => a.display_name === selected_agent_item.label
    )
    if (!agent) continue

    const skills = discover_skills(agent.global_skills_dir)

    if (skills.length === 0) {
      vscode.window.showInformationMessage(
        `No skills found for ${agent.display_name}.`
      )
      continue
    }

    const skill_lock = get_skill_lock()

    const skill_pick = vscode.window.createQuickPick()

    const open_source_button: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('link-external'),
      tooltip: 'View on skills.sh'
    }

    skill_pick.items = skills.map((skill) => {
      const lock_entry = skill_lock[skill.name]
      const source = lock_entry?.sourceUrl
        ? `${lock_entry.sourceUrl
            .replace('https://github.com/', '')
            .replace('.git', '')}`
        : 'local'

      const item: vscode.QuickPickItem = {
        label: skill.name,
        description: source,
        detail: skill.description
      }

      if (lock_entry?.sourceUrl) {
        item.buttons = [open_source_button]
      }

      return item
    })
    skill_pick.placeholder = 'Select a skill'
    skill_pick.title = `Skills of ${agent.display_name}`
    skill_pick.buttons = [vscode.QuickInputButtons.Back]
    skill_pick.ignoreFocusOut = true

    const selected_skill_item = await new Promise<
      vscode.QuickPickItem | 'back' | undefined
    >((resolve) => {
      let is_accepted = false
      let did_trigger_back = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        skill_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            skill_pick.hide()
            resolve('back')
          }
        }),
        skill_pick.onDidTriggerItemButton(async (e) => {
          if (e.button === open_source_button) {
            const skill_name = e.item.label
            const lock_entry = skill_lock[skill_name]
            if (lock_entry?.sourceUrl) {
              const match = lock_entry.sourceUrl.match(
                /[:/]([^/]+)\/([^/.]+)(?:\.git)?$/
              )
              if (match) {
                const user = match[1]
                const repo = match[2]
                const url = `https://skills.sh/${user}/${repo}/${skill_name}`
                await vscode.env.openExternal(vscode.Uri.parse(url))
              }
            }
          }
        }),
        skill_pick.onDidAccept(() => {
          is_accepted = true
          resolve(skill_pick.selectedItems[0])
          skill_pick.hide()
        }),
        skill_pick.onDidHide(() => {
          if (!is_accepted && !did_trigger_back) {
            resolve(undefined)
          }
          disposables.forEach((d) => d.dispose())
          skill_pick.dispose()
        })
      )
      skill_pick.show()
    })

    if (!selected_skill_item || selected_skill_item == 'back') {
      continue
    }

    const skill_name = selected_skill_item.label
    const lock_entry = skill_lock[skill_name]

    let repo_id = 'local'
    if (lock_entry?.sourceUrl) {
      const match = lock_entry.sourceUrl.match(
        /[:/]([^/]+)\/([^/.]+)(?:\.git)?$/
      )
      if (match) {
        repo_id = `${match[1]}:${match[2]}`
      }
    }

    return `#Skill(${agent.name}:${repo_id}:${skill_name})`
  }
}
