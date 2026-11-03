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

try_nvm() { type nvm >/dev/null 2>&1 && nvm install 22 && nvm use 22; }
try_fnm() { command -v fnm >/dev/null 2>&1 && eval "$(fnm env)" && fnm install 22 && fnm use 22; }
try_n()   { command -v n >/dev/null 2>&1 && n 22; }

if ! check_node_version; then
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  if ! { try_nvm || try_fnm || try_n; } >/dev/null 2>&1; then
    echo "Error: Failed to find a compatible Node.js version and no supported version manager (nvm, fnm, n) could switch it."
    exit 1
  fi
fi

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
choice=""

if [ -n "$TARGET_SCHEME" ]; then
  for i in "${!EDITOR_SCHEMES[@]}"; do
    if [ "${EDITOR_SCHEMES[$i]}" = "$TARGET_SCHEME" ]; then
      choice=$((i + 1))
      break
    fi
  done
fi

invalid_choice() { echo "Error: Invalid choice. Exiting."; exit 1; }

if [ -z "$choice" ]; then
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

  case "$choice" in
    q|Q) echo "Installation cancelled."; exit 0 ;;
    a|A) [ ${#AVAILABLE_EDITORS[@]} -gt 1 ] || invalid_choice ;;
    ''|*[!0-9]*) invalid_choice ;;
    *) [ "$choice" -ge 1 ] && [ "$choice" -le ${#AVAILABLE_EDITORS[@]} ] || invalid_choice ;;
  esac
fi

ORIGINAL_DIR="$(pwd)"

kill_spinner() {
  if [ -n "${SPINNER_PID:-}" ]; then
    kill "$SPINNER_PID" >/dev/null 2>&1 || true
    wait "$SPINNER_PID" 2>/dev/null || true
    SPINNER_PID=""
  fi
  tput cnorm 2>/dev/null || true
}

cleanup() {
  kill_spinner
}
trap cleanup EXIT INT TERM

start_spinner() {
  tput civis 2>/dev/null || true
  local delay=0.1
  local spinstr='|/-\'
  while :; do
    printf "\r%c" "$spinstr"
    spinstr="${spinstr:1}${spinstr:0:1}"
    sleep $delay
  done
}

stop_spinner() {
  local exit_code=$1
  kill_spinner
  if [ "$exit_code" -eq 0 ]; then
    printf "\r\033[32m\xE2\x9C\x94\033[0m\n"
  else
    printf "\r\033[31m\xE2\x9C\x98\033[0m\n"
  fi
}

run_step() {
  local msg="$1"; shift
  printf "  %s..." "$msg"
  start_spinner &
  SPINNER_PID=$!
  if "$@" > /dev/null 2>&1 < /dev/null; then
    stop_spinner 0
  else
    stop_spinner 1
    return 1
  fi
}

echo ""

CWC_DIR="$HOME/.cwc"
REPO_DIR="$CWC_DIR/repository"

mkdir -p -m 700 "$CWC_DIR"
chmod 700 "$CWC_DIR" 2>/dev/null || true

update_repo() {
  git -C "$REPO_DIR" fetch origin main --quiet && \
  git -C "$REPO_DIR" reset --hard FETCH_HEAD --quiet && \
  git -C "$REPO_DIR" clean -fd --quiet
}

clone_repo() {
  git clone -b main -c core.longpaths=true --quiet https://github.com/CodeWebChat/CWC.git "$REPO_DIR"
}

if [ -d "$REPO_DIR/.git" ] && run_step "Updating repository" update_repo; then
  :
else
  rm -rf "$REPO_DIR"
  run_step "Cloning repository" clone_repo
fi

cd "$REPO_DIR"

run_step "Installing dependencies" npx --yes pnpm install

cd apps/editor

rm -f ./*.vsix

run_step "Building extension" npx --yes pnpm run build

vsix_files=(*.vsix)
VSIX_FILE="${vsix_files[0]}"

if [ ! -f "$VSIX_FILE" ]; then
  echo "Error: VSIX file was not generated."
  exit 1
fi

install_to_editor() {
  local idx=$1
  local editor_name="${AVAILABLE_EDITORS[$idx]}"
  local editor_cmd="${EDITOR_CMDS[$idx]}"

  if ! run_step "Installing to $editor_name" "$editor_cmd" --install-extension "$VSIX_FILE" --force; then
    echo ""
    echo "Error: Failed to install to $editor_name."
    return 1
  fi

  echo ""
  if [ -n "$TARGET_SCHEME" ]; then
    echo "Updated successfully! Please restart the editor for changes to take effect."
  else
    echo "Successfully installed to $editor_name!"
  fi
}

if [[ "$choice" == [aA] ]]; then
  indices=("${!AVAILABLE_EDITORS[@]}")
else
  indices=($((choice-1)))
fi
for i in "${indices[@]}"; do install_to_editor "$i"; done

cd "$ORIGINAL_DIR" || cd /
