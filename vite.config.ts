import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readdirSync, statSync } from 'fs'

// Discover all Lambda function entry points
function getEntryPoints(): Record<string, string> {
  const srcDir = resolve(__dirname, 'src')
  const entries: Record<string, string> = {}

  // Scan src directory for Lambda functions
  const srcContents = readdirSync(srcDir)
  for (const item of srcContents) {
    const itemPath = resolve(srcDir, item)
    if (statSync(itemPath).isDirectory()) {
      const indexPath = resolve(itemPath, 'index.ts')
      try {
        statSync(indexPath)
        entries[item] = indexPath
      } catch {
        // index.ts doesn't exist, skip this directory
      }
    }
  }

  return entries
}

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: getEntryPoints(),
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}/index.js`
    },
    rollupOptions: {
      external: ['aws-lambda'],
      output: {
        preserveModules: false,
        entryFileNames: '[name]/index.js'
      }
    },
    target: 'node18',
    minify: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})