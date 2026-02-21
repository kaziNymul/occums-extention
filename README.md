<p align="center">
  <img src="images/icon.png" alt="Occum's Razor Logo" width="128" height="128">
</p>

<h1 align="center">🪒 Occum's Razor — Smart Copilot Model Selector</h1>

<p align="center">
  <strong>Automatically selects the simplest adequate Copilot model for every task.</strong><br>
  <em>"Among models that adequately solve a task, prefer the simplest one."</em>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=occums.occums-razor-model-selector"><img src="https://img.shields.io/visual-studio-marketplace/v/occums.occums-razor-model-selector?style=for-the-badge&color=blue&label=VS%20Code%20Marketplace" alt="Marketplace Version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=occums.occums-razor-model-selector"><img src="https://img.shields.io/visual-studio-marketplace/i/occums.occums-razor-model-selector?style=for-the-badge&color=green&label=Installs" alt="Installs"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/kaziNymul/occums-extention?style=for-the-badge" alt="License"></a>
</p>

---

## 🤔 The Problem

GitHub Copilot now offers **multiple AI models** — GPT-4o, GPT-4o Mini, Claude Sonnet, Claude Opus, Gemini Flash, o1, and more. Each has different strengths, speeds, and costs.

**But which one should you use?**

- Using **GPT-4o** to answer *"What's 2+2?"* is like driving a Ferrari to the mailbox 🏎️
- Using **GPT-4o Mini** to *prove a mathematical theorem* will leave you frustrated 😤
- Manually switching models for every question is tedious and error-prone 😩

## ✨ The Solution

**Occum's Razor** applies the principle of [Occam's Razor](https://en.wikipedia.org/wiki/Occam%27s_razor) to model selection:

> ***Don't use a sledgehammer when a tack hammer works.***

The extension **automatically analyzes your task** and **routes it to the simplest model that can handle it well** — saving you money, reducing latency, and only using expensive frontier models when you genuinely need them.

---

## 🎯 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  You ask: "Write a binary search in Python"                     │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  1. ANALYZE   │──▶│  2. FILTER    │──▶│  3. SELECT   │        │
│  │              │   │              │   │              │        │
│  │ Scores your  │   │ Removes weak │   │ Picks the    │        │
│  │ task on 6    │   │ models that  │   │ SIMPLEST     │        │
│  │ dimensions   │   │ can't handle │   │ adequate one │        │
│  │              │   │ the task     │   │              │        │
│  │ code = 75%   │   │ ❌ Mini      │   │ ✅ Sonnet    │        │
│  │ reasoning=35%│   │ ✅ Sonnet    │   │              │        │
│  │              │   │ ✅ GPT-4o    │   │ (cheapest    │        │
│  │              │   │ ✅ o1        │   │  of the ✅s)  │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                                                                 │
│  Result: Claude Sonnet answers (not o1 at 10x the cost!)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The 6 Capability Dimensions

Every prompt is scored across these dimensions (each 0–100%):

| Dimension | Icon | What Triggers It | Example |
|-----------|------|-----------------|---------|
| **Reasoning** | 🧠 | "explain", "prove", "step by step", math terms | *"Prove this theorem by induction"* |
| **Creativity** | 🎨 | "write", "story", "brainstorm", tone/style | *"Write a creative poem about coding"* |
| **Knowledge** | 📚 | "what is", "define", domain terms | *"What is the capital of France?"* |
| **Code** | 💻 | "function", "debug", language names, code fences | *"Write a Python sort function"* |
| **Context** | 📏 | "summarize", long prompts, "entire file" | *"Summarize this 50-page document"* |
| **Precision** | 🎯 | "exact", "verify", legal/medical/financial terms | *"Audit this security configuration"* |

---

## 🚀 Quick Start

### Three Ways to Use (Pick Any!)

#### 1️⃣ Keyboard Shortcut (Fastest)
Press **`Ctrl+Shift+R`** (or **`Cmd+Shift+R`** on Mac) → type your question → done!

#### 2️⃣ Status Bar (Always Visible)
Look at the bottom-right of VS Code — you'll see a **🪒** with the currently recommended model. **Click it** to open the smart prompt box.

#### 3️⃣ Chat Directly
Open Copilot Chat and type:
```
@occums Write a binary search in Python
```
The `@occums` participant is **sticky** — once you use it, all messages in that chat session route through it automatically.

### Code Selection Shortcut
1. **Select some code** in your editor
2. Press **`Ctrl+Shift+Alt+R`** (or **`Cmd+Shift+Alt+R`** on Mac)
3. Pick an action: Explain / Fix / Refactor / Test / Optimize / Document
4. The right model handles it!

---

## 📊 Model Selection Examples

Here's what Occum's Razor picks for different tasks:

| Your Prompt | Selected Model | Why |
|-------------|---------------|-----|
| *"Hi there!"* | GPT-4o Mini ⚡ | Trivial → cheapest, fastest |
| *"What is the capital of France?"* | GPT-4o Mini ⚡ | Simple fact → no need for frontier |
| *"Write a Python sort function"* | Claude Sonnet 💻 | Needs code capability → mid-tier |
| *"Debug this stack trace"* | Claude Sonnet 💻 | Code + debugging → mid-tier |
| *"Compare microservices vs monoliths"* | GPT-4o 🎯 | Reasoning + knowledge → balanced |
| *"Write a creative sci-fi story"* | GPT-4o 🎨 | Needs creativity → mid-tier |
| *"Prove sum of odd numbers = n²"* | o1 / Opus 🧠 | Heavy reasoning → frontier |
| *"Summarize this 50-page contract"* | Gemini Pro 📏 | Long context + precision |

**The key insight:** You're not always paying for the most expensive model. Simple tasks use simple models. Complex tasks escalate automatically.

---

## 🔧 Slash Commands

| Command | What It Does |
|---------|-------------|
| `@occums /models` | 📋 List all available Copilot models with capability profiles |
| `@occums /analyze <prompt>` | 🔍 Dry-run: see which model would be selected (without executing) |
| `@occums /config` | ⚙️ Show current configuration and shortcuts |

---

## ⚙️ Configuration

Fine-tune what "simplest" means for your workflow in **Settings → Extensions → Occum's Razor**:

```jsonc
{
  // Extra capability margin above minimum (0 = exact match, 0.1 = 10%)
  "occums.headroom": 0.05,

  // How "simplicity" is calculated (weights should roughly sum to 1.0)
  "occums.costWeight": 0.4,     // 💰 Prioritize cost savings
  "occums.speedWeight": 0.35,   // ⚡ Prioritize speed/latency
  "occums.sizeWeight": 0.25,    // 📦 Prioritize smaller models

  // Prefer a specific provider (still picks the best from that provider)
  "occums.preferredProvider": "",  // "openai" | "anthropic" | "google" | ""

  // Show why a model was selected before each response
  "occums.showReasoning": true
}
```

### Tuning Tips

| If you want... | Set this |
|----------------|---------|
| **Cheapest possible** | `costWeight: 0.7, speedWeight: 0.2, sizeWeight: 0.1` |
| **Fastest responses** | `costWeight: 0.1, speedWeight: 0.7, sizeWeight: 0.2` |
| **Always use OpenAI** | `preferredProvider: "openai"` |
| **More safety margin** | `headroom: 0.15` (models must exceed needs by 15%) |
| **Hide reasoning** | `showReasoning: false` |

---

## 🏗️ Architecture

```
src/
├── extension.ts       Entry point — chat participant, status bar, commands
├── taskAnalyzer.ts    Heuristic task classification → TaskProfile
├── modelProfiles.ts   Known model capabilities & cost profiles
└── selector.ts        Core algorithm: filter → rank → select simplest
```

### The Selection Algorithm

```
                    ┌─────────────┐
                    │ User Prompt │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  CLASSIFY   │  (zero-cost heuristics, no LLM call)
                    │             │
                    │  reasoning  │──── 0.35
                    │  creativity │──── 0.00
                    │  knowledge  │──── 0.00
                    │  code       │──── 0.75  ◄── dominant
                    │  context    │──── 0.00
                    │  precision  │──── 0.00
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   FILTER    │  Remove models below capability needs
                    │             │
                    │  Mini  ❌   │  code=0.50 < 0.75 required
                    │  Flash ❌   │  code=0.50 < 0.75 required
                    │  Sonnet ✅  │  code=0.88 ≥ 0.75 ✓
                    │  GPT-4o ✅  │  code=0.78 ≥ 0.75 ✓
                    │  Opus  ✅   │  code=0.90 ≥ 0.75 ✓ (overkill)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    RANK     │  Sort by complexity score (ascending)
                    │             │
                    │  1. Sonnet  │  complexity = 0.283
                    │  2. GPT-4o  │  complexity = 0.350
                    │  3. Opus    │  complexity = 0.800
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   SELECT    │  Pick #1 = simplest adequate model
                    │             │
                    │  → Sonnet   │  🪒 Occam's Razor: simplest wins!
                    └─────────────┘
```

---

## 🧠 The Principle

**Occam's Razor** (*lex parsimoniae*):

> *"Entities should not be multiplied beyond necessity."*
> — William of Ockham, ~1323

Applied to AI model selection:

> **Don't burn $0.04/1k-token reasoning model capacity to answer "What's 2+2?"**
> A $0.0001/1k-token mini model handles it perfectly.
>
> But when you *do* need deep reasoning, frontier code generation, or creative writing — the system automatically escalates to a model that can deliver.

**You get the right tool for every job — automatically.**

---

## 📦 Known Model Profiles

The extension includes built-in profiles for these model families:

| Model | Provider | Strengths | Cost Tier |
|-------|----------|-----------|-----------|
| **GPT-4o Mini** | OpenAI | Fast, cheap, good for simple tasks | 💰 |
| **Claude 3.5 Haiku** | Anthropic | Fast, cheap, good context | 💰 |
| **Gemini Flash** | Google | Very fast, huge context window | 💰 |
| **GPT-4o** | OpenAI | Well-rounded, strong knowledge | 💰💰💰 |
| **Claude Sonnet** | Anthropic | Excellent code, great reasoning | 💰💰 |
| **Gemini Pro** | Google | Long context specialist | 💰💰 |
| **o1 / o1-mini** | OpenAI | Deep reasoning specialist | 💰💰💰💰 |
| **o3** | OpenAI | Frontier reasoning | 💰💰💰💰💰 |
| **Claude Opus** | Anthropic | Frontier all-rounder | 💰💰💰💰 |

Unknown models get a conservative mid-tier profile so they aren't unfairly excluded.

---

## 🤝 Contributing

Contributions are welcome! Some ideas:

- **Add new model profiles** as new models are released
- **Improve the task classifier** with better heuristics or a fine-tuned micro-model
- **Add benchmark data** to validate model-task fit
- **Suggest UX improvements** for the status bar or shortcuts

```bash
# Clone and develop
git clone https://github.com/kaziNymul/occums-extention.git
cd occums-extention
npm install
npm run compile

# Launch Extension Development Host
# Press F5 in VS Code
```

---

## 📋 Requirements

- **VS Code** ≥ 1.95
- **GitHub Copilot Chat** extension installed
- An active **Copilot subscription** with model access

---

## 📄 License

[MIT](LICENSE) — use it, modify it, share it.

---

<p align="center">
  <strong>🪒 Stop overpaying for AI. Let Occam decide.</strong>
</p>
