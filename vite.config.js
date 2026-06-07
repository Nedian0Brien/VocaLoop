import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3050,
        historyApiFallback: true,
    },
    test: {
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/.claude/**',
            '**/.codegraph/**',
            '**/.worktrees/**',
        ],
    },
})
