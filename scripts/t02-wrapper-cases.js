#!/usr/bin/env node
/**
 * Exit-policy cases for scripts/t02-api-test.sh.
 * Fixtures are Jest JSON documents. They do not replace the live suite.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { collect } = require('./t02-inventory');

const root = path.resolve(__dirname, '..');
const casesRoot = path.resolve(process.env.T02_CASES_ROOT || path.join(root, '.tools/t02-cases'));
const runsRoot = path.join(casesRoot, 'runs');
const fixtureRoot = path.join(casesRoot, 'fixtures');
fs.mkdirSync(fixtureRoot, { recursive: true });

const known = new Set(
  JSON.parse(fs.readFileSync(path.join(root, 'scripts/t02-test-baseline.json'), 'utf8')).knownFailingSuites,
);

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function suiteName(file) {
  return path.join(root, 'apps/api', file);
}

function buildResult(inventory, decide, after) {
  const testResults = [];
  let failed = 0;
  let passed = 0;
  let total = 0;
  for (const file of Object.keys(inventory.files).sort()) {
    const assertions = [];
    for (const test of inventory.files[file].tests) {
      if (test.mode === 'skip' || test.mode === 'todo') continue;
      const status = decide(test);
      if (status === 'omit') continue;
      total += 1;
      if (status === 'failed') failed += 1;
      else passed += 1;
      assertions.push({
        ancestorTitles: test.ancestors,
        fullName: test.fullName,
        title: test.title,
        status,
        failureMessages: [],
      });
    }
    testResults.push({
      name: suiteName(file),
      status: assertions.some((item) => item.status === 'failed') ? 'failed' : 'passed',
      assertionResults: assertions,
    });
  }
  const result = {
    success: failed === 0,
    wasInterrupted: false,
    numTotalTests: total,
    numFailedTests: failed,
    numPassedTests: passed,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults,
  };
  if (after) after(result);
  if (result.testResults.some((suite) => suite.status === 'failed')) result.success = false;
  return result;
}

function runWrapper(name, extra) {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR || '/tmp',
    LANG: process.env.LANG || 'C',
    T02_CONTRACT: '1',
    T02_RESULT_ROOT: runsRoot,
    T02_RUN_ID: name,
    ...extra,
  };
  const child = spawnSync('bash', [path.join(root, 'scripts/t02-api-test.sh')], {
    env,
    encoding: 'utf8',
  });
  fs.writeFileSync(path.join(casesRoot, `${name}.log`), `${child.stdout || ''}${child.stderr || ''}`);
  const resultDir = path.join(runsRoot, name);
  const wrapperPath = path.join(resultDir, 'wrapper-result.json');
  const summaryPath = path.join(resultDir, 'summary-report.json');
  return {
    name,
    processExit: child.status,
    wrapper: fs.existsSync(wrapperPath) ? JSON.parse(fs.readFileSync(wrapperPath, 'utf8')) : null,
    summary: fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : null,
  };
}

function expectCase(problems, actual, expected) {
  const errors = [];
  if (!actual.wrapper || !actual.summary) errors.push('missing wrapper or summary json');
  if (actual.processExit !== expected.processExit) {
    errors.push(`process ${actual.processExit} != ${expected.processExit}`);
  }
  if (actual.wrapper && actual.wrapper.jestExit !== expected.jestExit) {
    errors.push(`jest ${actual.wrapper.jestExit} != ${expected.jestExit}`);
  }
  if (actual.wrapper && actual.wrapper.summaryExit !== expected.summaryExit) {
    errors.push(`summary ${actual.wrapper.summaryExit} != ${expected.summaryExit}`);
  }
  if (expected.summaryResult && actual.summary && actual.summary.result !== expected.summaryResult) {
    errors.push(`summary result ${actual.summary.result} != ${expected.summaryResult}`);
  }
  if (expected.failClosed && actual.summary && actual.summary.failClosed !== expected.failClosed) {
    errors.push(`failClosed ${actual.summary && actual.summary.failClosed} != ${expected.failClosed}`);
  }
  if (expected.autoPassFalse && actual.summary && actual.summary.explanation && actual.summary.explanation.autoPass !== false) {
    errors.push('explanation autoPass is not false');
  }
  if (expected.autoPassFalse && actual.summary && actual.summary.result !== 'FAIL') {
    errors.push('explanation case returned PASS');
  }
  const row = {
    name: actual.name,
    processExit: actual.processExit,
    wrapper: actual.wrapper,
    summaryResult: actual.summary && actual.summary.result,
    summaryExit: actual.summary && actual.summary.exitCode,
    failClosed: actual.summary && actual.summary.failClosed,
    newFailures: actual.summary && actual.summary.newFailures && actual.summary.newFailures.length,
    baselineFailures: actual.summary && actual.summary.baselineFailures && actual.summary.baselineFailures.length,
    baselineNotRun: actual.summary && actual.summary.baselineNotRun && actual.summary.baselineNotRun.length,
    notRun: actual.summary && actual.summary.notRun && actual.summary.notRun.length,
    deletedTests: actual.summary && actual.summary.deletedTests && actual.summary.deletedTests.length,
    newSkips: actual.summary && actual.summary.newSkips && actual.summary.newSkips.length,
    preexistingSkips: actual.summary && actual.summary.preexistingSkips && actual.summary.preexistingSkips.length,
    focused: actual.summary && actual.summary.focused && actual.summary.focused.length,
    errors,
  };
  if (errors.length) problems.push({ name: actual.name, errors });
  return row;
}

const work = collect('worktree');
const head = collect('head');
writeJson(path.join(fixtureRoot, 'worktree-inventory.json'), work);
writeJson(path.join(fixtureRoot, 'head-inventory.json'), head);
const inventoryEnv = {
  T02_WORK_INVENTORY: path.join(fixtureRoot, 'worktree-inventory.json'),
  T02_BASELINE_INVENTORY: path.join(fixtureRoot, 'head-inventory.json'),
};

let omitted = false;
const passAll = buildResult(work, () => 'passed');
const passMissing = buildResult(work, (test) => {
  if (!omitted && test.file === 'src/database/schema-classify.spec.ts') {
    omitted = true;
    return 'omit';
  }
  return 'passed';
});
let flipped = false;
const oneNewFailure = buildResult(work, (test) => {
  if (!flipped && test.file === 'src/database/schema-classify.spec.ts') {
    flipped = true;
    return 'failed';
  }
  return 'passed';
});
const headTestIds = new Set();
for (const [file, info] of Object.entries(head.files)) {
  for (const test of info.tests || []) headTestIds.add(`${file}\0${test.fullName}`);
}
const knownFailures = buildResult(work, (test) =>
  known.has(test.file) && headTestIds.has(`${test.file}\0${test.fullName}`) ? 'failed' : 'passed',
);
const loadFailure = buildResult(work, () => 'passed', (result) => {
  const suite = result.testResults.find((item) => item.name.endsWith('src/modules/listing/listing.service.spec.ts'));
  suite.assertionResults = [];
  suite.status = 'failed';
  result.success = false;
});
writeJson(path.join(fixtureRoot, 'pass-all.json'), passAll);
writeJson(path.join(fixtureRoot, 'pass-missing.json'), passMissing);
writeJson(path.join(fixtureRoot, 'one-new-failure.json'), oneNewFailure);
writeJson(path.join(fixtureRoot, 'known-failures.json'), knownFailures);
writeJson(path.join(fixtureRoot, 'load-failure.json'), loadFailure);
fs.writeFileSync(path.join(fixtureRoot, 'corrupt.json'), '{\n');
writeJson(path.join(fixtureRoot, 'interrupted-flag.json'), {
  success: true,
  wasInterrupted: true,
  testResults: [],
});

const oldDir = path.join(casesRoot, 'old-report');
writeJson(path.join(oldDir, 'jest-result.json'), {
  success: true,
  wasInterrupted: false,
  numTotalTests: 1,
  testResults: [{
    name: suiteName('src/contract/old-report.spec.ts'),
    status: 'passed',
    assertionResults: [{ fullName: 'OLD REPORT MUST NOT BE READ', status: 'passed', title: 'OLD REPORT MUST NOT BE READ', ancestorTitles: [] }],
  }],
});

const sample = 'src/contract/sample.spec.ts';
function fixtureInventory(tests, focused) {
  return { source: 'fixture', files: { [sample]: { tests, focused: Boolean(focused) } }, unresolved: [], duplicates: [] };
}
function sampleTest(fullName, mode) {
  return { file: sample, fullName, title: fullName, ancestors: [], mode, line: 1 };
}
const renameBaseline = fixtureInventory([
  sampleTest('Sample keeps the original name', 'run'),
  sampleTest('Sample stays', 'run'),
]);
const renameWork = fixtureInventory([
  sampleTest('Sample uses a new name', 'run'),
  sampleTest('Sample stays', 'run'),
]);
writeJson(path.join(fixtureRoot, 'rename-baseline.json'), renameBaseline);
writeJson(path.join(fixtureRoot, 'rename-work.json'), renameWork);
const renameJest = {
  success: true,
  wasInterrupted: false,
  numTotalTests: 2,
  numFailedTests: 0,
  numPassedTests: 2,
  testResults: [{
    name: suiteName(sample),
    status: 'passed',
    assertionResults: [
      { fullName: 'Sample uses a new name', title: 'Sample uses a new name', ancestorTitles: [], status: 'passed', failureMessages: [] },
      { fullName: 'Sample stays', title: 'Sample stays', ancestorTitles: [], status: 'passed', failureMessages: [] },
    ],
  }],
};
writeJson(path.join(fixtureRoot, 'rename.json'), renameJest);
const explanation = path.join(fixtureRoot, 'rename-explanation.txt');
fs.writeFileSync(
  explanation,
  'Review the renamed test in src/contract/sample.spec.ts. Removed fullName: Sample keeps the original name.\n',
);
const renameEnv = {
  T02_WORK_INVENTORY: path.join(fixtureRoot, 'rename-work.json'),
  T02_BASELINE_INVENTORY: path.join(fixtureRoot, 'rename-baseline.json'),
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'rename.json'),
  T02_FAKE_JEST_EXIT: '0',
};

const skipFile = 'src/contract/skip.spec.ts';
function skipInventory(mode) {
  return {
    source: 'fixture',
    files: {
      [skipFile]: {
        focused: false,
        tests: [
          { file: skipFile, fullName: 'Skip sample is optional', title: 'is optional', ancestors: ['Skip sample'], mode, line: 1 },
          { file: skipFile, fullName: 'Skip sample still runs', title: 'still runs', ancestors: ['Skip sample'], mode: 'run', line: 2 },
        ],
      },
    },
    unresolved: [],
    duplicates: [],
  };
}
writeJson(path.join(fixtureRoot, 'skip-baseline-run.json'), skipInventory('run'));
writeJson(path.join(fixtureRoot, 'skip-work-skip.json'), skipInventory('skip'));
writeJson(path.join(fixtureRoot, 'skip-both-skip.json'), skipInventory('skip'));
const skipJest = {
  success: true,
  wasInterrupted: false,
  numTotalTests: 1,
  numFailedTests: 0,
  numPassedTests: 1,
  testResults: [{
    name: suiteName(skipFile),
    status: 'passed',
    assertionResults: [{
      fullName: 'Skip sample still runs',
      title: 'still runs',
      ancestorTitles: ['Skip sample'],
      status: 'passed',
      failureMessages: [],
    }],
  }],
};
writeJson(path.join(fixtureRoot, 'skip.json'), skipJest);

const focusBaseline = fixtureInventory([sampleTest('Sample focus target', 'run')]);
const focusWork = fixtureInventory([sampleTest('Sample focus target', 'only')], true);
writeJson(path.join(fixtureRoot, 'focus-baseline.json'), focusBaseline);
writeJson(path.join(fixtureRoot, 'focus-work.json'), focusWork);
writeJson(path.join(fixtureRoot, 'focus.json'), {
  success: true,
  wasInterrupted: false,
  numTotalTests: 1,
  numFailedTests: 0,
  numPassedTests: 1,
  testResults: [{
    name: suiteName(sample),
    status: 'passed',
    assertionResults: [{
      fullName: 'Sample focus target',
      title: 'Sample focus target',
      ancestorTitles: [],
      status: 'passed',
      failureMessages: [],
    }],
  }],
});

const problems = [];
const rows = [];

rows.push(expectCase(problems, runWrapper('jest-pass-summary-pass', {
  T02_FAKE_JEST_EXIT: '0',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'pass-all.json'),
}), { processExit: 0, jestExit: 0, summaryExit: 0, summaryResult: 'PASS' }));

rows.push(expectCase(problems, runWrapper('jest-fail-summary-pass', {
  ...inventoryEnv,
  T02_FAKE_JEST_EXIT: '1',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'known-failures.json'),
}), {
  processExit: 1,
  jestExit: 1,
  summaryExit: 4,
  summaryResult: 'FAIL',
  failClosed: 'jest exit disagrees with a passing jest json',
}));

rows.push(expectCase(problems, runWrapper('jest-pass-summary-fail', {
  ...inventoryEnv,
  T02_FAKE_JEST_EXIT: '0',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'pass-missing.json'),
}), { processExit: 3, jestExit: 0, summaryExit: 3, summaryResult: 'FAIL' }));

rows.push(expectCase(problems, runWrapper('jest-fail-summary-fail', {
  ...inventoryEnv,
  T02_FAKE_JEST_EXIT: '1',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'one-new-failure.json'),
}), { processExit: 1, jestExit: 1, summaryExit: 2, summaryResult: 'FAIL' }));

rows.push(expectCase(problems, runWrapper('known-suite-load-failure', {
  ...inventoryEnv,
  T02_FAKE_JEST_EXIT: '1',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'load-failure.json'),
}), { processExit: 1, jestExit: 1, summaryExit: 3, summaryResult: 'FAIL' }));

rows.push(expectCase(problems, runWrapper('corrupt-json', {
  T02_FAKE_JEST_EXIT: '0',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'corrupt.json'),
}), { processExit: 4, jestExit: 0, summaryExit: 4, failClosed: 'jest result is not valid json' }));

rows.push(expectCase(problems, runWrapper('interrupted-flag', {
  T02_FAKE_JEST_EXIT: '1',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'interrupted-flag.json'),
}), { processExit: 1, jestExit: 1, summaryExit: 4, failClosed: 'jest was interrupted' }));

const missing = runWrapper('interrupted-missing-json', { T02_FAKE_JEST_EXIT: '130' });
const missingText = JSON.stringify(missing.summary || {});
if (missingText.includes('OLD REPORT MUST NOT BE READ')) {
  problems.push({ name: 'interrupted-missing-json', errors: ['old report was read'] });
}
rows.push(expectCase(problems, missing, {
  processExit: 130,
  jestExit: 130,
  summaryExit: 4,
  failClosed: 'jest result missing',
}));

rows.push(expectCase(problems, runWrapper('rename-with-explanation', {
  ...renameEnv,
  T02_EXPLANATION: explanation,
}), { processExit: 3, jestExit: 0, summaryExit: 3, summaryResult: 'FAIL', autoPassFalse: true }));

rows.push(expectCase(problems, runWrapper('rename-without-explanation', renameEnv), {
  processExit: 3,
  jestExit: 0,
  summaryExit: 3,
  summaryResult: 'FAIL',
}));

rows.push(expectCase(problems, runWrapper('new-skip', {
  T02_FAKE_JEST_EXIT: '0',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'skip.json'),
  T02_WORK_INVENTORY: path.join(fixtureRoot, 'skip-work-skip.json'),
  T02_BASELINE_INVENTORY: path.join(fixtureRoot, 'skip-baseline-run.json'),
}), { processExit: 3, jestExit: 0, summaryExit: 3, summaryResult: 'FAIL' }));

rows.push(expectCase(problems, runWrapper('preexisting-skip', {
  T02_FAKE_JEST_EXIT: '0',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'skip.json'),
  T02_WORK_INVENTORY: path.join(fixtureRoot, 'skip-both-skip.json'),
  T02_BASELINE_INVENTORY: path.join(fixtureRoot, 'skip-both-skip.json'),
}), { processExit: 0, jestExit: 0, summaryExit: 0, summaryResult: 'PASS' }));

rows.push(expectCase(problems, runWrapper('focused-only', {
  T02_FAKE_JEST_EXIT: '0',
  T02_FIXTURE_JSON: path.join(fixtureRoot, 'focus.json'),
  T02_WORK_INVENTORY: path.join(fixtureRoot, 'focus-work.json'),
  T02_BASELINE_INVENTORY: path.join(fixtureRoot, 'focus-baseline.json'),
}), { processExit: 3, jestExit: 0, summaryExit: 3, summaryResult: 'FAIL' }));

const staleDir = path.join(casesRoot, 'stale');
fs.mkdirSync(staleDir, { recursive: true });
const staleResult = path.join(staleDir, 'jest-result.json');
const staleMeta = path.join(staleDir, 'run-meta.json');
writeJson(staleResult, passAll);
const startedAt = Date.now();
const oldSeconds = (startedAt - 10000) / 1000;
fs.utimesSync(staleResult, oldSeconds, oldSeconds);
writeJson(staleMeta, { startedAt, resultDir: staleDir, resultFile: staleResult });
const stale = spawnSync(process.execPath, [
  path.join(root, 'scripts/t02-test-summary.js'),
  '--result', staleResult,
  '--run-meta', staleMeta,
  '--report', path.join(staleDir, 'summary-report.json'),
  '--jest-exit', '0',
  '--work-inventory', path.join(fixtureRoot, 'worktree-inventory.json'),
  '--baseline-inventory', path.join(fixtureRoot, 'head-inventory.json'),
], { encoding: 'utf8' });
fs.writeFileSync(path.join(casesRoot, 'stale.log'), `${stale.stdout || ''}${stale.stderr || ''}`);
const staleSummary = JSON.parse(fs.readFileSync(path.join(staleDir, 'summary-report.json'), 'utf8'));
rows.push({
  name: 'stale-json',
  processExit: stale.status,
  summaryResult: staleSummary.result,
  failClosed: staleSummary.failClosed,
});
if (stale.status !== 4 || staleSummary.failClosed !== 'jest result is older than this run') {
  problems.push({ name: 'stale-json', errors: [`status ${stale.status} ${staleSummary.failClosed}`] });
}

const index = {
  result: problems.length ? 'FAIL' : 'PASS',
  cases: rows,
  problems,
};
writeJson(path.join(casesRoot, 'cases-index.json'), index);
console.log(JSON.stringify(index, null, 2));
process.exit(problems.length ? 1 : 0);
