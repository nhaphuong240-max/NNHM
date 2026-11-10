#!/usr/bin/env bash
# Fresh Jest run plus the identity summary.
# Exit 0 only when Jest and the summary both pass.
# A failing summary still fails the run when Jest exits 0.
# Both failures are recorded and the process exits non-zero.
# Contract fixtures are ignored unless T02_CONTRACT=1, so CI cannot reuse them.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_ROOT="${T02_RESULT_ROOT:-$ROOT/.tools/t02-runs}"
mkdir -p "$RUN_ROOT"
RUN_ROOT="$(cd "$RUN_ROOT" && pwd)"
RUN_ID="${T02_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
RESULT_DIR="$RUN_ROOT/$RUN_ID"
if [ -e "$RESULT_DIR" ]; then
  echo "FAIL_CLOSED result directory already exists"
  exit 4
fi
mkdir "$RESULT_DIR"
RESULT_FILE="$RESULT_DIR/jest-result.json"
STARTED_MS="$(node -e 'process.stdout.write(String(Date.now()))')"
node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({startedAt:Number(process.argv[2]), resultDir:process.argv[3], resultFile:process.argv[4]}, null, 2));' \
  "$RESULT_DIR/run-meta.json" "$STARTED_MS" "$RESULT_DIR" "$RESULT_FILE"

cd "$ROOT/apps/api"
set +e
if [ "${T02_CONTRACT:-}" = "1" ] && [ -n "${T02_FAKE_JEST_EXIT:-}" ]; then
  jest_exit="$T02_FAKE_JEST_EXIT"
  if [ -n "${T02_FIXTURE_JSON:-}" ]; then
    cp "$T02_FIXTURE_JSON" "$RESULT_FILE"
  fi
else
  npm test -- --forceExit --silent --json --outputFile="$RESULT_FILE"
  jest_exit=$?
fi

SUMMARY_ARGS=(
  --result "$RESULT_FILE"
  --run-meta "$RESULT_DIR/run-meta.json"
  --report "$RESULT_DIR/summary-report.json"
  --jest-exit "$jest_exit"
)
if [ "${T02_CONTRACT:-}" = "1" ] && [ -n "${T02_WORK_INVENTORY:-}" ]; then
  SUMMARY_ARGS+=(--work-inventory "$T02_WORK_INVENTORY" --baseline-inventory "$T02_BASELINE_INVENTORY")
fi
if [ "${T02_CONTRACT:-}" = "1" ] && [ -n "${T02_EXPLANATION:-}" ]; then
  SUMMARY_ARGS+=(--explanation "$T02_EXPLANATION")
fi
node "$ROOT/scripts/t02-test-summary.js" "${SUMMARY_ARGS[@]}"
summary_exit=$?
set -e

if [ "$jest_exit" -eq 0 ] && [ "$summary_exit" -eq 0 ]; then
  jest_result="PASS"
  summary_result="PASS"
  wrapper_exit=0
else
  if [ "$jest_exit" -eq 0 ]; then jest_result="PASS"; else jest_result="FAIL"; fi
  if [ "$summary_exit" -eq 0 ]; then summary_result="PASS"; else summary_result="FAIL"; fi
  if [ "$jest_exit" -ne 0 ]; then wrapper_exit="$jest_exit"; else wrapper_exit="$summary_exit"; fi
fi

node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({resultDir:process.argv[2], jestExit:Number(process.argv[3]), summaryExit:Number(process.argv[4]), wrapperExit:Number(process.argv[5]), jestResult:process.argv[6], summaryResult:process.argv[7]}, null, 2));' \
  "$RESULT_DIR/wrapper-result.json" "$RESULT_DIR" "$jest_exit" "$summary_exit" "$wrapper_exit" "$jest_result" "$summary_result"
echo "result_dir=$RESULT_DIR"
echo "jest_exit=$jest_exit"
echo "summary_exit=$summary_exit"
echo "jest_result=$jest_result"
echo "summary_result=$summary_result"
echo "wrapper_exit=$wrapper_exit"
exit "$wrapper_exit"
