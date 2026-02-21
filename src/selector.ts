/**
 * Occum's Selector — the core Occam's Razor model-selection algorithm.
 *
 * Given a TaskProfile and a set of available VS Code LanguageModelChat
 * instances, it:
 *
 *   1. MATCH   — map each available model to its known ModelProfile
 *   2. FILTER  — remove models that don't meet the task's capability needs
 *   3. RANK    — sort remaining models by simplicity (cheapest/fastest first)
 *   4. SELECT  — return the simplest adequate model
 */

import * as vscode from 'vscode';
import { TaskProfile } from './taskAnalyzer';
import { ModelProfile, findProfile, UNKNOWN_PROFILE } from './modelProfiles';

export interface ScoredModel {
  model: vscode.LanguageModelChat;
  profile: ModelProfile;
  complexityScore: number;
  adequate: boolean;
  /** How well capabilities exceed requirements (higher = more headroom) */
  capabilityMargin: number;
}

export interface SelectionResult {
  task: TaskProfile;
  all: ScoredModel[];
  adequate: ScoredModel[];
  selected: ScoredModel;
  reason: string;
}

export interface SelectorConfig {
  headroom: number;
  costWeight: number;
  speedWeight: number;
  sizeWeight: number;
  preferredProvider: string;
}

/**
 * Read selector config from VS Code settings.
 */
export function getConfig(): SelectorConfig {
  const cfg = vscode.workspace.getConfiguration('occums');
  return {
    headroom: cfg.get<number>('headroom', 0.05),
    costWeight: cfg.get<number>('costWeight', 0.4),
    speedWeight: cfg.get<number>('speedWeight', 0.35),
    sizeWeight: cfg.get<number>('sizeWeight', 0.25),
    preferredProvider: cfg.get<string>('preferredProvider', ''),
  };
}

/**
 * Select the simplest adequate Copilot model for a task.
 */
export async function selectModel(
  task: TaskProfile,
  config?: SelectorConfig,
): Promise<SelectionResult> {
  const cfg = config ?? getConfig();

  // 1. Discover all available models
  const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (models.length === 0) {
    throw new Error('No Copilot models available. Make sure GitHub Copilot Chat is active.');
  }

  // 2. Score each model
  const scored = models.map(m => scoreModel(m, task, cfg));

  // 3. Filter to adequate models
  let adequate = scored.filter(s => s.adequate);

  // If nothing is adequate, relax by removing headroom
  if (adequate.length === 0) {
    const relaxed = { ...cfg, headroom: 0 };
    const rescored = models.map(m => scoreModel(m, task, relaxed));
    adequate = rescored.filter(s => s.adequate);
  }

  // If still nothing, just use all models (degrade gracefully)
  if (adequate.length === 0) {
    adequate = scored;
  }

  // 4. Apply provider preference (boost but don't exclude)
  if (cfg.preferredProvider) {
    adequate.sort((a, b) => {
      const aPref = a.profile.provider === cfg.preferredProvider ? -0.1 : 0;
      const bPref = b.profile.provider === cfg.preferredProvider ? -0.1 : 0;
      return (a.complexityScore + aPref) - (b.complexityScore + bPref);
    });
  } else {
    adequate.sort((a, b) => a.complexityScore - b.complexityScore);
  }

  const selected = adequate[0];
  const reason = buildReason(task, selected, adequate);

  return {
    task,
    all: scored,
    adequate,
    selected,
    reason,
  };
}

/**
 * Score a single model against a task.
 */
function scoreModel(
  model: vscode.LanguageModelChat,
  task: TaskProfile,
  cfg: SelectorConfig,
): ScoredModel {
  // Find its known profile
  const known = findProfile(model.family);
  const profile: ModelProfile = known ?? {
    familyPattern: new RegExp(model.family, 'i'),
    displayName: model.name || model.family,
    provider: model.vendor,
    ...UNKNOWN_PROFILE,
  };

  // Complexity score (lower = simpler = preferred)
  const complexityScore =
    cfg.costWeight * profile.costTier +
    cfg.speedWeight * profile.speedTier +
    cfg.sizeWeight * profile.sizeTier;

  // Check adequacy: does the model meet the task's needs + headroom?
  const dims: Array<keyof TaskProfile & keyof ModelProfile> = [
    'reasoning', 'creativity', 'knowledge', 'code', 'precision',
  ];
  // Context length checked separately since field names differ
  let adequate = true;
  let totalMargin = 0;
  let dimCount = 0;

  for (const dim of dims) {
    const required = task[dim] as number;
    if (required > 0) {
      const capability = profile[dim] as number;
      const margin = capability - required;
      totalMargin += margin;
      dimCount++;
      if (capability < required - cfg.headroom) {
        adequate = false;
      }
    }
  }

  // Check context too
  if (task.contextLen > 0) {
    const margin = profile.contextLen - task.contextLen;
    totalMargin += margin;
    dimCount++;
    if (profile.contextLen < task.contextLen - cfg.headroom) {
      adequate = false;
    }
  }

  const capabilityMargin = dimCount > 0 ? totalMargin / dimCount : 0;

  return { model, profile, complexityScore, adequate, capabilityMargin };
}

function buildReason(
  task: TaskProfile,
  selected: ScoredModel,
  adequate: ScoredModel[],
): string {
  const dim = task.dominantDimension;
  const parts: string[] = [];

  if (task.label === 'greeting' || task.label === 'acknowledgement' || task.label === 'simple') {
    parts.push(`Simple task → using lightest available model: **${selected.profile.displayName}**.`);
  } else {
    const capVal = dim === 'contextLen'
      ? selected.profile.contextLen
      : (selected.profile as any)[dim] as number;
    const reqVal = (task as any)[dim] as number;

    parts.push(
      `Task needs **${dim}** ≥ ${(reqVal * 100).toFixed(0)}%.`,
      `**${selected.profile.displayName}** provides ${(capVal * 100).toFixed(0)}%`,
      `with complexity score ${selected.complexityScore.toFixed(3)}.`,
    );

    if (adequate.length > 1) {
      const runner = adequate[1];
      parts.push(
        `Next option: ${runner.profile.displayName} (complexity ${runner.complexityScore.toFixed(3)}).`,
      );
    }
  }

  parts.push('*Occam\'s Razor: simplest adequate model wins.*');
  return parts.join(' ');
}

/**
 * Format the selection result as markdown for display in chat.
 */
export function resultToMarkdown(result: SelectionResult): string {
  const lines: string[] = [];

  lines.push(`**🪒 Occum's Razor selected: \`${result.selected.profile.displayName}\`**`);
  lines.push('');
  lines.push(`> ${result.reason}`);
  lines.push('');

  // Show ranking table
  lines.push('| # | Model | Complexity | Adequate | Provider |');
  lines.push('|---|-------|-----------|----------|----------|');
  const sorted = [...result.all].sort((a, b) => a.complexityScore - b.complexityScore);
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const marker = s.model.id === result.selected.model.id ? ' ◀' : '';
    const check = s.adequate ? '✅' : '❌';
    lines.push(
      `| ${i + 1} | ${s.profile.displayName}${marker} | ${s.complexityScore.toFixed(3)} | ${check} | ${s.profile.provider} |`
    );
  }

  return lines.join('\n');
}
