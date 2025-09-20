const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, '..', 'src');

// Get all function directories
const functions = fs.readdirSync(srcDir).filter(name => {
    const fullPath = path.join(srcDir, name);
    return fs.statSync(fullPath).isDirectory();
});

console.log('Installing dependencies for functions:', functions);

functions.forEach((functionName) => {
    const functionDir = path.join(srcDir, functionName);

    console.log(`Installing dependencies for ${functionName}...`);

    try {
        execSync('npm install', {
            cwd: functionDir,
            stdio: 'inherit'
        });
    } catch (error) {
        console.error(`Failed to install dependencies for ${functionName}:`, error.message);
        process.exit(1);
    }
});

console.log('All dependencies installed!');