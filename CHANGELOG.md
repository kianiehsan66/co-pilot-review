# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-07-18

### Added
- **Branch Selection**: Advanced options to specify which branches to compare
  - `--base` / `-b`: Set base branch to compare against (default: `origin/main`)  
  - `--target` / `-t`: Set target branch to compare (default: `HEAD`)
  - `--interactive` / `-i`: Interactive mode to select branches (shows available branches)
  - `--help` / `-h`: Show help message with usage examples

### Changed
- Enhanced error handling for invalid branches
- Updated help message and documentation
- Improved CLI argument parsing
- Better error messages for git repository requirements

### Fixed
- Help command now works without requiring a git repository
- Branch validation to prevent errors with non-existent branches

## [1.0.0] - 2025-07-18

### Added
- Initial release of co-pilot-review
- AI-assisted code review using GitHub Copilot
- Automatic git diff analysis
- Pull request comment posting
- Custom coding guidelines support
- Interactive workflow with temp file monitoring
