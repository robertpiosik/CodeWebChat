#!/usr/bin/env bash
set -e

# Check required dependencies
for cmd in git node pnpm; do
  if ! command -v $cmd &> /dev/null; then
    echo "Error: $cmd is required but not installed."
    exit 1
  fi
done

# Validate Node.js version
NODE_MAJOR_VERSION=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR_VERSION" -lt 20 ]; then
  echo "Error: Node.js version 20 or higher is required (Node.js 22.x is recommended)."
  exit 1
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
check_editor "Windsurf" "windsurf"

if [ ${#AVAILABLE_EDITORS[@]} -eq 0 ]; then
  echo "Error: No supported editors found in your PATH."
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
pnpm install > /dev/null 2>&1

echo "Building extension..."
cd apps/editor
pnpm run build > /dev/null 2>&1

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
