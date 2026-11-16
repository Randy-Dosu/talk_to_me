/** Confusion-matrix metrics, no dependencies, shared by the CLI and the UI. */

export interface Metrics {
  n: number;
  accuracy: number;
  macroF1: number;
  perClass: Record<string, { precision: number; recall: number; f1: number; support: number }>;
  confusion: Record<string, Record<string, number>>;
  labels: string[];
}

export function computeMetrics(
  truth: string[],
  predicted: string[],
  labelOrder: string[],
): Metrics {
  const labels = labelOrder;
  const confusion: Record<string, Record<string, number>> = {};
  for (const a of labels) {
    confusion[a] = {};
    for (const b of labels) confusion[a][b] = 0;
  }

  let correct = 0;
  for (let i = 0; i < truth.length; i += 1) {
    const t = truth[i];
    const p = predicted[i];
    if (!confusion[t]) confusion[t] = {};
    confusion[t][p] = (confusion[t][p] ?? 0) + 1;
    if (t === p) correct += 1;
  }

  const perClass: Metrics['perClass'] = {};
  let f1Sum = 0;
  for (const label of labels) {
    const tp = confusion[label]?.[label] ?? 0;
    let fp = 0;
    let fn = 0;
    for (const other of labels) {
      if (other === label) continue;
      fp += confusion[other]?.[label] ?? 0;
      fn += confusion[label]?.[other] ?? 0;
    }
    const support = tp + fn;
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = support === 0 ? 0 : tp / support;
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    perClass[label] = {
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
      support,
    };
    if (support > 0) f1Sum += f1;
  }

  const withSupport = labels.filter((l) => perClass[l].support > 0).length || 1;

  return {
    n: truth.length,
    accuracy: round(correct / Math.max(1, truth.length)),
    macroF1: round(f1Sum / withSupport),
    perClass,
    confusion,
    labels,
  };
}

export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Safety-specific view: a miss is any high-risk case read as non-high-risk. */
export function safetyReport(
  truth: string[],
  predicted: string[],
): {
  urgentRecall: number;
  highRiskRecall: number;
  missedHighRisk: number[];
  falseAlarms: number[];
  urgentN: number;
  highRiskN: number;
} {
  const missedHighRisk: number[] = [];
  const falseAlarms: number[] = [];
  const riskRank: Record<string, number> = { none: 0, watch: 1, elevated: 2, urgent: 3 };

  let urgentN = 0;
  let urgentHit = 0;
  let highRiskN = 0;
  let highRiskHits = 0;

  for (let i = 0; i < truth.length; i += 1) {
    const t = truth[i];
    const p = predicted[i];
    if (t === 'urgent') {
      urgentN += 1;
      if (p === 'urgent') urgentHit += 1;
    }
    if (t === 'urgent' || t === 'elevated') {
      highRiskN += 1;
      if (riskRank[p] >= 2) highRiskHits += 1;
      else missedHighRisk.push(i);
    }
    if ((p === 'urgent' || p === 'elevated') && t === 'none') falseAlarms.push(i);
  }

  return {
    urgentRecall: round(urgentHit / Math.max(1, urgentN)),
    highRiskRecall: round(highRiskHits / Math.max(1, highRiskN)),
    missedHighRisk,
    falseAlarms,
    urgentN,
    highRiskN,
  };
}
