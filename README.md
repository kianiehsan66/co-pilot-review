# co-pilot-review

AI-assisted code review tool that analyzes git changes and posts reviews to pull requests using GitHub Copilot.

## Features

- 🤖 AI-powered code review using GitHub Copilot
- 📋 Analyzes git diff between current branch and main
- 📝 Posts formatted review comments to pull requests
- ⚙️ Customizable coding guidelines
- 🔄 Interactive workflow with Copilot Chat

## Installation

Install globally via npm:

```bash
npm install -g co-pilot-review
```

Or install globally via yarn:

```bash
yarn global add co-pilot-review
```

## Usage

### Basic Usage
Run the command in your git repository:

```bash
yarn cp-review
```

Or if installed via npm:

```bash
npx cp-review
```

### Advanced Usage - Branch Selection

**Compare specific branches:**
```bash
# Compare feature-branch with main
cp-review --base main --target feature-branch

# Compare current branch with develop
cp-review --base origin/develop

# Compare two specific branches
cp-review -b origin/main -t feature/user-auth
```

**Interactive mode:**
```bash
# Launch interactive branch selection
cp-review --interactive
cp-review -i
```

**Get help:**
```bash
cp-review --help
cp-review -h
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help message | - |
| `--base <branch>` | `-b` | Base branch to compare against | `origin/main` |
| `--target <branch>` | `-t` | Target branch to compare | `HEAD` |
| `--interactive` | `-i` | Interactive branch selection | `false` |

### Examples

```bash
# Default: Compare current branch with origin/main
cp-review

# Compare with different base branch
cp-review --base origin/develop

# Compare specific branches
cp-review --base main --target feature-branch

# Compare with remote branch
cp-review --base origin/main --target origin/feature-branch

# Interactive mode (shows available branches)
cp-review --interactive
```

## Prerequisites

1. **Git repository**: Must be run from within a git repository
2. **GitHub CLI**: Must have `gh` CLI installed and authenticated
3. **Custom guidelines**: Create a `custom-coding-review-guidelines.md` file in your project root
4. **GitHub Copilot**: Must have access to GitHub Copilot Chat
5. **Pull Request**: Must be run from a branch with an open pull request

## How it works

1. **Detects changes**: Analyzes git diff between current branch and main
2. **Generates prompt**: Creates a structured prompt with your custom guidelines
3. **Copies to clipboard**: Automatically copies the prompt to your clipboard
4. **Copilot interaction**: You paste the prompt into Copilot Chat (Agent mode, Edit mode)
5. **Waits for response**: Monitors for the JSON response file creation
6. **Posts review**: Formats and posts the review as a pull request comment

## Custom Guidelines

Create a `custom-coding-review-guidelines.md` file in your project root with your specific coding standards and review criteria. This file will be included in the AI prompt to ensure consistent reviews.

Example:
```markdown
# Custom Coding Review Guidelines

## Code Quality
- Ensure proper error handling
- Use meaningful variable names
- Follow consistent formatting

## Security
- Validate all inputs
- Avoid hardcoded secrets
- Use secure coding practices
```

## Requirements

- Node.js >= 14.0.0
- Git
- GitHub CLI (`gh`)
- GitHub Copilot access

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## License

ISC
