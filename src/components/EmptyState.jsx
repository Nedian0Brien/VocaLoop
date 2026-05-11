import React from 'react';
import { BookOpen } from './Icons';

const EmptyState = () => (
    <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-pill flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-black text-surface-900 tracking-tight mb-1">No words yet</h3>
        <p className="text-surface-500 font-semibold mb-6">Add your first word to start the learning loop.</p>
    </div>
);

export default EmptyState;
