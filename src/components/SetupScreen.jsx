import React, { useState } from 'react';

const SetupScreen = () => {
    const [localApiKey, setLocalApiKey] = useState('');
    const [localFbConfig, setLocalFbConfig] = useState('');

    const handleSave = () => {
        try {
            if (!localApiKey.trim()) return alert("API Key is required");
            const fbJson = JSON.parse(localFbConfig);

            localStorage.setItem('__api_key', localApiKey);
            localStorage.setItem('__firebase_config', JSON.stringify(fbJson));
            localStorage.setItem('__app_id', 'vocaloop-local');

            alert("Configuration saved! Reloading...");
            window.location.reload();
        } catch (e) {
            alert("Invalid Firebase Config JSON format. Please check again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">VocaLoop Setup</h1>
                    <p className="text-gray-500 text-sm">Environment variables are missing.<br />Please provide credentials via .env or form.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Gemini API Key</label>
                        <input
                            type="password"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="AIzaSy..."
                            value={localApiKey}
                            onChange={e => setLocalApiKey(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Firebase Config (JSON)
                            <span className="text-xs font-normal text-gray-400 ml-2 block mt-1">
                                Copy object from Firebase Console {'>'} Project settings
                            </span>
                        </label>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg h-40 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder='{"apiKey": "...", "authDomain": "...", ...}'
                            value={localFbConfig}
                            onChange={e => setLocalFbConfig(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        Save & Start VocaLoop
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        Data is saved locally in your browser's LocalStorage.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SetupScreen;
