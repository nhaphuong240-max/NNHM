#!/usr/bin/env bash
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/t02-wrapper-cases.js"
