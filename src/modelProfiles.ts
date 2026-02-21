/**
 * Model Profiles — known capability & cost profiles for Copilot models.
 *
 * VS Code's `vscode.lm.selectChatModels()` tells us *which* models exist
 * but not their relative capabilities. This module provides the knowledge
 * layer that maps model families to capability scores.
 *
 * Each profile mirrors the TaskProfile dimensions so they can be directly
 * compared by the selector.
 */

export interface ModelProfile {
  /** Model family pattern (matched against LanguageModelChat.family) */
  familyPattern: RegExp;
  /** Human-readable name */
  displayName: string;
  /** Provider */
  provider: string;

  // ── Capability scores (0–1) ──
  reasoning: number;
  creativity: number;
  knowledge: number;
  code: number;
  contextLen: number;
  precision: number;

  // ── Simplicity axes (lower = simpler) ──
  /** Relative cost tier 0–1 (0 = free/cheapest, 1 = most expensive) */
  costTier: number;
  /** Relative speed tier 0–1 (0 = fastest, 1 = slowest) */
  speedTier: number;
  /** Relative model size 0–1 */
  sizeTier: number;

  /** Tags for filtering */
  tags: string[];
}

/**
 * Known model profiles.  Ordered roughly by complexity (simplest first).
 * The family patterns are matched against `LanguageModelChat.family`.
 *
 * When a new Copilot model appears that we don't know, we fall back to
 * a conservative "unknown" profile.
 */
export const MODEL_PROFILES: ModelProfile[] = [
  // ── Tiny / fast / cheap ──
  {
    familyPattern: /gpt-4o-mini/i,
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    reasoning: 0.45, creativity: 0.50, knowledge: 0.55, code: 0.50,
    contextLen: 0.75, precision: 0.45,
    costTier: 0.05, speedTier: 0.10, sizeTier: 0.05,
    tags: ['fast', 'cheap'],
  },
  {
    familyPattern: /claude.*haiku|haiku/i,
    displayName: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    reasoning: 0.50, creativity: 0.48, knowledge: 0.52, code: 0.50,
    contextLen: 0.80, precision: 0.48,
    costTier: 0.06, speedTier: 0.08, sizeTier: 0.06,
    tags: ['fast', 'cheap'],
  },
  {
    familyPattern: /gemini.*flash|flash/i,
    displayName: 'Gemini Flash',
    provider: 'google',
    reasoning: 0.50, creativity: 0.50, knowledge: 0.55, code: 0.50,
    contextLen: 0.90, precision: 0.50,
    costTier: 0.04, speedTier: 0.06, sizeTier: 0.05,
    tags: ['fast', 'cheap'],
  },

  // ── Mid-tier ──
  {
    familyPattern: /gpt-4o(?!-mini)/i,
    displayName: 'GPT-4o',
    provider: 'openai',
    reasoning: 0.75, creativity: 0.75, knowledge: 0.80, code: 0.78,
    contextLen: 0.75, precision: 0.75,
    costTier: 0.35, speedTier: 0.30, sizeTier: 0.40,
    tags: ['balanced'],
  },
  {
    familyPattern: /claude.*sonnet|sonnet/i,
    displayName: 'Claude Sonnet',
    provider: 'anthropic',
    reasoning: 0.82, creativity: 0.82, knowledge: 0.80, code: 0.88,
    contextLen: 0.85, precision: 0.82,
    costTier: 0.25, speedTier: 0.25, sizeTier: 0.35,
    tags: ['balanced', 'strong-code'],
  },
  {
    familyPattern: /gemini.*pro(?!.*flash)/i,
    displayName: 'Gemini Pro',
    provider: 'google',
    reasoning: 0.80, creativity: 0.72, knowledge: 0.80, code: 0.78,
    contextLen: 0.95, precision: 0.78,
    costTier: 0.20, speedTier: 0.28, sizeTier: 0.30,
    tags: ['balanced', 'long-context'],
  },

  // ── Heavy / Frontier ──
  {
    familyPattern: /o1(?!-mini)|o3/i,
    displayName: 'o1 / o3 (Reasoning)',
    provider: 'openai',
    reasoning: 0.95, creativity: 0.60, knowledge: 0.85, code: 0.90,
    contextLen: 0.70, precision: 0.93,
    costTier: 0.85, speedTier: 0.90, sizeTier: 0.80,
    tags: ['reasoning', 'expensive'],
  },
  {
    familyPattern: /o1-mini/i,
    displayName: 'o1-mini',
    provider: 'openai',
    reasoning: 0.80, creativity: 0.50, knowledge: 0.70, code: 0.80,
    contextLen: 0.65, precision: 0.78,
    costTier: 0.40, speedTier: 0.50, sizeTier: 0.35,
    tags: ['reasoning'],
  },
  {
    familyPattern: /claude.*opus|opus/i,
    displayName: 'Claude Opus',
    provider: 'anthropic',
    reasoning: 0.92, creativity: 0.90, knowledge: 0.88, code: 0.90,
    contextLen: 0.85, precision: 0.90,
    costTier: 0.80, speedTier: 0.75, sizeTier: 0.85,
    tags: ['frontier'],
  },
];

/**
 * Fallback profile for models we don't recognize.
 * Conservative middle-ground so they don't get unfairly excluded.
 */
export const UNKNOWN_PROFILE: Omit<ModelProfile, 'familyPattern' | 'displayName' | 'provider'> = {
  reasoning: 0.60, creativity: 0.60, knowledge: 0.60, code: 0.60,
  contextLen: 0.60, precision: 0.60,
  costTier: 0.50, speedTier: 0.50, sizeTier: 0.50,
  tags: ['unknown'],
};

/**
 * Look up the profile for a model by its family string.
 */
export function findProfile(family: string): ModelProfile | undefined {
  // Check gpt-4o-mini before gpt-4o (more specific first)
  // Profiles are already ordered with mini before non-mini
  return MODEL_PROFILES.find(p => p.familyPattern.test(family));
}
