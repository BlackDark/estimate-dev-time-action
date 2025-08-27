# Estimate PR Development Time Action

A GitHub Action that uses AI to estimate how long it would take developers of different skill levels to implement the changes in a Pull Request.

## Features

- 🕒 Estimates development time for Junior, Senior, and Expert developers
- 🤖 Uses OpenRouter AI models with official OpenAI SDK for robust API handling
- 💬 Automatically adds/updates comments on PRs with estimates
- 🎛️ Configurable skill levels and AI models
- 🆓 Free model available by default

## Usage

### Basic Usage

Create a workflow file (e.g., `.github/workflows/estimate-dev-time.yml`):

```yaml
name: Estimate PR Development Time

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  estimate:
    runs-on: ubuntu-latest
    steps:
      - name: Estimate Development Time
        uses: your-username/estimate-dev-time-action@v1
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

### Advanced Usage

```yaml
name: Estimate PR Development Time

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  estimate:
    runs-on: ubuntu-latest
    steps:
      - name: Estimate Development Time
        uses: your-username/estimate-dev-time-action@v1
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          model: 'openai/gpt-3.5-turbo'  # Optional: specify a different model
          skill-levels: 'Junior,Senior'  # Optional: only estimate for specific levels
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `openrouter-api-key` | Your OpenRouter API key | ✅ | - |
| `model` | OpenRouter model to use | ❌ | `meta-llama/llama-3.2-3b-instruct:free` |
| `skill-levels` | Comma-separated skill levels to estimate | ❌ | `Junior,Senior,Expert` |
| `github-token` | GitHub token for API access | ❌ | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `estimations` | JSON object with time estimations for each skill level |
| `skill-levels` | Comma-separated list of estimated skill levels |

## Setup

### 1. Get an OpenRouter API Key

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Create an API key
3. Add it to your repository secrets as `OPENROUTER_API_KEY`

### 2. Configure Repository Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret:

- **Name**: `OPENROUTER_API_KEY`
- **Value**: Your OpenRouter API key

### 3. Create Workflow File

Create `.github/workflows/estimate-dev-time.yml` with the configuration above.

## Example Output

The action will add a comment to your PR that looks like this:

---

## 🕒 Development Time Estimation

This PR has been analyzed to estimate development time for different skill levels:

### 🌱 Junior Developer
- **⏱️ Time Estimate:** 4-6 hours
- **🎯 Complexity:** 🟡 Medium
- **💭 Reasoning:** Would need time to understand the existing codebase structure and research the implementation patterns used.

### 🚀 Senior Developer
- **⏱️ Time Estimate:** 2-3 hours
- **🎯 Complexity:** 🟢 Low
- **💭 Reasoning:** Has experience with similar patterns and can implement efficiently with proper testing.

### ⭐ Expert Developer
- **⏱️ Time Estimate:** 1-2 hours
- **🎯 Complexity:** 🟢 Low
- **💭 Reasoning:** Can quickly identify optimal implementation approach and consider system-wide implications.

---

## Supported Models

The action uses OpenRouter, which provides access to many AI models. The default free model is `meta-llama/llama-3.2-3b-instruct:free`. 

Popular alternatives include:
- `openai/gpt-3.5-turbo`
- `anthropic/claude-3-haiku`
- `google/gemini-pro`
- `meta-llama/llama-3.1-8b-instruct`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.