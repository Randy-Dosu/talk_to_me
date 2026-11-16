/**
 * Performance check on real input: npm run bench
 *
 * Times the shipping analysis engine and the dynamic question builder against
 * the labelled corpus (82 real sentences, mixed English/Pidgin), then reports
 * the JavaScript actually shipped in dist/. Numbers are written to bench.json
 * so a regression is visible in git.
 */

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse } from '../analyze';
import { questionFor } from '../../data/prompts';
import type { JournalEntry } from '../types';
import { EVAL_CORPUS } from './corpus';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../');

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function measure(label: string, iterations: number, run: (i: number) => void) {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    run(i);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const result = {
    label,
    iterations,
    totalMs: Number(total.toFixed(1)),
    opsPerSecond: Math.round((iterations / total) * 1000),
    meanMs: Number((total / iterations).toFixed(3)),
    p50Ms: Number(percentile(samples, 50).toFixed(3)),
    p95Ms: Number(percentile(samples, 95).toFixed(3)),
    maxMs: Number(samples[samples.length - 1].toFixed(3)),
  };
  console.log(
    `${label.padEnd(34)} ${String(result.opsPerSecond).padStart(7)} ops/s  p50 ${result.p50Ms} ms  p95 ${result.p95Ms} ms  max ${result.maxMs} ms`,
  );
  return result;
}

const texts = EVAL_CORPUS.map((c) => c.text);

// Warm up, then run every case several times.
for (let i = 0; i < 200; i += 1) analyse(texts[i % texts.length]);

const analysis = measure('analyse() per entry', 2000, (i) => {
  analyse(texts[i % texts.length], new Date('2026-11-05T20:00:00Z'));
});

const entries: JournalEntry[] = EVAL_CORPUS.slice(0, 12).map((c, index) => ({
  id: `bench-${index}`,
  createdAt: new Date(Date.now() - index * 86_400_000).toISOString(),
  text: c.text,
  source: 'typed',
  analysis: analyse(c.text),
}));

const questions = measure('questionFor() per prompt', 20_000, (i) => {
  questionFor({ kind: i % 2 === 0 ? 'evening' : 'morning', entries, now: new Date('2026-11-05T20:00:00Z') });
});

const distinct = new Set<string>();
for (let i = 0; i < 500; i += 1) {
  distinct.add(questionFor({ kind: 'evening', entries, now: new Date(2026, 10, 1 + (i % 28), 7 + (i % 12)) }));
}

function dirSize(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const target = path.join(dir, name);
    const stats = statSync(target);
    if (stats.isDirectory()) {
      const inner = dirSize(target);
      files += inner.files;
      bytes += inner.bytes;
    } else {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}

let bundle = { files: 0, bytes: 0 };
try {
  bundle = dirSize(path.join(root, 'dist'));
} catch {
  console.warn('dist/ not built yet — skipping bundle size');
}

console.log(`\nCorpus: ${EVAL_CORPUS.length} labelled entries, ${new Set(texts.map((t) => analyse(t).moodBand)).size} mood bands represented`);
console.log(`Distinct questions across 500 prompts: ${distinct.size}`);
console.log(`Shipped dist/: ${bundle.files} files, ${(bundle.bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap used: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`);

writeFileSync(
  path.join(here, 'bench.json'),
  `${JSON.stringify(
    { generatedAt: new Date().toISOString(), corpus: EVAL_CORPUS.length, analysis, questions, distinctQuestions: distinct.size, bundle },
    null,
    2,
  )}\n`,
);
console.log('Wrote bench.json');
