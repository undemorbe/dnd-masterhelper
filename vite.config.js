import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { buildContent } from './scripts/content.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.join(root, 'content')

// Тексты методички (content/*.txt) превращаются в модуль `virtual:content`.
// В dev-режиме правка любого .txt перезагружает страницу.
function contentPlugin() {
  const id = 'virtual:content'
  const resolved = '\0' + id
  return {
    name: 'dnd-content',
    resolveId(source) {
      if (source === id) return resolved
    },
    load(source) {
      if (source !== resolved) return
      for (const f of fs.readdirSync(contentDir)) this.addWatchFile(path.join(contentDir, f))
      return `export default ${JSON.stringify(buildContent(contentDir))}`
    },
  }
}

export default defineConfig({
  // Относительный base: сборка работает на любом пути GitHub Pages
  // (https://<user>.github.io/<repo>/) без правки конфига. Маршрутизация — через hash.
  base: './',
  plugins: [vue(), contentPlugin()],
  build: {
    // Тексты методички (~1 МБ, ~200 КБ gzip) — отдельным чанком, чтобы правка
    // текста не сбрасывала кэш кода приложения и наоборот.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'content', test: /virtual:content/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
})
