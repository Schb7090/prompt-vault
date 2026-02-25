import { useState } from 'react';
import { CopyIcon, CheckIcon, StarIcon, EditIcon, TrashIcon } from './Icons';

export interface Category {
    id: string;
    name: string;
    color: string | null;
}

export interface Prompt {
    id: string;
    title: string;
    content: string;
    model: string;
    environment: string;
    goodFor: string | null;
    description: string | null;
    rating: number;
    categoryId: string | null;
    category?: Category | null;
    createdAt: string;
    updatedAt: string;
    order?: number;
}

interface PromptCardProps {
    prompt: Prompt;
    onEdit: (prompt: Prompt) => void;
    onDelete: (id: string) => void;
    showToast: (message: string) => void;
}

export default function PromptCard({ prompt, onEdit, onDelete, showToast }: PromptCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        showToast('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, flex: 1, paddingRight: '1rem', fontSize: '1.1rem' }}>{prompt.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => onEdit(prompt)} className="btn btn-glass btn-icon-only" title="Edit">
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(prompt.id)} className="btn btn-glass btn-icon-only" style={{ color: '#ef4444' }} title="Delete">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {prompt.category && (
                    <span className="pill pill-accent">{prompt.category.name}</span>
                )}
                <span className="pill">{prompt.model}</span>
                <span className="pill">{prompt.environment}</span>
                {prompt.goodFor && <span className="pill" style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>✨ {prompt.goodFor}</span>}
            </div>

            <div className="input-glass" style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', fontSize: '0.875rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {prompt.content}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                            key={star}
                            className={star <= prompt.rating ? "star active" : "star"}
                        />
                    ))}
                </div>
                <button className="btn btn-primary" onClick={handleCopy}>
                    {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
}
