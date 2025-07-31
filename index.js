#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    baseBranch: 'origin/main',
    targetBranch: 'HEAD',
    help: false,
    interactive: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--base' || arg === '-b') {
      options.baseBranch = args[i + 1];
      i++; // Skip next arg since we used it
    } else if (arg === '--target' || arg === '-t') {
      options.targetBranch = args[i + 1];
      i++; // Skip next arg since we used it
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
🤖 co-pilot-review - AI-assisted code review tool

Usage: cp-review [options]

Options:
  -h, --help                 Show this help message
  -b, --base <branch>        Base branch to compare against (default: origin/main)
  -t, --target <branch>      Target branch to compare (default: HEAD)
  -i, --interactive          Interactive mode to select branches

Examples:
  cp-review                           # Compare HEAD with origin/main
  cp-review -b main -t feature-branch # Compare feature-branch with main
  cp-review --base origin/develop     # Compare HEAD with origin/develop  
  cp-review -i                        # Interactive branch selection
`);
}

// Get available branches
function getAvailableBranches() {
  try {
    const localBranches = execSync('git branch --format="%(refname:short)"', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean)
      .map(branch => branch.trim());
    
    const remoteBranches = execSync('git branch -r --format="%(refname:short)"', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean)
      .map(branch => branch.trim())
      .filter(branch => !branch.includes('HEAD'));
    
    return {
      local: localBranches,
      remote: remoteBranches,
      all: [...new Set([...localBranches, ...remoteBranches])].sort()
    };
  } catch (error) {
    throw new Error(`Failed to get available branches: ${error.message}`);
  }
}

// Interactive branch selection
function selectBranchesInteractively() {
  const branches = getAvailableBranches();
  
  console.log('\n📋 Available branches:');
  branches.all.forEach((branch, index) => {
    console.log(`  ${index + 1}. ${branch}`);
  });
  
  console.log('\n💡 You can also use:');
  console.log('  - HEAD (current branch)');
  console.log('  - origin/main, origin/develop, etc.');
  console.log('  - Any valid git reference');
  
  // For now, we'll return default values and add a note
  // In a full implementation, you'd use a library like 'inquirer' for interactive input
  console.log('\n⚠️  Interactive mode requires manual input. For now, using defaults.');
  console.log('💡 Use --base and --target flags to specify branches directly.');
  
  return {
    baseBranch: 'origin/main',
    targetBranch: 'HEAD'
  };
}

// Initialize git repository context
function initializeGitContext() {
  try {
    // Always run from the repo root
    process.chdir(execSync('git rev-parse --show-toplevel').toString().trim());
  } catch (error) {
    console.error('❌ Error: This command must be run from within a git repository.');
    console.error('Make sure you are in a git repository and try again.');
    process.exit(1);
  }
}

/**
 * Validate that branches exist
 */
function validateBranches(baseBranch, targetBranch) {
  try {
    // Check if base branch exists
    execSync(`git rev-parse --verify ${baseBranch}`, { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`Base branch '${baseBranch}' does not exist or is not accessible.`);
  }

  try {
    // Check if target branch exists
    execSync(`git rev-parse --verify ${targetBranch}`, { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`Target branch '${targetBranch}' does not exist or is not accessible.`);
  }
}

/**
 * Get list of changed files between specified branches
 */
function getChangedFiles(baseBranch, targetBranch) {
  try {
    const output = execSync(`git diff --name-only ${baseBranch}...${targetBranch}`, { encoding: 'utf-8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    throw new Error(`Failed to get changed files between ${baseBranch} and ${targetBranch}: ${error.message}`);
  }
}

/**
 * Get the diff for all changed files between specified branches
 */
function getAllDiffs(baseBranch, targetBranch) {
  try {
    // Get changed files and their line counts
    const numstatOutput = execSync(
      `git diff --numstat ${baseBranch}...${targetBranch}`,
      { encoding: 'utf-8' }
    );
    const filesToInclude = [];
    numstatOutput.split('\n').forEach(line => {
      if (!line.trim()) return;
      const [added, deleted, file] = line.split(/\t/);
      // Exclude lock files
      if (/^(yarn\.lock|package-lock\.json|pnpm-lock\.yaml|npm-shrinkwrap\.json)$/i.test(file)) return;
      const addedNum = parseInt(added, 10);
      const deletedNum = parseInt(deleted, 10);
      const total = (isNaN(addedNum) ? 0 : addedNum) + (isNaN(deletedNum) ? 0 : deletedNum);
      if (total <= 1000) {
        filesToInclude.push(file);
      }
    });
    if (filesToInclude.length === 0) {
      return '';
    }
    // Generate the diff only for the filtered files
    const diff = execSync(
      `git diff ${baseBranch}...${targetBranch} -- ${filesToInclude.map(f => `'${f.replace(/'/g, "'\\''")}'`).join(' ')}`,
      { encoding: 'utf-8' }
    );
    return diff;
  } catch (error) {
    throw new Error(`Failed to get diff between ${baseBranch} and ${targetBranch}: ${error.message}`);
  }
}

/**
 * Read the custom coding review guidelines
 */
function getGuidelines() {
  const guidelinesPath = path.resolve(process.cwd(), 'co-pilot-coding-review-guidelines.md');
  const examplePath = path.resolve(__dirname, 'custom-coding-review-guidelines.md.example');
  
  if (fs.existsSync(guidelinesPath)) {
    return fs.readFileSync(guidelinesPath, 'utf-8');
  }
  
  // Warn user and use example file
  console.log('⚠️  Warning: Custom guidelines file not found!');
  console.log(`   Expected: ${guidelinesPath}`);
  console.log('   Using example guidelines instead...');
  console.log('   💡 Create your own guidelines file for customized reviews.\n');
  
  if (fs.existsSync(examplePath)) {
    return fs.readFileSync(examplePath, 'utf-8');
  }
  
  // Fallback to basic guidelines if example doesn't exist
  return `# Basic Code Review Guidelines

## General Principles
- Write clean, readable, and maintainable code
- Follow consistent naming conventions
- Use meaningful variable and function names
- Keep functions small and focused

## Error Handling
- Always handle errors appropriately
- Use try-catch blocks for async operations
- Provide meaningful error messages

## Security
- Validate all user inputs
- Avoid hardcoded secrets
- Use secure coding practices

## Documentation
- Add comments for complex logic
- Document function parameters and return values
- Keep documentation up to date with code changes`;
}

/**
 * Copy text to clipboard (macOS)
 */
function copyToClipboard(text) {
  execSync('pbcopy', { input: text });
}

/**
 * Create the message for Copilot Chat
 */
function createCopilotMessage(guidelines, diff, changedFiles, tempFilePath, baseBranch, targetBranch) {
  return `Review the following code changes based on the provided guidelines.

IMPORTANT: Create a JSON file at the path: ${tempFilePath}

The JSON file should contain your review in the exact format below. Do not include any markdown, explanations, or text outside the JSON structure in the file.IF YOU DO NOT FOLLOW THIS INSTRUCTION, I WILL NOT BE ABLE TO PROCESS YOUR REVIEW AND IT WILL BE FAILED.


## Branch Comparison:
- **Base Branch**: ${baseBranch}
- **Target Branch**: ${targetBranch}

## Guidelines to Follow:
${guidelines}

## Changed Files:
${changedFiles.map((file) => `- ${file}`).join('\n')}

## Git Diff:
\`\`\`diff
${diff}
\`\`\`

Please create the file with ONLY this JSON structure:
{
  "summary": "Brief overview of changes",
  "positivePoints": [
    "What's done well",
    "Another positive point"
  ],
  "issues": [
    {
      "file": "filename",
      "line": "line number or range",
      "description": "Issue description",
      "suggestedFix": "Code example or fix description"
    }
  ],
  "additionalNotes": [
    "Any other observations",
    "Recommendations"
  ]
}

Once you've created the file, I will automatically detect it and process the review.`;
}

/**
 * Parse JSON response from Copilot Chat
 */
function parseAndFormatResponse(jsonResponse) {
  try {
    const data = JSON.parse(jsonResponse);

    let formattedComment = '## 📋 Code Review Summary\n';
    formattedComment += `- ${data.summary}\n\n`;

    if (data.positivePoints && data.positivePoints.length > 0) {
      formattedComment += '## ✅ Positive Points\n';
      data.positivePoints.forEach((point) => {
        formattedComment += `- ${point}\n`;
      });
      formattedComment += '\n';
    }

    if (data.issues && data.issues.length > 0) {
      formattedComment += '## ⚠️ Issues & Suggestions\n';
      data.issues.forEach((issue) => {
        formattedComment += `### File: ${issue.file}\n`;
        if (issue.line) {
          formattedComment += `**Line:** ${issue.line}\n`;
        }
        formattedComment += `- ${issue.description}\n`;
        if (issue.suggestedFix) {
          formattedComment += `- **Suggested fix:** ${issue.suggestedFix}\n`;
        }
        formattedComment += '\n';
      });
    }

    if (data.additionalNotes && data.additionalNotes.length > 0) {
      formattedComment += '## 📝 Additional Notes\n';
      data.additionalNotes.forEach((note) => {
        formattedComment += `- ${note}\n`;
      });
    }

    return formattedComment;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error.message}\nResponse: ${jsonResponse}`);
  }
}
function postPRComment(body) {
  try {
    const result = execSync('gh pr comment --body-file -', {
      input: body,
      encoding: 'utf-8',
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to post PR comment: ${error.message}`);
  }
}

/**
 * Wait for temp file to be created and read it
 */
function waitForTempFile(tempFilePath) {
  return new Promise((resolve, reject) => {
    console.log(`\n⏳ Waiting for file to be created: ${tempFilePath}`);
   

    const checkInterval = 1000; // Check every 1 second
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes maximum
    let elapsedTime = 0;

    const cleanupTempFile = () => {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (error) {
        console.warn(`⚠️ Could not clean up temp file: ${error.message}`);
      }
    };

    const checkFile = () => {
      if (fs.existsSync(tempFilePath)) {
        try {
          const content = fs.readFileSync(tempFilePath, 'utf-8');
          if (content.trim()) {
            console.log('✅ File detected and content found!');
            // Clean up the temp file immediately after reading
            cleanupTempFile();
            resolve(content.trim());
            return;
          }
        } catch (error) {
          console.log("⚠️ File exists but couldn't read it yet, retrying...");
        }
      }

      elapsedTime += checkInterval;
      if (elapsedTime >= maxWaitTime) {
        // Clean up temp file on timeout
        cleanupTempFile();
        reject(new Error(`Timeout: File was not created within ${maxWaitTime / 1000} seconds`));
        return;
      }

      // Show progress every 10 seconds
      if (elapsedTime % 10000 === 0) {
        console.log(`⏳ Still waiting... (${elapsedTime / 1000}s elapsed)`);
      }

      setTimeout(checkFile, checkInterval);
    };

    checkFile();
  });
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments first
    const options = parseArgs();
    
    // Show help if requested (before git operations)
    if (options.help) {
      showHelp();
      return;
    }
    
    // Initialize git context (this will fail if not in a git repo)
    initializeGitContext();
    
    // Handle interactive mode
    if (options.interactive) {
      const selected = selectBranchesInteractively();
      options.baseBranch = selected.baseBranch;
      options.targetBranch = selected.targetBranch;
    }
    
    console.log('🚀 Starting AI-assisted code review...\n');
    console.log(`📊 Comparing: ${options.targetBranch} with ${options.baseBranch}\n`);
    
    // Validate branches exist
    console.log('🔍 Validating branches...');
    validateBranches(options.baseBranch, options.targetBranch);

    // 1 & 2. Get changed files, diff, and guidelines
    const changedFiles = getChangedFiles(options.baseBranch, options.targetBranch);
    if (changedFiles.length === 0) {
      console.log('No changed files detected between the specified branches. Exiting.');
      return;
    }

    console.log('📁 Changed files:');
    changedFiles.forEach((file) => console.log(`   - ${file}`));

    const diff = getAllDiffs(options.baseBranch, options.targetBranch);
    const guidelines = getGuidelines();

    // 3. Create temp file path and message
    const tempFilePath = path.join(process.cwd(), `code-review-temp-${Date.now()}.json`);
    const message = createCopilotMessage(guidelines, diff, changedFiles, tempFilePath, options.baseBranch, options.targetBranch);
    copyToClipboard(message);

    console.log('\n📋 Message copied to clipboard!');
   console.log('\x1b[1m\x1b[33mPlease paste it into Copilot Chat(AGENT,EDIT MODE) and hit Enter.\x1b[0m');

    // 4. Wait for temp file to be created
    const copilotResponse = await waitForTempFile(tempFilePath);

    if (!copilotResponse || copilotResponse.trim() === '') {
      console.log('No response received. Exiting.');
      return;
    }

    // 5. Parse JSON and format the response
    console.log('\n🔄 Parsing JSON response...');
    const formattedReview = parseAndFormatResponse(copilotResponse);

    // 6. Post the formatted response as a PR comment
    console.log('\n📤 Posting review to pull request...');
    const prComment = `### 🤖 AI Code Review

**Branch Comparison:** \`${options.targetBranch}\` vs \`${options.baseBranch}\`

${formattedReview}

---
*This review was generated using AI assistance based on the project's custom coding guidelines.*`;

    const result = postPRComment(prComment);
    console.log('✅ Successfully posted review to pull request!');
    console.log(result);
  } catch (error) {
    // Clean up temp file if it exists and an error occurred
    try {
      const files = fs.readdirSync(process.cwd());
      const tempFiles = files.filter(
        (file) => file.startsWith('code-review-temp-') && file.endsWith('.json'),
      );
      tempFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🧹 Cleaned up temp file: ${file}`);
        }
      });
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp files automatically');
    }

    console.error('❌ Error during code review:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
