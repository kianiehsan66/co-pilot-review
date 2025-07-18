#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running co-pilot-review tests...\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(testName, testFn) {
  testsTotal++;
  console.log(`🔍 Testing: ${testName}`);
  
  try {
    testFn();
    console.log(`✅ PASSED: ${testName}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
  }
  console.log('');
}

// Test 1: Help command works
runTest('Help command execution', () => {
  const result = execSync('node index.js --help', { encoding: 'utf-8' });
  if (!result.includes('co-pilot-review - AI-assisted code review tool')) {
    throw new Error('Help output does not contain expected content');
  }
  if (!result.includes('Usage: cp-review [options]')) {
    throw new Error('Help output does not contain usage information');
  }
});

// Test 2: File exists and is executable
runTest('Index file exists and is executable', () => {
  if (!fs.existsSync('index.js')) {
    throw new Error('index.js file does not exist');
  }
  
  const stats = fs.statSync('index.js');
  if (!(stats.mode & parseInt('100', 8))) {
    throw new Error('index.js is not executable');
  }
});

// Test 3: Package.json has correct bin configuration
runTest('Package.json bin configuration', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  if (!packageJson.bin || !packageJson.bin['cp-review']) {
    throw new Error('package.json missing bin configuration for cp-review');
  }
  if (packageJson.bin['cp-review'] !== './index.js') {
    throw new Error('package.json bin points to wrong file');
  }
});

// Test 4: Required files exist
runTest('Required files exist', () => {
  const requiredFiles = ['README.md', 'CHANGELOG.md', '.gitignore'];
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file ${file} does not exist`);
    }
  });
});

// Test 5: Git repository context (if in git repo)
runTest('Git repository handling', () => {
  try {
    // This should work since we're in a git repo
    execSync('git rev-parse --show-toplevel', { stdio: 'ignore' });
    
    // Test that the tool fails gracefully with non-existent branches
    try {
      execSync('node index.js --base non-existent-branch --target HEAD 2>&1', { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      throw new Error('Should have failed with non-existent branch');
    } catch (error) {
      // This is expected - the tool should fail with non-existent branches
      const errorOutput = error.stdout || '';
      if (!errorOutput.includes('does not exist') && !errorOutput.includes('not accessible')) {
        throw new Error(`Expected branch validation error, got: ${errorOutput}`);
      }
    }
  } catch (error) {
    if (error.message.includes('not a git repository')) {
      console.log('   ℹ️  Skipping git tests (not in git repository)');
      return;
    }
    throw error;
  }
});

// Test 6: Argument parsing
runTest('Command line argument parsing', () => {
  // Test that help works without git repository
  const helpOutput = execSync('node index.js --help', { encoding: 'utf-8' });
  if (!helpOutput.includes('--base') || !helpOutput.includes('--target')) {
    throw new Error('Help output missing argument documentation');
  }
});

// Test 7: Shebang line exists
runTest('Shebang line in index.js', () => {
  const content = fs.readFileSync('index.js', 'utf-8');
  if (!content.startsWith('#!/usr/bin/env node')) {
    throw new Error('index.js missing proper shebang line');
  }
});

// Summary
console.log('📊 Test Results:');
console.log(`   Passed: ${testsPassed}/${testsTotal}`);
console.log(`   Failed: ${testsTotal - testsPassed}/${testsTotal}`);

if (testsPassed === testsTotal) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('💥 Some tests failed!');
  process.exit(1);
}
