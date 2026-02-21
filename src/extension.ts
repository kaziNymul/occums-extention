/**
 * Occum's Razor — VS Code Extension
 *
 * Automatically selects the best Copilot model for each task.
 *
 * THREE ways to use (from most to least "automatic"):
 *
 *   1. STATUS BAR     — always shows the recommended model for your current
 *                        context. Click it → opens chat with @occums pre-filled.
 *
 *   2. KEYBOARD       — Ctrl+Shift+R opens a prompt box, sends to @occums.
 *                        Ctrl+Shift+Alt+R sends the current selection.
 *
 *   3. CHAT DIRECTLY  — type @occums <prompt> in Copilot Chat.
 *                        (isSticky=true so it stays selected after first use)
 */

import * as vscode from 'vscode';
import { analyzeTask, profileToMarkdown, TaskProfile } from './taskAnalyzer';
import { selectModel, resultToMarkdown, getConfig, SelectionResult } from './selector';
import { findProfile, UNKNOWN_PROFILE, MODEL_PROFILES } from './modelProfiles';

// ── Globals ──
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let currentRecommendation: string = '';

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Occum's Razor");
  outputChannel.appendLine('🪒 Occum\'s Razor activated');

  // ── Chat Participant ──
  const participant = vscode.chat.createChatParticipant('occums.razor', handleChat);
  participant.iconPath = new vscode.ThemeIcon('lightbulb');

  // ── Status Bar ──
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  statusBarItem.command = 'occums.openChat';
  statusBarItem.tooltip = 'Occum\'s Razor — click to ask with smart model selection';
  updateStatusBar('Ready');
  statusBarItem.show();

  // ── Commands ──
  context.subscriptions.push(
    participant,
    statusBarItem,
    outputChannel,

    // Quick-open: pops up an input box → routes through @occums
    vscode.commands.registerCommand('occums.openChat', openChatCommand),

    // Ask about the current editor selection
    vscode.commands.registerCommand('occums.askSelection', askSelectionCommand),

    // List models
    vscode.commands.registerCommand('occums.showModels', async () => {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: '@occums /models',
      });
    }),

    // Analyze a task
    vscode.commands.registerCommand('occums.analyzeTask', async () => {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter a task or prompt to analyze',
        placeHolder: 'e.g. Write a Python function to sort a list',
      });
      if (input) {
        await vscode.commands.executeCommand('workbench.action.chat.open', {
          query: `@occums /analyze ${input}`,
        });
      }
    }),

    // Update status bar when active editor / language changes
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBarFromContext()),
    vscode.window.onDidChangeTextEditorSelection(
      debounce(() => updateStatusBarFromContext(), 500)
    ),
  );

  // Initial status bar update
  updateStatusBarFromContext();

  // Welcome message on first activation
  const hasSeenWelcome = context.globalState.get<boolean>('occums.welcomed');
  if (!hasSeenWelcome) {
    showWelcome(context);
  }
}

export function deactivate() {}

// ─────────────────────────────────────────────────────────────────────────────
// Status Bar — live model recommendation
// ─────────────────────────────────────────────────────────────────────────────

function updateStatusBar(modelName: string) {
  currentRecommendation = modelName;
  statusBarItem.text = `$(lightbulb) 🪒 ${modelName}`;
}

/**
 * Analyze the current editor context and update the status bar with
 * the recommended model. Runs on editor/selection changes (debounced).
 */
function updateStatusBarFromContext() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    updateStatusBar('Ready');
    return;
  }

  const lang = editor.document.languageId;
  const selection = editor.selection;
  const hasSelection = !selection.isEmpty;

  let contextHint = '';
  if (hasSelection) {
    const text = editor.document.getText(selection);
    contextHint = text.substring(0, 500);
  }

  // Infer task type from language + context
  let syntheticPrompt: string;
  if (contextHint) {
    syntheticPrompt = `${lang} code: ${contextHint}`;
  } else {
    syntheticPrompt = `Working on ${lang} code`;
  }

  const profile = analyzeTask(syntheticPrompt);
  const dominant = profile.dominantDimension;
  const score = (profile as any)[dominant] as number || 0;

  // Quick model recommendation (heuristic, no API call)
  let recommended: string;
  if (score < 0.15) {
    recommended = 'Mini ⚡';
  } else if (score < 0.4) {
    recommended = 'Sonnet 💡';
  } else if (profile.reasoning > 0.6 || profile.precision > 0.6) {
    recommended = 'o1/Opus 🧠';
  } else if (profile.code > 0.6) {
    recommended = 'Sonnet 💻';
  } else {
    recommended = 'GPT-4o 🎯';
  }

  updateStatusBar(recommended);
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

async function openChatCommand() {
  const input = await vscode.window.showInputBox({
    prompt: '🪒 Occum\'s Razor — What do you need help with?',
    placeHolder: 'Type your question (the best model will be auto-selected)',
  });

  if (input?.trim()) {
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: `@occums ${input}`,
    });
  }
}

async function askSelectionCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showInformationMessage('Select some code first, then use this command.');
    return;
  }

  const selectedText = editor.document.getText(editor.selection);
  const lang = editor.document.languageId;

  const actions = [
    'Explain this code',
    'Fix bugs in this code',
    'Refactor this code',
    'Add tests for this code',
    'Optimize this code',
    'Add documentation',
  ];

  const action = await vscode.window.showQuickPick(actions, {
    placeHolder: '🪒 What should I do with the selected code?',
  });

  if (action) {
    const prompt = `${action} (${lang}):\n\`\`\`${lang}\n${selectedText}\n\`\`\``;
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: `@occums ${prompt}`,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome
// ─────────────────────────────────────────────────────────────────────────────

async function showWelcome(context: vscode.ExtensionContext) {
  const choice = await vscode.window.showInformationMessage(
    '🪒 Occum\'s Razor is active! It auto-selects the best Copilot model for each task.',
    'Try it now (Ctrl+Shift+R)',
    'Show models',
    'Dismiss',
  );

  await context.globalState.update('occums.welcomed', true);

  if (choice === 'Try it now (Ctrl+Shift+R)') {
    await openChatCommand();
  } else if (choice === 'Show models') {
    await vscode.commands.executeCommand('occums.showModels');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleChat(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
): Promise<vscode.ChatResult> {

  // Handle slash commands
  if (request.command === 'models') {
    return handleModelsCommand(stream, token);
  }
  if (request.command === 'analyze') {
    return handleAnalyzeCommand(request.prompt, stream);
  }
  if (request.command === 'config') {
    return handleConfigCommand(stream);
  }

  // ── Main flow: auto-select model and respond ──
  const prompt = request.prompt;
  if (!prompt.trim()) {
    stream.markdown('## 🪒 Occum\'s Razor\n\n');
    stream.markdown('I automatically pick the best Copilot model for your task.\n\n');
    stream.markdown('**Just ask me anything!** Type your question and I\'ll route it to the right model.\n\n');
    stream.markdown('| Shortcut | Action |\n');
    stream.markdown('|----------|--------|\n');
    stream.markdown('| `Ctrl+Shift+R` | Quick ask with auto model selection |\n');
    stream.markdown('| `Ctrl+Shift+Alt+R` | Ask about selected code |\n');
    stream.markdown('| Click status bar 🪒 | Same as Ctrl+Shift+R |\n');
    stream.markdown('| `/models` | List available models |\n');
    stream.markdown('| `/analyze <prompt>` | Dry-run analysis |\n');
    stream.markdown('| `/config` | Show settings |\n');
    return {};
  }

  // 1. Analyze the task
  stream.progress('Analyzing task requirements...');
  const profile = analyzeTask(prompt);
  const dominantScore = (profile as any)[profile.dominantDimension] as number || 0;
  outputChannel.appendLine(
    `Task: "${prompt.substring(0, 60)}…" → ${profile.label} ` +
    `(${profile.dominantDimension}=${dominantScore.toFixed(2)})`
  );

  // 2. Select the best model
  stream.progress('Selecting optimal model (Occam\'s Razor)...');
  let result: SelectionResult;
  try {
    result = await selectModel(profile);
    outputChannel.appendLine(
      `  → Selected: ${result.selected.profile.displayName} ` +
      `(complexity=${result.selected.complexityScore.toFixed(3)})`
    );
  } catch (err: any) {
    outputChannel.appendLine(`  → Error: ${err.message}, falling back to default`);
    stream.markdown(`> ⚠️ Could not auto-select model: ${err.message}. Using your default model.\n\n`);
    return respondWithModel(request.model, prompt, context, stream, token, profile, undefined);
  }

  // 3. Update status bar
  updateStatusBar(result.selected.profile.displayName);

  // 4. Show reasoning (concise one-liner)
  const showReasoning = vscode.workspace.getConfiguration('occums').get<boolean>('showReasoning', true);
  if (showReasoning) {
    stream.markdown(`> 🪒 **Auto-selected: ${result.selected.profile.displayName}** — ${getShortReason(result)}\n\n`);
  }

  // 5. Route to the selected model and stream response
  return respondWithModel(result.selected.model, prompt, context, stream, token, profile, result);
}

function getShortReason(result: SelectionResult): string {
  const task = result.task;
  const sel = result.selected;

  if (task.label === 'greeting' || task.label === 'acknowledgement' || task.label === 'simple') {
    return 'Simple task → lightest model saves cost & time';
  }

  const dim = task.dominantDimension;
  const needed = ((task as any)[dim] as number * 100).toFixed(0);
  const provides = ((sel.profile as any)[dim] as number * 100).toFixed(0);
  return `Needs ${dim} ≥${needed}%, provides ${provides}% at lowest complexity (${sel.complexityScore.toFixed(3)})`;
}

async function respondWithModel(
  model: vscode.LanguageModelChat,
  prompt: string,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  profile: TaskProfile,
  result: SelectionResult | undefined,
): Promise<vscode.ChatResult> {
  const messages: vscode.LanguageModelChatMessage[] = [];

  // System-like instruction
  const systemPrompt = buildSystemPrompt(profile);
  messages.push(vscode.LanguageModelChatMessage.User(systemPrompt));

  // Add relevant history (last 6 turns)
  const previousMessages = chatContext.history.filter(
    (h): h is vscode.ChatResponseTurn => h instanceof vscode.ChatResponseTurn
  );
  for (const turn of previousMessages.slice(-6)) {
    let fullMessage = '';
    for (const part of turn.response) {
      if ('value' in part && typeof (part as any).value?.value === 'string') {
        fullMessage += (part as any).value.value;
      }
    }
    if (fullMessage) {
      messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
    }
  }

  // The actual user prompt
  messages.push(vscode.LanguageModelChatMessage.User(prompt));

  try {
    const response = await model.sendRequest(messages, {}, token);
    for await (const fragment of response.text) {
      stream.markdown(fragment);
    }
  } catch (err: any) {
    if (err instanceof vscode.LanguageModelError) {
      stream.markdown(`\n\n> ⚠️ **${model.name} error:** ${err.message}\n`);

      // Auto-fallback to next best model
      if (result && result.adequate.length > 1) {
        const fallback = result.adequate[1];
        stream.markdown(`> Trying fallback: **${fallback.profile.displayName}**…\n\n`);
        try {
          const fbResponse = await fallback.model.sendRequest(messages, {}, token);
          for await (const fragment of fbResponse.text) {
            stream.markdown(fragment);
          }
        } catch {
          stream.markdown('\n> Fallback also failed. Please try again.\n');
        }
      }
    } else {
      stream.markdown(`\n\n> ⚠️ **Error:** ${err.message}\n`);
    }
  }

  return {};
}

function buildSystemPrompt(profile: TaskProfile): string {
  const parts: string[] = [
    'You are a helpful AI coding assistant in VS Code.',
  ];

  if (profile.code > 0.3) {
    parts.push('Focus on providing correct, well-structured code with clear explanations.');
  }
  if (profile.reasoning > 0.5) {
    parts.push('Think step by step. Show your reasoning clearly.');
  }
  if (profile.creativity > 0.3) {
    parts.push('Be creative and original in your response.');
  }
  if (profile.precision > 0.3) {
    parts.push('Prioritize accuracy. If unsure, state your uncertainty.');
  }

  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Slash command handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleModelsCommand(
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
): Promise<vscode.ChatResult> {
  stream.progress('Discovering available models...');

  const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });

  if (models.length === 0) {
    stream.markdown('**No Copilot models found.** Make sure GitHub Copilot Chat is active.\n');
    return {};
  }

  stream.markdown('## 🪒 Available Copilot Models\n\n');
  stream.markdown('| Model | Family | Max Tokens | Profile | Cost Tier |\n');
  stream.markdown('|-------|--------|-----------|---------|----------|\n');

  for (const m of models) {
    const profile = findProfile(m.family);
    const tier = profile
      ? `${'💰'.repeat(Math.ceil(profile.costTier * 5))} (${(profile.costTier * 100).toFixed(0)}%)`
      : '❓ unknown';
    const name = profile?.displayName ?? m.name;
    stream.markdown(
      `| ${name} | \`${m.family}\` | ${m.maxInputTokens.toLocaleString()} | ${profile ? '✅' : '❓'} | ${tier} |\n`
    );
  }

  stream.markdown('\n---\n\n');
  stream.markdown(`**${models.length} model(s)** available. Selection is fully automatic.\n\n`);
  stream.markdown('**Ways to use:**\n');
  stream.markdown('- `Ctrl+Shift+R` — Quick ask (or click the 🪒 in the status bar)\n');
  stream.markdown('- `Ctrl+Shift+Alt+R` — Ask about selected code\n');
  stream.markdown('- Type `@occums` in chat — stays sticky after first use\n');

  return {};
}

async function handleAnalyzeCommand(
  prompt: string,
  stream: vscode.ChatResponseStream,
): Promise<vscode.ChatResult> {
  if (!prompt.trim()) {
    stream.markdown('**Usage:** `@occums /analyze <your task or prompt>`\n\n');
    stream.markdown('Shows which model would be selected without running the request.\n');
    return {};
  }

  const profile = analyzeTask(prompt);

  stream.markdown('## 🔍 Task Analysis\n\n');
  stream.markdown(`**Prompt:** ${prompt}\n\n`);
  stream.markdown(`**Classification:** \`${profile.label}\`\n\n`);
  stream.markdown(`**Dominant dimension:** \`${profile.dominantDimension}\`\n\n`);
  stream.markdown('### Capability Requirements\n\n');
  stream.markdown(profileToMarkdown(profile));
  stream.markdown('\n\n');

  try {
    const result = await selectModel(profile);
    stream.markdown('### 🪒 Model Selection\n\n');
    stream.markdown(resultToMarkdown(result));
    stream.markdown('\n\n');
    stream.markdown(`**Verdict:** Would use **${result.selected.profile.displayName}** for this task.\n`);
  } catch (err: any) {
    stream.markdown(`\n**Error:** ${err.message}\n`);
  }

  return {};
}

async function handleConfigCommand(
  stream: vscode.ChatResponseStream,
): Promise<vscode.ChatResult> {
  const cfg = getConfig();

  stream.markdown('## ⚙️ Occum\'s Razor Configuration\n\n');
  stream.markdown('| Setting | Value | Description |\n');
  stream.markdown('|---------|-------|-------------|\n');
  stream.markdown(`| Headroom | ${(cfg.headroom * 100).toFixed(0)}% | Extra capability margin |\n`);
  stream.markdown(`| Cost weight | ${(cfg.costWeight * 100).toFixed(0)}% | Importance of cost |\n`);
  stream.markdown(`| Speed weight | ${(cfg.speedWeight * 100).toFixed(0)}% | Importance of speed |\n`);
  stream.markdown(`| Size weight | ${(cfg.sizeWeight * 100).toFixed(0)}% | Importance of model size |\n`);
  stream.markdown(`| Provider pref | ${cfg.preferredProvider || 'none'} | Preferred provider |\n`);
  stream.markdown(`| Show reasoning | ${vscode.workspace.getConfiguration('occums').get('showReasoning', true)} | Show selection reasoning |\n`);
  stream.markdown('\n');
  stream.markdown('Edit in **Settings → Extensions → Occum\'s Razor** or `settings.json`.\n');

  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: any[]) => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(() => fn(...args), ms);
  }) as any as T;
}
