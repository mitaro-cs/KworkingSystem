#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-5000}"
HOST="${HOST:-127.0.0.1}"
APP_URL="http://${HOST}:${PORT}"
PUBLIC_URL="${PUBLIC_URL:-$APP_URL}"
VENV_DIR=".venv_macos"

echo
echo "Campus Coworking"
echo "================="
echo "Directory: $(pwd)"
echo "URL:       ${APP_URL}"
echo

if [ -z "${COWORKING_ADMIN_EMAIL:-}" ] && [ -z "${ADMIN_EMAIL:-}" ] && [ "${SKIP_ADMIN_PROMPT:-0}" != "1" ] && [ -t 0 ]; then
    read -r -p "Service admin email (Enter to keep saved): " ADMIN_INPUT
    if [ -n "${ADMIN_INPUT}" ]; then
        export COWORKING_ADMIN_EMAIL="${ADMIN_INPUT}"
    fi
fi

if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
else
    echo "Python 3 was not found. Install Python 3.10+ and run this file again."
    exit 1
fi

if [ ! -x "${VENV_DIR}/bin/python" ]; then
    echo "Creating virtual environment..."
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

echo "Installing dependencies..."
"${VENV_DIR}/bin/python" -m pip install --upgrade pip
"${VENV_DIR}/bin/python" -m pip install -r requirements.txt

if [ "${NO_BROWSER:-0}" != "1" ] && command -v open >/dev/null 2>&1; then
    (sleep 2 && open "${APP_URL}") >/dev/null 2>&1 &
fi

echo "Starting server. Press Ctrl+C to stop."
echo
export HOST PORT PUBLIC_URL
exec "${VENV_DIR}/bin/python" main.py
