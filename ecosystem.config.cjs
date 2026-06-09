const appRoot = __dirname;

module.exports = {
    apps: [
        {
            name: 'voca-loop',
            cwd: appRoot,
            script: 'python3',
            args: '-m uvicorn backend.app.main:app --host 0.0.0.0 --port 3050',
            interpreter: 'none',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                ENVIRONMENT: 'production',
                PORT: 3050,
                PYTHONPATH: appRoot,
                CODEX_BIN: '/home/ubuntu/.nvm/versions/node/v22.17.1/bin/codex',
                PIPER_BIN: '/home/ubuntu/.local/share/vocaloop/piper/bin/piper',
                PIPER_VOICE_MODEL: '/home/ubuntu/.local/share/vocaloop/piper/voices/en_US-amy-medium/en_US-amy-medium.onnx',
                PIPER_VOICE_CONFIG: '/home/ubuntu/.local/share/vocaloop/piper/voices/en_US-amy-medium/en_US-amy-medium.onnx.json',
                PIPER_TIMEOUT_SECONDS: '10',
            },
        },
    ],
};
