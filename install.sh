#!/usr/bin/env bash
set -e

if ! command -v git &> /dev/null; then
  echo "Error: git is required but not installed."
  exit 1
fi

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

  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
  fi
  if type nvm >/dev/null 2>&1; then
    nvm install 22 >/dev/null 2>&1 && nvm use 22 >/dev/null 2>&1 && SWITCHED=true
  fi

  if [ "$SWITCHED" = false ] && command -v fnm &> /dev/null; then
    eval "$(fnm env)"
    fnm install 22 >/dev/null 2>&1 && fnm use 22 >/dev/null 2>&1 && SWITCHED=true
  fi

  if [ "$SWITCHED" = false ] && command -v n &> /dev/null; then
    n 22 >/dev/null 2>&1 && SWITCHED=true
  fi

  if [ "$SWITCHED" = false ]; then
    echo "Error: Failed to find a compatible Node.js version and no supported version manager (nvm, fnm, n) could switch it."
    exit 1
  fi
fi

declare -a AVAILABLE_EDITORS
declare -a EDITOR_CMDS
declare -a EDITOR_SCHEMES

check_editor() {
  if command -v "$2" >/dev/null 2>&1; then
    AVAILABLE_EDITORS+=("$1")
    EDITOR_CMDS+=("$2")
    EDITOR_SCHEMES+=("$3")
  fi
}

check_editor "VS Code" "code" "vscode"
check_editor "VS Code Insiders" "code-insiders" "vscode-insiders"
check_editor "VSCodium" "codium" "vscodium"
check_editor "Cursor" "cursor" "cursor"
check_editor "Antigravity" "agy-ide" "agy"

if [ ${#AVAILABLE_EDITORS[@]} -eq 0 ]; then
  echo "Error: No supported editors found in your PATH."
  exit 1
fi

TARGET_SCHEME="$1"
AUTO_CHOICE=""

if [ -n "$TARGET_SCHEME" ]; then
  for i in "${!EDITOR_SCHEMES[@]}"; do
    if [ "${EDITOR_SCHEMES[$i]}" = "$TARGET_SCHEME" ]; then
      AUTO_CHOICE=$((i + 1))
      break
    fi
  done
fi

if [ -n "$AUTO_CHOICE" ]; then
  choice="$AUTO_CHOICE"
else
  echo ""
  echo "Hint: If your editor is installed but not listed, you might need to add its command to your PATH."
  echo "Open your editor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P), and find a command like: \"Shell Command: Install 'cursor' command in PATH\" (or 'agy-ide', etc.)."

  echo ""
  for i in "${!AVAILABLE_EDITORS[@]}"; do
    echo "$((i+1))) ${AVAILABLE_EDITORS[$i]}"
  done
  if [ ${#AVAILABLE_EDITORS[@]} -gt 1 ]; then
    echo "a) All detected editors"
  fi
  echo "q) Quit"
  echo ""

  if [ -c /dev/tty ]; then
    read -p "Select where to install CWC to: " choice < /dev/tty
  else
    read -p "Select where to install CWC to: " choice
  fi

  if [[ "$choice" == "q" || "$choice" == "Q" ]]; then
    echo "Installation cancelled."
    exit 0
  elif [[ "$choice" == "a" || "$choice" == "A" ]]; then
    if [ ${#AVAILABLE_EDITORS[@]} -le 1 ]; then
      echo "Error: Invalid choice. Exiting."
      exit 1
    fi
  else
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#AVAILABLE_EDITORS[@]}" ]; then
      echo "Error: Invalid choice. Exiting."
      exit 1
    fi
  fi
fi

TMP_DIR=$(mktemp -d)

cleanup() {
  if [ -n "${SPINNER_PID:-}" ]; then
    kill "$SPINNER_PID" >/dev/null 2>&1 || true
    wait "$SPINNER_PID" 2>/dev/null || true
  fi
  tput cnorm 2>/dev/null || true
  rm -rf "$TMP_DIR" >/dev/null 2>&1
}
trap cleanup EXIT INT TERM

start_spinner() {
  tput civis 2>/dev/null || true
  local delay=0.1
  local spinstr='|/-\'
  while :; do
    local temp=${spinstr#?}
    printf "\r%c" "$spinstr"
    local spinstr=$temp${spinstr%"$temp"}
    sleep $delay
  done
}

stop_spinner() {
  local pid=$1
  local exit_code=$2
  SPINNER_PID=""
  kill "$pid" >/dev/null 2>&1 || true
  wait "$pid" 2>/dev/null || true
  tput cnorm 2>/dev/null || true
  if [ "$exit_code" -eq 0 ]; then
    printf "\r\033[32m\xE2\x9C\x94\033[0m\n"
  else
    printf "\r\033[31m\xE2\x9C\x98\033[0m\n"
  fi
}

echo ""

printf "  Cloning repository..."
start_spinner &
SPINNER_PID=$!
if ! git clone -b main -c core.longpaths=true --quiet https://github.com/robertpiosik/CodeWebChat.git "$TMP_DIR/source" > /dev/null 2>&1; then
  stop_spinner $SPINNER_PID 1
  exit 1
fi
stop_spinner $SPINNER_PID 0

EXTRACTED_DIR="$TMP_DIR/source"

cd "$EXTRACTED_DIR"

printf "  Installing dependencies..."
start_spinner &
SPINNER_PID=$!
if ! npx --yes pnpm install > /dev/null 2>&1; then
  stop_spinner $SPINNER_PID 1
  exit 1
fi
stop_spinner $SPINNER_PID 0

printf "  Building extension..."
start_spinner &
SPINNER_PID=$!
cd apps/editor
if ! npx --yes pnpm run build > /dev/null 2>&1; then
  stop_spinner $SPINNER_PID 1
  exit 1
fi
stop_spinner $SPINNER_PID 0

VSIX_FILE=$(ls *.vsix | head -n 1)

if [ -z "$VSIX_FILE" ]; then
  echo "Error: VSIX file was not generated."
  exit 1
fi

install_to_editor() {
  local idx=$1
  local editor_name="${AVAILABLE_EDITORS[$idx]}"
  local editor_cmd="${EDITOR_CMDS[$idx]}"
  
  printf "  Installing to %s..." "$editor_name"
  start_spinner &
  SPINNER_PID=$!
  
  if ! $editor_cmd --install-extension "$VSIX_FILE" --force > /dev/null 2>&1; then
    stop_spinner $SPINNER_PID 1
    echo ""
    echo "Error: Failed to install to $editor_name."
    return 1
  fi
  
  stop_spinner $SPINNER_PID 0
  
  echo ""
  if [ -n "$TARGET_SCHEME" ]; then
    echo "Updated successfully! Please restart the editor for changes to take effect."
  else
    echo "Successfully installed to $editor_name!"
  fi
}

if [[ "$choice" == "a" || "$choice" == "A" ]]; then
  for i in "${!AVAILABLE_EDITORS[@]}"; do
    install_to_editor $i
  done
else
  install_to_editor $((choice-1))
fi
