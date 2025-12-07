import React from 'react';
import { InfinityIcon } from './Icons';

const Header = ({ view, setView }) => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700 cursor-pointer" onClick={() => setView('dashboard')}>
                <div className="relative flex items-center justify-center w-8 h-8">
                    <InfinityIcon className="w-8 h-8 absolute text-blue-600" strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-bold tracking-tight">VocaLoop</h1>
            </div>
            <nav className="flex gap-4">
                <button
                    onClick={() => setView('dashboard')}
                    className={`text-sm font-medium transition-colors ${view === 'dashboard' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setView('study')}
                    className={`text-sm font-medium transition-colors ${view === 'study' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Study
                </button>
            </nav>
        </div>
    </header>
);

export default Header;
