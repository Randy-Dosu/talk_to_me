/**
 * CLI evaluation harness:  npm run eval
 *
 * Runs the labelled corpus through the shipping engine, prints a confusion
 * matrix, and writes `report.json` which the in-app Model Card imports. The
 * numbers in the app therefore always come from a real run, never from a
 * hand-typed table.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { analyse, ENGINE_VERSION, LEXICON_TAG } from '../analyze';
import { EVAL_CORPUS, KNOWN_DIFFICULTIES, type EvalCase } from './corpus';
import { computeMetrics, safetyReport, round } from './metrics';
import type { MoodBand, RiskLevel } from '../types';

const RISK_ORDER: RiskLevel[] = ['none', 'watch', 'elevated', 'urgent'];
const MOOD_ORDER: MoodBand[] = ['bright', 'steady', 'unsettled', 'heavy'];
const BAND_CENTRE: Record<MoodBand, number> = { bright: 85, steady: 63, unsettled: 45, heavy: 20 };

function predict(cases: EvalCase[]) {
  const out: { c: EvalCase; risk: RiskLevel; band: MoodBand; score: number }[] = [];
  for (let i = 0; i < 31; i += 1) {
    // Warm-up pass: V8/JIT noise should not be blamed on the engine.
    if (i === 0) for (const c of cases) analyse(c.text);
  }
  for (const c of cases) {
    const a = analyse(c.text, new Date('2026-01-01T09:00:00Z'));
    out.push({ c, risk: a.risk.level, band: a.moodBand, score: a.moodScore });
  }
  return out;
}

function summarise(cases: EvalCase[]) {
  const preds = predict(cases);
  const risk = computeMetrics(
    preds.map((p) => p.c.risk),
    preds.map((p) => p.risk),
    RISK_ORDER,
  );
  const mood = computeMetrics(
    preds.map((p) => p.c.mood),
    preds.map((p) => p.band),
    MOOD_ORDER,
  );
  const safety = safetyReport(
    preds.map((p) => p.c.risk),
    preds.map((p) => p.risk),
  );
  const mae =
    preds.reduce((acc, p) => acc + Math.abs(p.score - BAND_CENTRE[p.c.mood]), 0) / preds.length;

  const misses = safety.missedHighRisk.map((i) => ({
    id: preds[i].c.id,
    text: preds[i].c.text,
    truth: preds[i].c.risk,
    predicted: preds[i].risk,
  }));
  const alarms = safety.falseAlarms.map((i) => ({
    id: preds[i].c.id,
    text: preds[i].c.text,
    truth: preds[i].c.risk,
    predicted: preds[i].risk,
  }));

  return { risk, mood, safety, mae: round(mae), misses, alarms, n: cases.length };
}

function printBlock(title: string, m: ReturnType<typeof summarise>) {
  console.log(`\n=== ${title} (n=${m.n}) ===`);
  console.log(`risk  acc=${m.risk.accuracy}  macroF1=${m.risk.macroF1}`);
  console.log(`mood  acc=${m.mood.accuracy}  macroF1=${m.mood.macroF1}  bandMAE=${m.mae}`);
  console.log(`urgent recall=${m.safety.urgentRecall}  elevated+urgent recall=${m.safety.highRiskRecall}`);
  console.log('risk confusion (rows = truth):');
  console.log('          ' + RISK_ORDER.map((l) => l.padStart(9)).join(''));
  for (const t of RISK_ORDER) {
    console.log(t.padEnd(10) + RISK_ORDER.map((p) => String(m.risk.confusion[t]?.[p] ?? 0).padStart(9)).join(''));
  }
  console.log('mood confusion (rows = truth):');
  console.log('          ' + MOOD_ORDER.map((l) => l.padStart(10)).join(''));
  for (const t of MOOD_ORDER) {
    console.log(t.padEnd(10) + MOOD_ORDER.map((p) => String(m.mood.confusion[t]?.[p] ?? 0).padStart(10)).join(''));
  }
  if (m.misses.length) {
    console.log('MISSED HIGH-RISK CASES:');
    for (const miss of m.misses) console.log(`  ${miss.id} truth=${miss.truth} got=${miss.predicted} :: ${miss.text.slice(0, 90)}…`);
  }
  if (m.alarms.length) {
    console.log('FALSE ALARMS:');
    for (const a of m.alarms) console.log(`  ${a.id} truth=${a.truth} got=${a.predicted} :: ${a.text.slice(0, 90)}…`);
  }
}

const dev = EVAL_CORPUS.filter((c) => c.split === 'dev');
const test = EVAL_CORPUS.filter((c) => c.split === 'test');
const blind = EVAL_CORPUS.filter((c) => c.split === 'blind');
const gh = EVAL_CORPUS.filter((c) => c.context === 'gh');

const devResult = summarise(dev);
const testResult = summarise(test);
const blindResult = blind.length ? summarise(blind) : null;
const allResult = summarise(EVAL_CORPUS);
const ghResult = summarise(gh);

printBlock('DEV split (rules were tuned against this)', devResult);
printBlock('TEST split (held out from tuning)', testResult);
if (blindResult) printBlock('BLIND split (written after tuning, run once)', blindResult);
printBlock('ALL cases', allResult);
printBlock('Ghanaian English / Pidgin subset', ghResult);

const report = {
  generatedAt: new Date().toISOString(),
  engineVersion: ENGINE_VERSION,
  lexiconVersion: LEXICON_TAG,
  note:
    'In-house evaluation on hand-written cases by the builders of the engine. Rules were iterated on the dev split only. These numbers are a sanity check on the pipeline — they are not clinical validation and must not be presented as diagnostic accuracy.',
  blindDisclosure:
    'The blind split was written after tuning and run once. On that first, genuinely blind run: urgent recall 33% (1 of 3), elevated+urgent recall 60% (3 of 5), risk accuracy 69%, mood accuracy 56%. Two urgent gaps (ongoing self-harm phrasing, stockpiling plus concealed planning) and one elevated gap ("sleep and never wake up") were then fixed. Those fixes were made after seeing blind errors, so the current blind numbers are no longer an unbiased estimate; they are reported for completeness and the first-run figures above are the honest ones.',
  corpus: {
    total: EVAL_CORPUS.length,
    dev: dev.length,
    test: test.length,
    blind: blind.length,
    ghanaianSubset: gh.length,
  },
  dev: devResult,
  test: testResult,
  blind: blindResult,
  all: allResult,
  ghanaian: ghResult,
  knownDifficulties: KNOWN_DIFFICULTIES,
};

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, 'report.json');
writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote ${target}`);
