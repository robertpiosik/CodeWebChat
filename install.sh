#!/usr/bin/env bash
set -e

if ! command -v curl &> /dev/null; then
  echo "Error: curl is required but not installed."
  exit 1
fi

if ! command -v unzip &> /dev/null; then
  echo "Error: unzip is required but not installed."
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

  # Handle interactive prompt even if script is piped via curl | bash
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
trap '( rm -rf "$TMP_DIR" >/dev/null 2>&1 & )' EXIT

echo ""
echo "Fetching latest version info..."
PAGE=1
ZIP_URL=""

while [ $PAGE -le 10 ]; do
  TAGS_JSON=$(curl -s "https://api.github.com/repos/robertpiosik/CodeWebChat/tags?per_page=100&page=$PAGE")
  
  # Break if the page is empty or rate limited/not found
  if [[ "$TAGS_JSON" == *"\"message\":"* ]] || [[ "$TAGS_JSON" == "[]" ]] || [[ -z "$TAGS_JSON" ]]; then
    break
  fi

  TAG_NAME=$(echo "$TAGS_JSON" | grep -o '"name": *"[^"]*-vscode"' | head -n 1 | sed -e 's/"name": *"//' -e 's/"$//')
  ZIP_URL=$(echo "$TAGS_JSON" | grep -o '"zipball_url": *"[^"]*-vscode"' | head -n 1 | sed -e 's/"zipball_url": *"//' -e 's/"$//')
  
  if [ -n "$ZIP_URL" ]; then
    break
  fi
  
  PAGE=$((PAGE + 1))
done

if [ -z "$ZIP_URL" ]; then
  echo "Error: Could not find latest vscode tag."
  exit 1
fi

echo "Found: $TAG_NAME"
echo "Downloading source code..."
curl -sL "$ZIP_URL" -o "$TMP_DIR/source.zip"

echo "Extracting archive..."
unzip -q "$TMP_DIR/source.zip" -d "$TMP_DIR"

EXTRACTED_DIR=$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [ -z "$EXTRACTED_DIR" ]; then
  echo "Error: Extraction failed."
  exit 1
fi

cd "$EXTRACTED_DIR"

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
  $editor_cmd --install-extension "$VSIX_FILE" --force > /dev/null 2>&1
  
  if [ -n "$TARGET_SCHEME" ]; then
    echo "Updated successfully! Restart editor for changes to take effect."
  else
    echo "Successfully installed to $editor_name!"
  fi
}

echo ""
if [[ "$choice" == "a" || "$choice" == "A" ]]; then
  for i in "${!AVAILABLE_EDITORS[@]}"; do
    install_to_editor $i
  done
else
  install_to_editor $((choice-1))
fi
