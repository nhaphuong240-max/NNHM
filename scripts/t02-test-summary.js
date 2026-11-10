#!/usr/bin/env node
/**
 * Identity ratchet for one fresh Jest JSON result.
 * Counts are reported and are not an acceptance criterion.
 * An explanation file is printed for review and never turns a failure into PASS.
 */
const fs = require('fs');
const path = require('path');
const { collect, relSuite } = require('./t02-inventory');

const root = path.resolve(__dirname, '..');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function readJson(file) {
  const text = fs.readFileSync(file, 'utf8');
  return JSON.parse(text);
}

function keyOf(file, fullName) {
  return `${file}\0${fullName}`;
}

function indexInventory(inventory) {
  const tests = new Map();
  for (const [file, info] of Object.entries(inventory.files || {})) {
    for (const test of info.tests || []) tests.set(keyOf(file, test.fullName), { ...test, file });
  }
  return tests;
}

function writeReport(reportPath, report, lines) {
  report.stdout = lines;
  if (reportPath) fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

function finish(reportPath, report, lines, code) {
  report.result = code === 0 ? 'PASS' : 'FAIL';
  report.exitCode = code;
  lines.push(`SUMMARY_RESULT=${report.result}`);
  lines.push(`SUMMARY_EXIT=${code}`);
  writeReport(reportPath, report, lines);
  process.exit(code);
}

function loadInventory(file, source) {
  if (file) return readJson(file);
  return collect(source);
}

function main() {
  const lines = [];
  const reportPath = arg('--report');
  const report = {
    result: 'FAIL',
    exitCode: 4,
    failClosed: null,
    explanation: null,
    explanationAutoPass: false,
    countsAreNotAcceptance: true,
  };
  const resultPath = arg('--result');
  const metaPath = arg('--run-meta');
  if (!metaPath || !fs.existsSync(metaPath)) {
    report.failClosed = 'run metadata missing';
    return finish(reportPath, report, lines.concat('FAIL_CLOSED run metadata missing'), 4);
  }
  let meta;
  try {
    meta = readJson(metaPath);
  } catch (error) {
    report.failClosed = 'run metadata is not valid json';
    return finish(reportPath, report, lines.concat('FAIL_CLOSED run metadata is not valid json'), 4);
  }
  if (!resultPath || path.resolve(resultPath) !== path.resolve(meta.resultFile || '')) {
    report.failClosed = 'result path is not the file named by this run';
    return finish(reportPath, report, lines.concat('FAIL_CLOSED result path is not the file named by this run'), 4);
  }
  if (!fs.existsSync(resultPath)) {
    report.failClosed = 'jest result missing';
    return finish(reportPath, report, lines.concat('FAIL_CLOSED jest result missing'), 4);
  }
  const stat = fs.statSync(resultPath);
  if (!stat.isFile() || stat.mtimeMs + 1000 < Number(meta.startedAt || 0)) {
    report.failClosed = 'jest result is older than this run';
    return finish(reportPath, report, lines.concat('FAIL_CLOSED jest result is older than this run'), 4);
  }
  let result;
  try {
    result = readJson(resultPath);
  } catch (error) {
    report.failClosed = 'jest result is not valid json';
    return finish(reportPath, report, lines.concat('FAIL_CLOSED jest result is not valid json'), 4);
  }
  if (!result || !Array.isArray(result.testResults) || result.wasInterrupted === true) {
    report.failClosed = result && result.wasInterrupted ? 'jest was interrupted' : 'jest result has no testResults array';
    return finish(reportPath, report, lines.concat(`FAIL_CLOSED ${report.failClosed}`), 4);
  }

  let baselineInventory;
  let workInventory;
  try {
    baselineInventory = loadInventory(arg('--baseline-inventory'), 'head');
    workInventory = loadInventory(arg('--work-inventory'), 'worktree');
  } catch (error) {
    report.failClosed = `inventory could not be read: ${error.message}`;
    return finish(reportPath, report, lines.concat(`FAIL_CLOSED ${report.failClosed}`), 4);
  }
  if ((baselineInventory.unresolved || []).length || (workInventory.unresolved || []).length) {
    report.failClosed = 'a test title could not be identified from source';
    report.unresolved = (baselineInventory.unresolved || []).concat(workInventory.unresolved || []);
    return finish(reportPath, report, lines.concat('FAIL_CLOSED a test title could not be identified from source'), 4);
  }
  if ((baselineInventory.duplicates || []).length || (workInventory.duplicates || []).length) {
    report.failClosed = 'duplicate test fullName';
    report.duplicates = (baselineInventory.duplicates || []).concat(workInventory.duplicates || []);
    return finish(reportPath, report, lines.concat('FAIL_CLOSED duplicate test fullName'), 4);
  }

  const baselineDoc = JSON.parse(fs.readFileSync(path.join(__dirname, 't02-test-baseline.json'), 'utf8'));
  const known = new Set(baselineDoc.knownFailingSuites);
  const baselineTests = indexInventory(baselineInventory);
  const workTests = indexInventory(workInventory);
  const jestTests = new Map();
  const suites = new Map();
  const jestNames = new Map();
  for (const suite of result.testResults) {
    if (!suite || typeof suite.name !== 'string') {
      report.failClosed = 'jest suite is missing a name';
      return finish(reportPath, report, lines.concat('FAIL_CLOSED jest suite is missing a name'), 4);
    }
    const file = relSuite(suite.name);
    suites.set(file, suite);
    for (const assertion of suite.assertionResults || []) {
      if (!assertion || typeof assertion.fullName !== 'string') {
        report.failClosed = 'jest assertion is missing fullName';
        return finish(reportPath, report, lines.concat('FAIL_CLOSED jest assertion is missing fullName'), 4);
      }
      const id = keyOf(file, assertion.fullName);
      if (jestNames.has(id)) {
        report.failClosed = `duplicate jest fullName ${file} ${assertion.fullName}`;
        return finish(reportPath, report, lines.concat(`FAIL_CLOSED ${report.failClosed}`), 4);
      }
      jestNames.set(id, assertion);
      jestTests.set(id, assertion);
    }
  }

  const failedAssertions = [...jestTests.values()].some((test) => test.status === 'failed');
  const failedSuite = [...suites.values()].some((suite) => suite.status === 'failed');
  const jsonPassed = result.success === true && !failedAssertions && !failedSuite;
  const jestExit = arg('--jest-exit');
  if (jestExit !== '') {
    const code = Number(jestExit);
    if (code === 0 && !jsonPassed) {
      report.failClosed = 'jest exit 0 disagrees with the jest json';
      return finish(reportPath, report, lines.concat('FAIL_CLOSED jest exit 0 disagrees with the jest json'), 4);
    }
    if (code !== 0 && jsonPassed) {
      report.failClosed = 'jest exit disagrees with a passing jest json';
      return finish(reportPath, report, lines.concat('FAIL_CLOSED jest exit disagrees with a passing jest json'), 4);
    }
  }

  const deletedFiles = Object.keys(baselineInventory.files).filter((file) => !workInventory.files[file]).sort();
  const recordedReplacements = new Map(
    (Array.isArray(baselineDoc.replacedTests) ? baselineDoc.replacedTests : []).map((item) => [
      keyOf(item.file, item.removed),
      item,
    ]),
  );
  const deletedTests = [];
  const replacedTests = [];
  for (const [id, test] of baselineTests) {
    if (workTests.has(id)) continue;
    const replacement = recordedReplacements.get(id);
    const added = Array.isArray(replacement?.added) ? replacement.added : [];
    const reason = typeof replacement?.reason === 'string' ? replacement.reason.trim() : '';
    if (reason && added.length && added.every((name) => workTests.has(keyOf(test.file, name)))) {
      replacedTests.push({ file: test.file, fullName: test.fullName, reason, added });
      continue;
    }
    deletedTests.push({ file: test.file, fullName: test.fullName, line: test.line });
  }
  const addedTests = [];
  for (const [id, test] of workTests) {
    if (!baselineTests.has(id)) addedTests.push({ file: test.file, fullName: test.fullName, mode: test.mode });
  }
  const preexistingSkips = [];
  const newSkips = [];
  for (const [id, test] of workTests) {
    if (test.mode !== 'skip' && test.mode !== 'todo') continue;
    const previous = baselineTests.get(id);
    if (previous && (previous.mode === 'skip' || previous.mode === 'todo')) preexistingSkips.push(test);
    else newSkips.push({ file: test.file, fullName: test.fullName, mode: test.mode, reason: 'source skip/todo is new' });
  }
  const focused = [];
  for (const [file, info] of Object.entries(workInventory.files)) {
    if (info.focused) focused.push({ file, reason: 'focused test syntax' });
    for (const test of info.tests) {
      if (test.mode === 'only') focused.push({ file, fullName: test.fullName, reason: 'only' });
    }
  }

  const baselineFailures = [];
  const newFailures = [];
  const baselineNotRun = [];
  const notRun = [];
  const progressTests = [];
  for (const [id, test] of workTests) {
    if (test.mode === 'skip' || test.mode === 'todo') continue;
    const assertion = jestTests.get(id);
    const suite = suites.get(test.file);
    if (!assertion) {
      const loadFailure = suite && suite.status === 'failed' && (suite.assertionResults || []).length === 0;
      if (loadFailure && known.has(test.file) && baselineTests.has(id)) {
        baselineNotRun.push({ file: test.file, fullName: test.fullName, reason: 'known suite failed before its tests ran' });
      } else {
        notRun.push({ file: test.file, fullName: test.fullName });
      }
      continue;
    }
    if (assertion.status === 'failed') {
      const row = { file: test.file, fullName: test.fullName };
      if (known.has(test.file) && baselineTests.has(id)) baselineFailures.push(row);
      else newFailures.push(row);
    } else if (['pending', 'todo', 'skipped', 'disabled'].includes(assertion.status)) {
      newSkips.push({ file: test.file, fullName: test.fullName, mode: assertion.status, reason: 'jest did not run a source test' });
    } else if (assertion.status === 'passed' && known.has(test.file)) {
      progressTests.push({ file: test.file, fullName: test.fullName });
    }
  }

  const unmatchedJest = [];
  for (const [id, assertion] of jestTests) {
    if (workTests.has(id)) continue;
    const file = id.split('\0')[0];
    const fullName = id.slice(file.length + 1);
    unmatchedJest.push({ file, fullName, status: assertion.status });
    if (assertion.status === 'failed') newFailures.push({ file, fullName, reason: 'failed jest test is not in the source inventory' });
  }

  const missingSuites = [];
  const progressSuites = [];
  const baselineSuites = [];
  for (const file of known) {
    if (!workInventory.files[file]) continue;
    const suite = suites.get(file);
    if (!suite) {
      missingSuites.push(file);
      continue;
    }
    const assertions = suite.assertionResults || [];
    const anyFailed = assertions.some((test) => test.status === 'failed');
    if (suite.status === 'passed' && !anyFailed) progressSuites.push(file);
    else baselineSuites.push(file);
  }

  const explanationPath = arg('--explanation');
  if (explanationPath) {
    const text = fs.existsSync(explanationPath) ? fs.readFileSync(explanationPath, 'utf8') : '';
    const uncovered = deletedTests.filter((test) => !text.includes(test.file) || !text.includes(test.fullName));
    report.explanation = {
      path: explanationPath,
      present: fs.existsSync(explanationPath),
      coversDeletions: deletedTests.length > 0 && uncovered.length === 0,
      uncovered,
      autoPass: false,
    };
    lines.push('EXPLANATION does not change the result');
    if (report.explanation.present) lines.push(text.trim());
  }

  report.deletedFiles = deletedFiles;
  report.deletedTests = deletedTests;
  report.replacedTests = replacedTests;
  report.addedTests = addedTests;
  report.preexistingSkips = preexistingSkips.map((test) => ({ file: test.file, fullName: test.fullName, mode: test.mode }));
  report.newSkips = newSkips;
  report.focused = focused;
  report.baselineFailures = baselineFailures;
  report.newFailures = newFailures;
  report.baselineNotRun = baselineNotRun;
  report.notRun = notRun;
  report.progressSuites = progressSuites;
  report.progressTests = progressTests;
  report.baselineSuites = baselineSuites;
  report.missingSuites = missingSuites;
  report.unmatchedJest = unmatchedJest;
  report.counts = {
    baselineFiles: Object.keys(baselineInventory.files).length,
    workFiles: Object.keys(workInventory.files).length,
    baselineTests: baselineTests.size,
    workTests: workTests.size,
    jestAssertions: jestTests.size,
    numTotalTests: result.numTotalTests ?? null,
  };

  lines.push(`baselineFiles=${report.counts.baselineFiles} workFiles=${report.counts.workFiles}`);
  lines.push(`baselineTests=${report.counts.baselineTests} workTests=${report.counts.workTests} jestAssertions=${report.counts.jestAssertions}`);
  lines.push(`baselineFailures=${baselineFailures.length} newFailures=${newFailures.length} progressSuites=${progressSuites.length}`);
  lines.push(`baselineNotRun=${baselineNotRun.length} notRun=${notRun.length} preexistingSkips=${preexistingSkips.length} newSkips=${newSkips.length}`);
  lines.push(`deletedFiles=${deletedFiles.length} deletedTests=${deletedTests.length} replacedTests=${replacedTests.length} addedTests=${addedTests.length} focused=${focused.length}`);
  const list = (label, rows) => {
    if (!rows.length) return;
    lines.push(label);
    for (const row of rows) {
      if (typeof row === 'string') lines.push(row);
      else lines.push([row.file, row.fullName, row.mode, row.reason].filter(Boolean).join(' :: '));
    }
  };
  list('PROGRESS_SUITES', progressSuites);
  list('BASELINE_FAIL', baselineFailures);
  list('BASELINE_NOT_RUN', baselineNotRun);
  list('NEW_FAIL', newFailures);
  list('NOT_RUN', notRun);
  list('DELETED', deletedTests);
  list('REPLACED', replacedTests);
  list('NEW_SKIP', newSkips);
  list('PREEXISTING_SKIP', report.preexistingSkips);
  list('FOCUSED', focused);
  list('MISSING_SUITE', missingSuites);
  list('UNMATCHED_JEST', unmatchedJest);

  const identityProblem = deletedFiles.length || deletedTests.length || newSkips.length || focused.length
    || notRun.length || unmatchedJest.length || missingSuites.length;
  if (newFailures.length) return finish(reportPath, report, lines.concat('FAIL new test failure'), 2);
  if (identityProblem) return finish(reportPath, report, lines.concat('FAIL test identity regression'), 3);
  return finish(reportPath, report, lines.concat('PASS identity ratchet'), 0);
}

main();
