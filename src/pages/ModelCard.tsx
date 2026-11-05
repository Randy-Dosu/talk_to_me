import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, ArrowRight, CheckCircle2, FlaskConical, Info, Scale, ShieldAlert } from 'lucide-react';
import reportJson from '../engine/eval/report.json';
import { RISK_PATTERNS } from '../engine/lexicon';
import { SectionHeading } from '../components/ui';

interface ClassMetric {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}
interface Metrics {
  n: number;
  accuracy: number;
  macroF1: number;
  perClass: Record<string, ClassMetric>;
  confusion: Record<string, Record<string, number>>;
  labels: string[];
}
interface SplitResult {
  n: number;
  risk: Metrics;
  mood: Metrics;
  safety: { urgentRecall: number; highRiskRecall: number; missedHighRisk: number[]; falseAlarms: number[] };
  mae: number;
  misses: { id: string; text: string; truth: string; predicted: string }[];
  alarms: { id: string; text: string; truth: string; predicted: string }[];
}
interface Report {
  generatedAt: string;
  engineVersion: string;
  lexiconVersion: string;
  note: string;
  corpus: { total: number; dev: number; test: number; blind?: number; ghanaianSubset: number };
  blindDisclosure?: string;
  dev: SplitResult;
  test: SplitResult;
  blind?: SplitResult | null;
  all: SplitResult;
  ghanaian: SplitResult;
  knownDifficulties: { id: string; label: string; detail: string }[];
}

const report = reportJson as unknown as Report;
const RISK_LABELS = ['none', 'watch', 'elevated', 'urgent'];
const MOOD_LABELS = ['bright', 'steady', 'unsettled', 'heavy'];

function Confusion({ metrics, labels, title }: { metrics: Metrics; labels: string[]; title: string }) {
  const max = Math.max(
    1,
    ...labels.flatMap((t) => labels.map((p) => metrics.confusion[t]?.[p] ?? 0)),
  );
  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">{title}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-[0.72rem]">
          <thead>
            <tr>
              <th className="p-1 text-left font-normal text-ink-muted">truth ↓ / got →</th>
              {labels.map((label) => (
                <th key={label} className="p-1 text-center font-medium text-ink-soft">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((t) => (
              <tr key={t}>
                <td className="p-1 text-ink-soft">{t}</td>
                {labels.map((p) => {
                  const value = metrics.confusion[t]?.[p] ?? 0;
                  const strong = value / max;
                  return (
                    <td key={p} className="p-1">
                      <div
                        className={clsx(
                          'rounded-md py-1 text-center tabular-nums',
                          t === p ? 'font-semibold text-forest' : 'text-ink-soft',
                        )}
                        style={{ backgroundColor: value === 0 ? 'transparent' : `rgba(31, 75, 63, ${0.06 + strong * 0.3})` }}
                      >
                        {value}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassTable({ metrics }: { metrics: Metrics }) {
  return (
    <table className="w-full border-collapse text-[0.74rem]">
      <thead>
        <tr className="text-left text-ink-muted">
          <th className="py-1.5 pr-2 font-normal">class</th>
          <th className="py-1.5 px-2 text-right font-normal">precision</th>
          <th className="py-1.5 px-2 text-right font-normal">recall</th>
          <th className="py-1.5 px-2 text-right font-normal">F1</th>
          <th className="py-1.5 pl-2 text-right font-normal">n</th>
        </tr>
      </thead>
      <tbody>
        {metrics.labels.map((label) => {
          const row = metrics.perClass[label];
          if (!row) return null;
          return (
            <tr key={label} className="border-t border-line/60">
              <td className="py-1.5 pr-2 text-ink-soft">{label}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-ink">{row.precision.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-ink">{row.recall.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-ink">{row.f1.toFixed(2)}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums text-ink-muted">{row.support}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ModelCard() {
  const test = report.test;

  return (
    <div className="container-page max-w-5xl py-8 lg:py-10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill border border-forest/20 bg-forest/8 text-forest">model card</span>
        <span className="pill border border-line bg-white/60 text-ink-muted">engine {report.engineVersion}</span>
        <span className="pill border border-line bg-white/60 text-ink-muted">{report.lexiconVersion}</span>
        <span className="pill border border-line bg-white/60 text-ink-muted">
          evaluated {new Date(report.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <h1 className="mt-3 text-balance font-display text-[2.1rem] leading-tight text-ink md:text-[2.6rem]">
        What the reading can do, and what it cannot.
      </h1>
      <p className="mt-3 max-w-3xl text-[0.94rem] leading-relaxed text-ink-soft">
        Nkommo runs a deterministic, rule-based reading engine on your device. It is not a fine-tuned transformer in this
        build — that is the production path, and it is not shipping until it can be validated on Ghanaian text with
        clinicians in the room. Here is exactly what is running today, with its measured performance.
      </p>

      <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/8 p-4">
        <p className="flex items-center gap-2 text-[0.82rem] font-medium text-[#7a5a10]">
          <AlertTriangle size={14} /> Read this before quoting any number below
        </p>
        <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[#6f5310]">{report.note}</p>
      </div>

      {/* ---------------- Headline metrics ---------------- */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Risk triage accuracy', value: test.risk.accuracy, suffix: '', note: 'held-out test split' },
          { label: 'High-risk recall', value: test.safety.highRiskRecall, suffix: '', note: 'elevated + urgent caught' },
          { label: 'Urgent recall', value: test.safety.urgentRecall, suffix: '', note: 'needs a human now' },
          { label: 'Mood band MAE', value: test.mae, suffix: ' pts', note: 'distance from human band' },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-ink-muted">{item.label}</p>
            <p className="mt-2 font-display text-[1.9rem] leading-none text-forest">
              {typeof item.value === 'number' && item.value <= 1 ? `${Math.round(item.value * 100)}%` : `${item.value}${item.suffix}`}
            </p>
            <p className="mt-1.5 text-[0.7rem] text-ink-muted">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.78rem] font-medium text-ink">Mood band accuracy</p>
            <span className="text-[0.72rem] tabular-nums text-ink-muted">{(test.mood.accuracy * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8">
            <div className="h-full rounded-full bg-sage" style={{ width: `${test.mood.accuracy * 100}%` }} />
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-ink-muted">
            Four-way agreement with a human label across bright / steady / unsettled / heavy. Boundaries are judgement
            calls, which is why MAE is reported alongside.
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.78rem] font-medium text-ink">Macro F1 · risk triage</p>
            <span className="text-[0.72rem] tabular-nums text-ink-muted">{test.risk.macroF1.toFixed(2)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8">
            <div className="h-full rounded-full bg-forest" style={{ width: `${test.risk.macroF1 * 100}%` }} />
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-ink-muted">
            Averaged across the four safety tiers, so a model that only ever predicts &ldquo;none&rdquo; cannot look good.
          </p>
        </div>
      </div>

      {/* ---------------- Evaluation detail ---------------- */}
      <section className="mt-9">
        <SectionHeading
          eyebrow="Evaluation"
          title="Confusion matrices, not vibes."
          blurb={`${report.corpus.total} hand-labelled entries: ${report.corpus.dev} used for tuning, ${report.corpus.test} written at the same time and held back, including ${report.corpus.ghanaianSubset} Ghanaian English/Pidgin cases.`}
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <Confusion metrics={test.risk} labels={RISK_LABELS} title="Risk tier · held-out test" />
            <div className="mt-3">
              <ClassTable metrics={test.risk} />
            </div>
          </div>
          <div className="card p-4">
            <Confusion metrics={test.mood} labels={MOOD_LABELS} title="Mood band · held-out test" />
            <div className="mt-3">
              <ClassTable metrics={test.mood} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="card-flat p-4">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">Ghanaian subset</p>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-soft">
              {report.ghanaian.n} cases · risk accuracy {(report.ghanaian.risk.accuracy * 100).toFixed(0)}% · high-risk
              recall {(report.ghanaian.safety.highRiskRecall * 100).toFixed(0)}% · mood MAE {report.ghanaian.mae} points.
            </p>
          </div>
          <div className="card-flat p-4">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">Missed high-risk (test)</p>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-soft">
              {test.safety.missedHighRisk.length === 0
                ? 'Zero elevated/urgent cases were read as non-concerning in the held-out split.'
                : `${test.safety.missedHighRisk.length} case(s) under-triaged. The full list is printed by npm run eval — we do not hide it.`}
            </p>
          </div>
          <div className="card-flat p-4">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">False alarms (test)</p>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-soft">
              {test.safety.falseAlarms.length} entries with no risk language were read as elevated or urgent. False alarms
              cost trust; missed risk costs lives. The thresholds are tuned toward the latter.
            </p>
          </div>
        </div>

        {report.blindDisclosure && (
          <div className="mt-4 rounded-2xl border border-clay/30 bg-clay/5 p-4">
            <p className="flex items-center gap-2 text-[0.8rem] font-medium text-clay">
              <AlertTriangle size={14} /> The blind split, including the part that went badly
            </p>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">{report.blindDisclosure}</p>
            {report.blind && (
              <p className="mt-2 text-[0.76rem] text-ink-soft">
                Current blind-split readings (post-fix, no longer unbiased): {report.blind.n} cases · risk accuracy{' '}
                {(report.blind.risk.accuracy * 100).toFixed(0)}% · high-risk recall{' '}
                {(report.blind.safety.highRiskRecall * 100).toFixed(0)}% · mood MAE {report.blind.mae} points.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-line bg-white/50 p-4">
          <p className="flex items-center gap-2 text-[0.8rem] font-medium text-ink">
            <FlaskConical size={14} className="text-forest" /> Reproduce this table
          </p>
          <p className="mt-1.5 text-[0.78rem] leading-relaxed text-ink-soft">
            The eval corpus, harness and report live in the repository under <code className="rounded bg-paper-deep px-1 py-0.5 text-[0.74rem]">src/engine/eval</code>. Run{' '}
            <code className="rounded bg-paper-deep px-1 py-0.5 text-[0.74rem]">npm run eval</code> and the table above is
            regenerated from the same code path the app ships. No hand-typed numbers.
          </p>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mt-10">
        <SectionHeading eyebrow="Architecture" title="Four deterministic layers." />
        <div className="mt-4 space-y-3">
          {[
            {
              n: '01',
              title: 'Normalise',
              body: 'Contractions expanded, Ghanaian spellings mapped (k3k3 → small, medaase → thank), elongation collapsed, emoji and emoticons scored, sentence boundaries preserved as explicit tokens.',
            },
            {
              n: '02',
              title: 'Valence',
              body: 'Lexicon and phrase lookup (up to five tokens), then VADER-style rules: negation flipped by −0.74 within a three-token window, intensifiers and diminishers scaled, “but” re-weights the clause after it, shouting and exclamation add intensity. Compound score = sum / √(sum² + 15).',
            },
            {
              n: '03',
              title: 'Distress + emotion',
              body: 'Eight marker groups (hopelessness, anxiety, isolation, shame, sleep, somatic, impairment, support) feed a 0–100 distress index alongside negative valence. Eleven emotion categories are scored and normalised, mapped onto the GoEmotions taxonomy.',
            },
            {
              n: '04',
              title: 'Safety pass',
              body: `A separate scan with ${RISK_PATTERNS.length} risk patterns across three tiers, sentence-level suppression for protective or figurative language, third-person attribution so a friend’s risk is not charged to the writer, and a composite escalation when intent cues meet death or planning language.`,
            },
          ].map((layer) => (
            <div key={layer.n} className="flex gap-4 rounded-2xl border border-line bg-white/55 p-4">
              <span className="font-display text-[1.4rem] leading-none text-gold">{layer.n}</span>
              <div>
                <h3 className="font-display text-[1.05rem] text-ink">{layer.title}</h3>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-soft">{layer.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="card-flat p-4">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">Mood bands</p>
            <ul className="mt-2 space-y-1 text-[0.8rem] text-ink-soft">
              <li>bright ≥ 76</li>
              <li>steady 52–75</li>
              <li>unsettled 30–51</li>
              <li>heavy &lt; 30</li>
            </ul>
            <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-muted">
              Score = 58 + 30 · compound − 0.32 · max(0, distress − 28), clamped 0–100, with hard caps applied when risk
              language is present.
            </p>
          </div>
          <div className="card-flat p-4">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">Risk tiers</p>
            <ul className="mt-2 space-y-1 text-[0.8rem] text-ink-soft">
              <li><span className="font-medium text-ink">urgent</span> — intent, plan, means at hand, recent act, farewell</li>
              <li><span className="font-medium text-ink">elevated</span> — ideation without plan, burdensomeness, no reason to live</li>
              <li><span className="font-medium text-ink">watch</span> — passive hopelessness, entrapment, can no longer cope</li>
              <li><span className="font-medium text-ink">none</span> — no risk language, or explained away and disclosed</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- Known difficulties ---------------- */}
      <section id="limits" className="mt-10 scroll-mt-24">
        <SectionHeading
          eyebrow="Limitations"
          title="Where the reading fails."
          blurb="Published deliberately. A mental health tool that hides its failure modes is asking for trust it has not earned."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {report.knownDifficulties.map((item) => (
            <div key={item.id} className="rounded-2xl border border-line bg-white/55 p-4">
              <p className="flex items-center gap-2 text-[0.84rem] font-medium text-ink">
                <Scale size={14} className="text-clay" /> {item.label}
              </p>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-rose/25 bg-rose/5 p-4">
            <p className="flex items-center gap-2 text-[0.84rem] font-medium text-rose">
              <ShieldAlert size={14} /> Hard limits that no tuning will fix
            </p>
            <ul className="mt-2 space-y-1.5 text-[0.79rem] leading-relaxed text-ink-soft">
              <li>· It cannot detect what is not written. Silence is invisible to it.</li>
              <li>· It cannot assess tone of voice, body language, or context outside the text.</li>
              <li>· It cannot contact anyone, and it does not run in the background.</li>
              <li>· It is not a crisis service, and it does not guarantee that “none” means safe.</li>
              <li>· It is not valid for Twi, Ga, Ewe or Hausa yet; it says so instead of guessing.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-sage/25 bg-sage/6 p-4">
            <p className="flex items-center gap-2 text-[0.84rem] font-medium text-[#456b4b]">
              <CheckCircle2 size={14} /> What would make this trustworthy
            </p>
            <ul className="mt-2 space-y-1.5 text-[0.79rem] leading-relaxed text-ink-soft">
              <li>· Two annotators per item, adjudicated, with Ghanaian clinicians on the panel.</li>
              <li>· A prospective study: does the pattern predict PHQ-9 change two weeks later?</li>
              <li>· A Twi/Ga/Ewe/Pidgin corpus annotated by native speakers, not translated.</li>
              <li>· A fine-tuned transformer evaluated against this baseline, not instead of it.</li>
              <li>· A published safety audit of every missed urgent case.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="rounded-3xl border border-line bg-paper-deep/50 p-5 md:p-6">
          <p className="flex items-center gap-2 text-[0.8rem] font-medium text-ink">
            <Info size={14} className="text-forest" /> Data provenance
          </p>
          <p className="mt-2 text-[0.83rem] leading-relaxed text-ink-soft">
            The shipping engine uses no training data at runtime — only a hand-built lexicon, which is why it can run
            offline. The taxonomy follows GoEmotions (27 emotions + neutral), which we collapse to eleven categories that
            matter for mood tracking. The risk patterns were written against clinical triage language and iterated with
            the test set held out. No real journal entries, Reddit posts, or PHQ-9 responses from real people are bundled
            with this app. The sample data is fictional.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/research" className="btn btn-ghost text-[0.78rem]">
              Research notes & sources <ArrowRight size={12} />
            </Link>
            <Link to="/privacy" className="btn btn-ghost text-[0.78rem]">
              Privacy & data <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
