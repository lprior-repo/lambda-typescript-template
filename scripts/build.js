const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');
const buildDir = path.join(__dirname, '..', 'build');

// Create build and dist directories
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Get all function directories
const functions = fs.readdirSync(srcDir).filter(name => {
    const fullPath = path.join(srcDir, name);
    return fs.statSync(fullPath).isDirectory();
});

console.log('Building TypeScript Lambda functions:', functions);

// First, compile TypeScript
console.log('Compiling TypeScript...');
try {
    execSync('npx tsc', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
    });
    console.log('TypeScript compilation complete!');
} catch (error) {
    console.error('TypeScript compilation failed:', error.message);
    process.exit(1);
}

// Build each function
functions.forEach(async (functionName) => {
    const functionSrcDir = path.join(srcDir, functionName);
    const functionDistDir = path.join(distDir, functionName);
    const zipPath = path.join(buildDir, `${functionName}.zip`);

    console.log(`Building ${functionName}...`);

    // Install production dependencies in function directory
    if (fs.existsSync(path.join(functionSrcDir, 'package.json'))) {
        try {
            execSync('npm ci --production', {
                cwd: functionSrcDir,
                stdio: 'inherit'
            });
        } catch (error) {
            console.error(`Failed to install dependencies for ${functionName}:`, error.message);
            process.exit(1);
        }
    }

    // Create zip archive with compiled JS and dependencies
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        console.log(`${functionName}.zip created (${archive.pointer()} bytes)`);
    });

    archive.on('error', (err) => {
        console.error(`Error creating ${functionName}.zip:`, err);
        process.exit(1);
    });

    archive.pipe(output);

    // Add compiled JavaScript files
    if (fs.existsSync(functionDistDir)) {
        archive.directory(functionDistDir, false);
    }

    // Add node_modules if they exist
    const nodeModulesPath = path.join(functionSrcDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
        archive.directory(nodeModulesPath, 'node_modules');
    }

    await archive.finalize();
});

console.log('TypeScript Lambda build complete!');