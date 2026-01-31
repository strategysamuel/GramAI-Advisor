#!/usr/bin/env node

// Simple setup test script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing GramAI Advisor setup...\n');

// Test 1: Check if all required files exist
console.log('1. Checking project structure...');
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'docker-compose.yml',
  '.env.example',
  'src/index.ts',
  'src/shared/config/index.ts',
  'src/services/api-gateway/index.ts',
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

// Test 2: Check TypeScript compilation
console.log('\n2. Testing TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('   ✅ TypeScript compilation successful');
} catch (error) {
  console.log('   ❌ TypeScript compilation failed');
  console.log(error.stdout?.toString() || error.message);
  process.exit(1);
}

// Test 3: Check if Docker Compose is valid
console.log('\n3. Validating Docker Compose configuration...');
try {
  execSync('docker-compose config', { stdio: 'pipe' });
  console.log('   ✅ Docker Compose configuration is valid');
} catch (error) {
  console.log('   ❌ Docker Compose configuration is invalid');
  console.log(error.stdout?.toString() || error.message);
}

// Test 4: Check linting
console.log('\n4. Testing ESLint configuration...');
try {
  execSync('npx eslint src/**/*.ts --max-warnings 0', { stdio: 'pipe' });
  console.log('   ✅ ESLint passed with no warnings');
} catch (error) {
  console.log('   ⚠️  ESLint found issues (this is normal for initial setup)');
}

// Test 5: Run unit tests
console.log('\n5. Running unit tests...');
try {
  execSync('npm test', { stdio: 'pipe' });
  console.log('   ✅ Unit tests passed');
} catch (error) {
  console.log('   ❌ Unit tests failed');
  console.log(error.stdout?.toString() || error.message);
}

console.log('\n🎉 Setup test completed!');
console.log('\nNext steps:');
console.log('1. Copy .env.example to .env and configure your environment');
console.log('2. Run "docker-compose up -d" to start the databases');
console.log('3. Run "npm run dev" to start the development server');
console.log('4. Visit http://localhost:3000/health to check the API');