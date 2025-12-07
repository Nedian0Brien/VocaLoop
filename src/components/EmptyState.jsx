import React from 'react';
import { BookOpen } from './Icons';

const EmptyState = () => (
    <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No words yet</h3>
        <p className="text-gray-500 mb-6">Add your first word to start the learning loop.</p>
    </div>
);

export default EmptyState;
