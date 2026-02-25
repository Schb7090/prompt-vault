import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Category } from './PromptCard';
import { SearchIcon, DownloadIcon } from './Icons';

interface SidebarProps {
    categories: Category[];
    activeCategory: string | null;
    onSelectCategory: (id: string | null) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

function DroppableCategory({ id, category, activeCategory, onSelectCategory }: { id: string, category: Category, activeCategory: string | null, onSelectCategory: (id: string | null) => void }) {
    const { isOver, setNodeRef } = useDroppable({ id });
    const isSelected = activeCategory === category.id;

    return (
        <li ref={setNodeRef} style={{ opacity: isOver ? 0.8 : 1, transform: isOver ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s' }}>
            <button
                style={{ width: '100%', textAlign: 'left', background: isSelected || isOver ? 'var(--bg-glass-hover)' : 'transparent', color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', borderLeft: isSelected ? '3px solid var(--accent-primary)' : '1px solid transparent', boxShadow: isOver ? 'var(--shadow-glow)' : 'none' }}
                className="btn btn-glass"
                onClick={() => onSelectCategory(category.id)}
            >
                {category.name}
            </button>
        </li>
    );
}

export default function Sidebar({
    categories,
    activeCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
}: SidebarProps) {
    return (
        <aside className="sidebar">
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Vault
                </h2>

                <div style={{ position: 'relative', marginBottom: '2rem' }}>
                    <SearchIcon className="w-5 h-5" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        className="input-glass"
                        style={{ paddingLeft: '3rem' }}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Categories
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>
                        <button
                            style={{ width: '100%', textAlign: 'left', background: !activeCategory ? 'var(--bg-glass-hover)' : 'transparent', color: !activeCategory ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                            className="btn btn-glass"
                            onClick={() => onSelectCategory(null)}
                        >
                            All Prompts
                        </button>
                    </li>
                    {categories.map((category) => (
                        <DroppableCategory
                            key={category.id}
                            id={`category-${category.id}`}
                            category={category}
                            activeCategory={activeCategory}
                            onSelectCategory={onSelectCategory}
                        />
                    ))}
                </ul>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a
                    href="/api/export"
                    className="btn btn-glass"
                    style={{ width: '100%', textDecoration: 'none', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                    download
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Export to Excel</span>
                </a>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Personal Prompt DB &copy; 2026
                </p>
            </div>
        </aside>
    );
}
