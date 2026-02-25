'use client';

import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import PromptCard, { Prompt, Category } from './PromptCard';
import Sidebar from './Sidebar';
import PromptModal from './PromptModal';
import { SortableItem } from './SortableItem';
import { PlusIcon, CheckIcon, EditIcon, TrashIcon, CopyIcon, StarIcon } from './Icons';

export default function PromptDashboard() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Inline editing states
    const [inlineContent, setInlineContent] = useState('');
    const [inlineDescription, setInlineDescription] = useState('');
    const [editingField, setEditingField] = useState<'model' | 'environment' | 'goodFor' | null>(null);
    const [fieldValue, setFieldValue] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetch('/api/seed').then(() => fetchCategories());
    }, []);

    useEffect(() => {
        fetchPrompts();
    }, [activeCategory, searchQuery]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) setCategories(await res.json());
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchPrompts = async () => {
        try {
            const params = new URLSearchParams();
            if (activeCategory) params.append('categoryId', activeCategory);
            if (searchQuery) params.append('q', searchQuery);

            const res = await fetch(`/api/prompts?${params.toString()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (res.ok) setPrompts(await res.json());
        } catch (error) {
            console.error('Failed to fetch prompts:', error);
        }
    };

    const handleSavePrompt = async (data: any) => {
        try {
            const isEdit = !!editingPrompt;
            const url = isEdit ? `/api/prompts/${editingPrompt.id}` : '/api/prompts';
            const method = isEdit ? 'PUT' : 'POST';

            // Add order logic (put new items at the end)
            if (!isEdit) {
                data.order = prompts.length > 0 ? Math.max(...prompts.map(p => p.order || 0)) + 1 : 0;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                fetchPrompts();
                setIsModalOpen(false);
                showToast(isEdit ? 'Prompt updated successfully' : 'Prompt created successfully');
            }
        } catch (error) {
            console.error('Failed to save prompt:', error);
        }
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (confirm('Are you sure you want to delete this prompt?')) {
            try {
                const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    if (selectedPromptId === id) setSelectedPromptId(null);
                    fetchPrompts();
                    showToast('Prompt deleted successfully');
                }
            } catch (error) {
                console.error('Failed to delete prompt:', error);
            }
        }
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        showToast('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        // Check if dragged over a category in the sidebar
        if (over.id.toString().startsWith('category-')) {
            const newCategoryId = over.id.toString().replace('category-', '');
            const promptId = active.id.toString();

            setPrompts(prev => prev.filter(p => p.id !== promptId)); // Optimistic UI update

            try {
                // To fetch existing prompt data for the update payload
                const p = prompts.find(p => p.id === promptId);
                if (p) {
                    await fetch(`/api/prompts/${promptId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...p, categoryId: newCategoryId }),
                    });
                    fetchPrompts();
                    showToast('Moved to category');
                }
            } catch (e) {
                console.error('Failed to move category', e);
                fetchPrompts();
            }
            return;
        }

        // Handle sorting within the list
        if (active.id !== over.id) {
            setPrompts((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Update orders
                const updatedPrompts = newItems.map((item, index) => ({
                    ...item,
                    order: index,
                }));

                // Save to DB
                fetch('/api/prompts/reorder', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompts: updatedPrompts.map(p => ({ id: p.id, order: p.order, categoryId: p.categoryId })) }),
                }).catch(e => console.error('Failed to save order:', e));

                return updatedPrompts;
            });
        }
    };

    const openNewModal = () => {
        setEditingPrompt(null);
        setIsModalOpen(true);
    };

    const openEditModal = (prompt: Prompt, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingPrompt(prompt);
        setIsModalOpen(true);
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

    // Sync inline state when selected prompt changes
    useEffect(() => {
        if (selectedPrompt) {
            setInlineContent(selectedPrompt.content);
            setInlineDescription(selectedPrompt.description || '');
        }
    }, [selectedPromptId, selectedPrompt?.id]); // only run when ID changes, preventing cursor jumps

    const handleInlineSave = async (field: string, value: string | number) => {
        if (!selectedPrompt) return;
        const updated = { ...selectedPrompt, [field]: value };

        // Optimistic UI update
        setPrompts(prev => prev.map(p => p.id === selectedPrompt.id ? updated : p));

        try {
            await fetch(`/api/prompts/${selectedPrompt.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            });
            // We do not re-fetch to avoid cursor jumps, optimistic update is enough
        } catch (error) {
            console.error('Failed to save inline edit', error);
            fetchPrompts(); // Revert on failure
        }
    };

    const handleFieldEditStart = (field: 'model' | 'environment' | 'goodFor', value: string | null) => {
        setEditingField(field);
        setFieldValue(value || '');
    };

    const handleFieldEditSave = () => {
        if (editingField && selectedPrompt) {
            handleInlineSave(editingField, fieldValue);
        }
        setEditingField(null);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="app-container">
                {/* Left Pane: Sidebar */}
                <Sidebar
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelectCategory={setActiveCategory}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                <main className="main-content">
                    {/* Middle Pane: Prompt List */}
                    <div className="middle-pane">
                        <header className="middle-pane-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Prompts</h1>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                        {prompts.length} found
                                    </p>
                                </div>
                                <button className="btn btn-primary" onClick={openNewModal} style={{ padding: '0.4rem' }}>
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </header>

                        <div className="prompt-list">
                            <SortableContext items={prompts} strategy={verticalListSortingStrategy}>
                                {prompts.length > 0 ? (
                                    prompts.map((prompt) => (
                                        <SortableItem key={prompt.id} id={prompt.id}>
                                            <div
                                                onClick={() => setSelectedPromptId(prompt.id)}
                                                className={`glass-card compact-card ${selectedPromptId === prompt.id ? 'selected' : ''}`}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <h3 style={{ fontSize: '1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {prompt.title}
                                                    </h3>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {prompt.category && <span className="pill pill-accent" style={{ fontSize: '0.65rem' }}>{prompt.category.name}</span>}
                                                    <span className="pill" style={{ fontSize: '0.65rem' }}>{prompt.model}</span>
                                                    {prompt.goodFor && <span className="pill" style={{ fontSize: '0.65rem', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>✨</span>}
                                                </div>
                                            </div>
                                        </SortableItem>
                                    ))
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No prompts found</p>
                                )}
                            </SortableContext>
                        </div>
                    </div>

                    {/* Right Pane: Selected Prompt Details */}
                    <div className="right-pane">
                        {selectedPrompt ? (
                            <div className="glass-panel animate-fade-in" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '2rem', margin: 0, marginBottom: '0.5rem' }}>{selectedPrompt.title}</h2>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {selectedPrompt.category && <span className="pill pill-accent">{selectedPrompt.category.name}</span>}

                                            {editingField === 'model' ? (
                                                <input autoFocus className="input-glass" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', height: 'auto', width: '100px' }} value={fieldValue} onChange={e => setFieldValue(e.target.value)} onBlur={handleFieldEditSave} onKeyDown={e => e.key === 'Enter' && handleFieldEditSave()} />
                                            ) : (
                                                <span className="pill" style={{ cursor: 'pointer' }} onClick={() => handleFieldEditStart('model', selectedPrompt.model)}>{selectedPrompt.model}</span>
                                            )}

                                            {editingField === 'environment' ? (
                                                <input autoFocus className="input-glass" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', height: 'auto', width: '100px' }} value={fieldValue} onChange={e => setFieldValue(e.target.value)} onBlur={handleFieldEditSave} onKeyDown={e => e.key === 'Enter' && handleFieldEditSave()} />
                                            ) : (
                                                <span className="pill" style={{ cursor: 'pointer' }} onClick={() => handleFieldEditStart('environment', selectedPrompt.environment)}>{selectedPrompt.environment}</span>
                                            )}

                                            {editingField === 'goodFor' ? (
                                                <input autoFocus className="input-glass" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', height: 'auto', width: '120px' }} value={fieldValue} onChange={e => setFieldValue(e.target.value)} onBlur={handleFieldEditSave} onKeyDown={e => e.key === 'Enter' && handleFieldEditSave()} />
                                            ) : (
                                                <span className="pill" style={{ cursor: 'pointer', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }} onClick={() => handleFieldEditStart('goodFor', selectedPrompt.goodFor)}>
                                                    ✨ {selectedPrompt.goodFor || 'Add Use Case'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={(e) => openEditModal(selectedPrompt, e)} className="btn btn-glass btn-icon-only" title="Full Edit">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={(e) => handleDelete(selectedPrompt.id, e)} className="btn btn-glass btn-icon-only" style={{ color: '#ef4444' }} title="Delete">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0, marginBottom: '1.5rem' }}>
                                    {/* Left Column: Prompt Content */}
                                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Prompt Content</h3>
                                        <textarea
                                            className="input-glass"
                                            style={{ flex: 1, padding: '1.5rem', fontSize: '1rem', fontFamily: 'monospace', resize: 'none', background: 'rgba(0,0,0,0.3)' }}
                                            value={inlineContent}
                                            onChange={(e) => setInlineContent(e.target.value)}
                                            onBlur={() => { if (inlineContent !== selectedPrompt.content) handleInlineSave('content', inlineContent); }}
                                        />
                                    </div>

                                    {/* Right Column: Description / Notes */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Description & Notes</h3>
                                        <textarea
                                            className="input-glass"
                                            style={{ flex: 1, padding: '1.5rem', fontSize: '1rem', resize: 'none', background: 'rgba(0,0,0,0.3)' }}
                                            value={inlineDescription}
                                            onChange={(e) => setInlineDescription(e.target.value)}
                                            onBlur={() => { if (inlineDescription !== (selectedPrompt.description || '')) handleInlineSave('description', inlineDescription); }}
                                            placeholder="Add notes, use-cases, and description for this prompt..."
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="star-rating">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <StarIcon
                                                key={star}
                                                className={star <= selectedPrompt.rating ? "star active" : "star"}
                                                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                                                onClick={() => handleInlineSave('rating', star.toString())}
                                            // note inline save sends it as number because spread takes care of it, wait, we need to pass a number.
                                            />
                                        ))}
                                    </div>
                                    <button className="btn btn-primary" onClick={() => handleCopy(selectedPrompt.content)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                                        {copied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                                        {copied ? 'Copied!' : 'Copy Prompt'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No Prompt Selected</h3>
                                    <p>Select a prompt from the list to view its details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <PromptModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePrompt}
                    initialData={editingPrompt}
                    categories={categories}
                />

                <div className={`toast ${toastMessage ? 'show' : ''}`}>
                    <CheckIcon className="w-5 h-5" style={{ color: '#4ade80' }} />
                    <span>{toastMessage}</span>
                </div>
            </div>
        </DndContext>
    );
}
