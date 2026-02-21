/**
 * Task Analyzer — classifies a user's prompt into a capability profile.
 *
 * Each dimension is scored 0–1:
 *   reasoning   — logical / multi-step / math
 *   creativity  — open-ended writing, brainstorming
 *   knowledge   — factual recall, domain expertise
 *   code        — code gen / debug / refactor
 *   contextLen  — how much context the task likely needs
 *   precision   — correctness-critical (legal, medical, financial)
 *
 * This runs locally with zero LLM calls — pure heuristics.
 */

export interface TaskProfile {
  reasoning: number;
  creativity: number;
  knowledge: number;
  code: number;
  contextLen: number;
  precision: number;
  label: string;
  dominantDimension: string;
}

interface Rule {
  pattern: RegExp;
  dimension: keyof Omit<TaskProfile, 'label' | 'dominantDimension'>;
  boost: number;
}

const RULES: Rule[] = [
  // ── Reasoning ──
  { pattern: /\b(explain|why|because|reason|logic|proof|prove|deriv\w*|infer|deduc|step[\s-]?by[\s-]?step)\b/i, dimension: 'reasoning', boost: 0.35 },
  { pattern: /\b(compar[ei]|contrast|analyz|evaluat|trade[\s-]?off|pros?\s+and\s+cons?)\b/i, dimension: 'reasoning', boost: 0.30 },
  { pattern: /\b(plan|strateg|architect|design[\s-]?pattern|system[\s-]?design)\b/i, dimension: 'reasoning', boost: 0.30 },
  { pattern: /\b(math|equation|calcul|integral|derivative|theorem|solve|induction|contradiction)\b/i, dimension: 'reasoning', boost: 0.40 },
  { pattern: /\b(algorithm|complexity|big[\s-]?o|dynamic[\s-]?programming|recursion)\b/i, dimension: 'reasoning', boost: 0.35 },

  // ── Creativity ──
  { pattern: /\b(write|compose|draft|poem|story|essay|blog|creative|novel|fiction)\b/i, dimension: 'creativity', boost: 0.40 },
  { pattern: /\b(brainstorm|idea|imagin|invent|original|unique)\b/i, dimension: 'creativity', boost: 0.30 },
  { pattern: /\b(rewrite|paraphrase|rephrase|tone|style|voice)\b/i, dimension: 'creativity', boost: 0.25 },

  // ── Knowledge ──
  { pattern: /\b(what is|who is|define|definition|history|fact|capital of|when did)\b/i, dimension: 'knowledge', boost: 0.35 },
  { pattern: /\b(encycloped|wiki|reference|cite|source)\b/i, dimension: 'knowledge', boost: 0.25 },
  { pattern: /\b(medical|legal|scientific|research|journal|paper)\b/i, dimension: 'knowledge', boost: 0.30 },

  // ── Code ──
  { pattern: /\b(code|program|function|class|implement|debug|refactor|regex|sql|api)\b/i, dimension: 'code', boost: 0.40 },
  { pattern: /\b(python|javascript|typescript|java|rust|go|c\+\+|html|css|react|angular|vue|node)\b/i, dimension: 'code', boost: 0.35 },
  { pattern: /\b(bug|error|exception|stack[\s]?trace|compile|lint|test|unittest|pytest|jest)\b/i, dimension: 'code', boost: 0.30 },
  { pattern: /```/i, dimension: 'code', boost: 0.25 },
  { pattern: /\b(git|docker|kubernetes|ci[\s/]?cd|deploy|devops|terraform)\b/i, dimension: 'code', boost: 0.25 },
  { pattern: /\b(fix|patch|issue|pr|pull[\s-]?request|merge|commit)\b/i, dimension: 'code', boost: 0.20 },

  // ── Context Length ──
  { pattern: /\b(summarize|summarise|tldr|tl;dr|long document|entire file|full text)\b/i, dimension: 'contextLen', boost: 0.40 },
  { pattern: /\b(book|chapter|transcript|meeting[\s-]?notes|conversation|codebase|repository)\b/i, dimension: 'contextLen', boost: 0.30 },
  { pattern: /\b(review|audit|all files|whole project|entire)\b/i, dimension: 'contextLen', boost: 0.25 },

  // ── Precision ──
  { pattern: /\b(exact|precise|accurate|correct|verify|validate|audit)\b/i, dimension: 'precision', boost: 0.30 },
  { pattern: /\b(legal|compliance|regulation|medical|diagnosis|safety)\b/i, dimension: 'precision', boost: 0.35 },
  { pattern: /\b(financial|accounting|tax|budget|security|vulnerability|cve)\b/i, dimension: 'precision', boost: 0.30 },
];

const SIMPLE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\s*(hi|hello|hey|thanks|thank you|ok|okay)\s*[.!?]?\s*$/i, label: 'greeting' },
  { pattern: /^\s*(yes|no|sure|nope|yep)\s*[.!?]?\s*$/i, label: 'acknowledgement' },
];

/**
 * Analyze a prompt and return a TaskProfile describing its capability needs.
 */
export function analyzeTask(prompt: string): TaskProfile {
  // Fast-path: trivial prompts
  for (const { pattern, label } of SIMPLE_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        reasoning: 0, creativity: 0, knowledge: 0,
        code: 0, contextLen: 0, precision: 0,
        label,
        dominantDimension: 'none',
      };
    }
  }

  const scores: Record<string, number> = {
    reasoning: 0, creativity: 0, knowledge: 0,
    code: 0, contextLen: 0, precision: 0,
  };

  for (const rule of RULES) {
    if (rule.pattern.test(prompt)) {
      scores[rule.dimension] = Math.min(1.0, scores[rule.dimension] + rule.boost);
    }
  }

  // Long prompts likely need a bigger context window
  if (prompt.length > 4000) {
    scores.contextLen = Math.min(1.0, scores.contextLen + 0.3);
  } else if (prompt.length > 2000) {
    scores.contextLen = Math.min(1.0, scores.contextLen + 0.15);
  }

  // Determine dominant dimension
  let dominant = 'reasoning';
  let topScore = 0;
  for (const [dim, val] of Object.entries(scores)) {
    if (val > topScore) {
      topScore = val;
      dominant = dim;
    }
  }

  // Label
  let label: string;
  if (topScore < 0.15) {
    label = 'simple';
  } else if (topScore <= 0.35) {
    label = `moderate-${dominant}`;
  } else {
    label = `complex-${dominant}`;
  }

  return {
    reasoning: round(scores.reasoning),
    creativity: round(scores.creativity),
    knowledge: round(scores.knowledge),
    code: round(scores.code),
    contextLen: round(scores.contextLen),
    precision: round(scores.precision),
    label,
    dominantDimension: dominant,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Returns a compact markdown summary of a task profile.
 */
export function profileToMarkdown(profile: TaskProfile): string {
  const dims = [
    { name: 'Reasoning', val: profile.reasoning, icon: '🧠' },
    { name: 'Creativity', val: profile.creativity, icon: '🎨' },
    { name: 'Knowledge', val: profile.knowledge, icon: '📚' },
    { name: 'Code', val: profile.code, icon: '💻' },
    { name: 'Context', val: profile.contextLen, icon: '📏' },
    { name: 'Precision', val: profile.precision, icon: '🎯' },
  ];

  const bars = dims.map(d => {
    const filled = Math.round(d.val * 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return `${d.icon} ${d.name.padEnd(10)} \`${bar}\` ${(d.val * 100).toFixed(0)}%`;
  });

  return bars.join('\n');
}
