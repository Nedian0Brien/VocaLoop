import React from 'react';
import { InfinityIcon, LogOut } from './Icons';

const Header = ({ view, setView, user, onLogout }) => (
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
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt="Profile"
                                className="w-8 h-8 rounded-full border border-gray-200"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
                            title="로그아웃"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </header>
);

export default Header;
