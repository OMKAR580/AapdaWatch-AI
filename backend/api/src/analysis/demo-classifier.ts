import { PredictedLabel, DisasterCategory } from "@prisma/client";

export interface DemoClassificationOutput {
  predictedLabel: PredictedLabel;
  probability: number;
  decisionThreshold: number;
  suggestedCategory: DisasterCategory | null;
  confidence: number;
  matchedKeywords: string[];
  explanation: string;
  metadata: Record<string, unknown>;
}

interface TermRule {
  term: string;
  weight: number;
}

const DISASTER_TERMS: TermRule[] = [
  { term: "casualties", weight: 0.35 },
  { term: "fatalities", weight: 0.35 },
  { term: "evacuate", weight: 0.30 },
  { term: "evacuation", weight: 0.30 },
  { term: "submerged", weight: 0.30 },
  { term: "collapsed", weight: 0.30 },
  { term: "collapse", weight: 0.28 },
  { term: "epicenter", weight: 0.30 },
  { term: "wildfire", weight: 0.30 },
  { term: "landslide", weight: 0.30 },
  { term: "mudslide", weight: 0.28 },
  { term: "aftershock", weight: 0.25 },
  { term: "inundated", weight: 0.25 },
  { term: "destroyed", weight: 0.25 },
  { term: "destruction", weight: 0.25 },
  { term: "dead", weight: 0.25 },
  { term: "injured", weight: 0.20 },
  { term: "stranded", weight: 0.25 },
  { term: "rescue", weight: 0.20 },
  { term: "flooding", weight: 0.20 },
  { term: "flood", weight: 0.18 },
  { term: "earthquake", weight: 0.20 },
  { term: "cyclone", weight: 0.20 },
  { term: "tremor", weight: 0.18 },
  { term: "blaze", weight: 0.18 },
  { term: "flames", weight: 0.16 },
  { term: "fire", weight: 0.14 },
  { term: "storm surge", weight: 0.20 },
  { term: "emergency", weight: 0.20 },
  { term: "disaster", weight: 0.22 },
];

const NEGATIVE_TERMS: TermRule[] = [
  { term: "movie", weight: -0.30 },
  { term: "film", weight: -0.30 },
  { term: "song", weight: -0.25 },
  { term: "birthday", weight: -0.30 },
  { term: "celebration", weight: -0.30 },
  { term: "party", weight: -0.25 },
  { term: "mock drill", weight: -0.40 },
  { term: "drill", weight: -0.25 },
  { term: "fake news", weight: -0.35 },
  { term: "game", weight: -0.20 },
  { term: "match", weight: -0.15 },
  { term: "peaceful", weight: -0.20 },
  { term: "sunny", weight: -0.20 },
];

/**
 * Transparent, deterministic rule-based demo classifier.
 * Strictly avoids Math.random() and pseudo-random hash variance.
 */
export function classifyDemoText(text: string): DemoClassificationOutput {
  const lower = (text || "").toLowerCase().trim();
  const decisionThreshold = 0.35;

  if (!lower) {
    return {
      predictedLabel: PredictedLabel.NOT_DISASTER_RELATED,
      probability: 0.05,
      decisionThreshold,
      suggestedCategory: null,
      confidence: 0.95,
      matchedKeywords: [],
      explanation: "Empty or blank text evaluated as non-disaster.",
      metadata: {
        analysisMode: "DEMO",
        isSynthetic: true,
        modelName: "RuleBasedDemoClassifier",
        disclaimer: "This is a demonstration classification, not a production ML prediction.",
      },
    };
  }

  const matchedKeywords: string[] = [];
  let score = 0;

  for (const { term, weight } of DISASTER_TERMS) {
    if (lower.includes(term)) {
      score += weight;
      matchedKeywords.push(term);
    }
  }

  for (const { term, weight } of NEGATIVE_TERMS) {
    if (lower.includes(term)) {
      score += weight;
      matchedKeywords.push(`[neg] ${term}`);
    }
  }

  // Purely deterministic sigmoid-like mapping into [0.05, 0.98]
  let probability: number;
  if (score <= 0) {
    probability = 0.1;
  } else if (score < 0.3) {
    probability = Number((0.35 + score * 0.5).toFixed(3));
  } else if (score < 0.6) {
    probability = Number((0.65 + (score - 0.3) * 0.5).toFixed(3));
  } else {
    probability = Number(Math.min(0.98, 0.82 + (score - 0.6) * 0.2).toFixed(3));
  }

  // Ensure probability stays within [0.0, 1.0] for DB check constraints
  probability = Math.max(0.01, Math.min(0.99, probability));

  // Determine category based on matched terms
  let suggestedCategory: DisasterCategory | null = null;
  if (lower.includes("flood") || lower.includes("water") || lower.includes("submerged") || lower.includes("inundated")) {
    suggestedCategory = DisasterCategory.FLOOD;
  } else if (lower.includes("earthquake") || lower.includes("tremor") || lower.includes("quake") || lower.includes("aftershock") || lower.includes("epicenter")) {
    suggestedCategory = DisasterCategory.EARTHQUAKE;
  } else if (lower.includes("fire") || lower.includes("blaze") || lower.includes("smoke") || lower.includes("wildfire") || lower.includes("flames")) {
    suggestedCategory = DisasterCategory.FIRE;
  } else if (lower.includes("cyclone") || lower.includes("storm") || lower.includes("gale") || lower.includes("surge")) {
    suggestedCategory = DisasterCategory.CYCLONE;
  } else if (lower.includes("landslide") || lower.includes("mudslide") || lower.includes("rockfall")) {
    suggestedCategory = DisasterCategory.LANDSLIDE;
  } else if (matchedKeywords.length > 0) {
    suggestedCategory = DisasterCategory.OTHER;
  }

  const isDisaster = probability >= decisionThreshold;
  const predictedLabel = isDisaster
    ? PredictedLabel.DISASTER_RELATED
    : PredictedLabel.NOT_DISASTER_RELATED;

  const confidence = isDisaster ? probability : Number((1 - probability).toFixed(3));

  const explanation = matchedKeywords.length > 0
    ? `Identified keyword signals: ${matchedKeywords.join(", ")}. Computed probability: ${(probability * 100).toFixed(1)}%.`
    : `No disaster terminology detected. Baseline non-disaster probability assigned.`;

  return {
    predictedLabel,
    probability,
    decisionThreshold,
    suggestedCategory,
    confidence,
    matchedKeywords,
    explanation,
    metadata: {
      analysisMode: "DEMO",
      isSynthetic: true,
      modelName: "RuleBasedDemoClassifier",
      disclaimer: "This is a demonstration classification, not a production ML prediction.",
      evidenceKeywords: matchedKeywords,
      explanation,
    },
  };
}

