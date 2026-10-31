#!/usr/bin/env bash
set -e

# Check git first
if ! command -v git &> /dev/null; then
  echo "Error: git is required but not installed."
  exit 1
fi

# Validate Node.js version and attempt to switch if necessary
check_node_version() {
  if ! command -v node &> /dev/null; then return 1; fi
  local version
  version=$(node -v | sed 's/^v//' | cut -d. -f1)
  [ "$version" -ge 20 ]
}

if ! check_node_version; then
  echo "Node.js version 20 or higher is required (Node.js 22.x is recommended)."
  echo "Attempting to switch to Node.js 22 using a version manager..."
  
  SWITCHED=false

  # Try nvm
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
  fi
  if type nvm >/dev/null 2>&1; then
    nvm install 22 && nvm use 22 && SWITCHED=true
  fi

  # Try fnm
  if [ "$SWITCHED" = false ] && command -v fnm &> /dev/null; then
    eval "$(fnm env)"
    fnm install 22 && fnm use 22 && SWITCHED=true
  fi

  # Try n
  if [ "$SWITCHED" = false ] && command -v n &> /dev/null; then
    n 22 && SWITCHED=true
  fi

  if [ "$SWITCHED" = false ]; then
    echo "Error: Failed to find a compatible Node.js version and no supported version manager (nvm, fnm, n) could switch it."
    exit 1
  fi
fi

# Detect available editors in the system
declare -a AVAILABLE_EDITORS
declare -a EDITOR_CMDS

check_editor() {
  if command -v "$2" >/dev/null 2>&1; then
    AVAILABLE_EDITORS+=("$1")
    EDITOR_CMDS+=("$2")
  fi
}

check_editor "VS Code" "code"
check_editor "VS Code Insiders" "code-insiders"
check_editor "VSCodium" "codium"
check_editor "Cursor" "cursor"
check_editor "Antigravity" "agy-ide"

if [ ${#AVAILABLE_EDITORS[@]} -eq 0 ]; then
  echo "Error: No supported editors found in your PATH."
  echo "Hint: If your editor is installed, you might need to add its command to your PATH."
  echo "Open your editor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P), and run a command like: \"Shell Command: Install 'cursor' command in PATH\" (or 'agy-ide' etc.)."
  exit 1
fi

echo "Detected editors:"
for i in "${!AVAILABLE_EDITORS[@]}"; do
  echo "$((i+1))) ${AVAILABLE_EDITORS[$i]}"
done
echo "a) All detected editors"
echo "q) Quit"
echo ""

# Handle interactive prompt even if script is piped via curl | bash
if [ -c /dev/tty ]; then
  read -p "Select editor(s) to install CWC to: " choice < /dev/tty
else
  read -p "Select editor(s) to install CWC to: " choice
fi

if [[ "$choice" == "q" || "$choice" == "Q" ]]; then
  echo "Installation cancelled."
  exit 0
elif [[ "$choice" != "a" && "$choice" != "A" ]]; then
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#AVAILABLE_EDITORS[@]}" ]; then
    echo "Invalid choice. Exiting."
    exit 1
  fi
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
echo ""
echo "Cloning repository into temporary directory..."
git clone -q --depth 1 https://github.com/robertpiosik/CodeWebChat.git "$TMP_DIR"
cd "$TMP_DIR"
REPO_DIR="$TMP_DIR"

echo "Installing dependencies..."
npx --yes pnpm install > /dev/null 2>&1

echo "Building extension..."
cd apps/editor
npx --yes pnpm run build > /dev/null 2>&1

VSIX_FILE=$(ls *.vsix | head -n 1)

if [ -z "$VSIX_FILE" ]; then
  echo "Error: VSIX file was not generated."
  exit 1
fi

install_to_editor() {
  local idx=$1
  local editor_name="${AVAILABLE_EDITORS[$idx]}"
  local editor_cmd="${EDITOR_CMDS[$idx]}"
  echo "Installing to $editor_name..."
  $editor_cmd --install-extension "$VSIX_FILE" --force > /dev/null 2>&1
}

if [[ "$choice" == "a" || "$choice" == "A" ]]; then
  for i in "${!AVAILABLE_EDITORS[@]}"; do
    install_to_editor $i
  done
else
  install_to_editor $((choice-1))
fi

echo ""
echo "Done!"
