import React from 'react';
import { InfinityIcon, Settings } from './Icons';

const Header = ({ view, setView, user, onOpenSettings }) => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700 cursor-pointer" onClick={() => setView('dashboard')}>
                <div className="relative flex items-center justify-center w-8 h-8">
                    <InfinityIcon className="w-8 h-8 absolute text-blue-600" strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-bold tracking-tight">VocaLoop</h1>
            </div>
            <div className="flex items-center gap-4">
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
                {user && (
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                        <button
                            onClick={onOpenSettings}
                            className="flex items-center gap-2 group"
                            title="계정 설정"
                        >
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full border-2 border-gray-200 group-hover:border-blue-500 transition-colors cursor-pointer"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm cursor-pointer group-hover:from-blue-600 group-hover:to-indigo-700 transition-all border-2 border-gray-200 group-hover:border-blue-500">
                                    {user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <Settings className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </header>
);

export default Header;
