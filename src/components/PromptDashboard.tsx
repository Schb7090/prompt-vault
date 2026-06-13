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
import {
    PlusIcon, CheckIcon, EditIcon, TrashIcon, CopyIcon, StarIcon,
    MenuIcon, ListIcon, FileIcon,
} from './Icons';

type MobilePane = 'sidebar' | 'list' | 'detail';

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

    // Mobile pane state
    const [mobilePane, setMobilePane] = useState<MobilePane>('list');

    // Ollama state
    const [ollamaModel, setOllamaModel] = useState('llama3.2');
    const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
    const [ollamaResult, setOllamaResult] = useState('');
    const [isOllamaLoading, setIsOllamaLoading] = useState(false);
    const [showOllamaPanel, setShowOllamaPanel] = useState(false);

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

            if (!isEdit) {
                data.order = prompts.length > 0 ? Math.max(...prompts.map((p: any) => p.order || 0)) + 1 : 0;
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

        if (over.id.toString().startsWith('category-')) {
            const newCategoryId = over.id.toString().replace('category-', '');
            const promptId = active.id.toString();

            setPrompts(prev => prev.filter(p => p.id !== promptId));

            try {
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

        if (active.id !== over.id) {
            setPrompts((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                const updatedPrompts = newItems.map((item, index) => ({
                    ...item,
                    order: index,
                }));

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

    useEffect(() => {
        if (selectedPrompt) {
            setInlineContent(selectedPrompt.content);
            setInlineDescription(selectedPrompt.description || '');
        }
    }, [selectedPromptId, selectedPrompt?.id]);

    const handleInlineSave = async (field: string, value: string | number) => {
        if (!selectedPrompt) return;
        const updated = { ...selectedPrompt, [field]: value };

        setPrompts(prev => prev.map(p => p.id === selectedPrompt.id ? updated : p));

        try {
            await fetch(`/api/prompts/${selectedPrompt.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            });
        } catch (error) {
            console.error('Failed to save inline edit', error);
            fetchPrompts();
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

    const handleRunWithOllama = async () => {
        if (!selectedPrompt) return;
        setIsOllamaLoading(true);
        setOllamaResult('');
        try {
            const res = await fetch('/api/ollama', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: selectedPrompt.content,
                    model: ollamaModel,
                    ollamaUrl,
                }),
            });
            const data = await res.json();
            setOllamaResult(res.ok ? data.response : `Error: ${data.error}`);
        } catch {
            setOllamaResult('Failed to reach the Ollama API route.');
        } finally {
            setIsOllamaLoading(false);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="app-container">
                {/* Left Pane: Sidebar */}
                <Sidebar
                    className={mobilePane !== 'sidebar' ? 'mobile-hidden' : ''}
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelectCategory={(id) => { setActiveCategory(id); setMobilePane('list'); }}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                <main className="main-content">
                    {/* Middle Pane: Prompt List */}
                    <div className={`middle-pane${mobilePane !== 'list' ? ' mobile-hidden' : ''}`}>
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
                                                onClick={() => { setSelectedPromptId(prompt.id); setMobilePane('detail'); }}
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
                    <div className={`right-pane${mobilePane !== 'detail' ? ' mobile-hidden' : ''}`}>
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

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div className="star-rating">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <StarIcon
                                                key={star}
                                                className={star <= selectedPrompt.rating ? "star active" : "star"}
                                                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                                                onClick={() => handleInlineSave('rating', star)}
                                            />
                                        ))}
                                    </div>
                                    <button className="btn btn-primary" onClick={() => handleCopy(selectedPrompt.content)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                                        {copied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                                        {copied ? 'Copied!' : 'Copy Prompt'}
                                    </button>
                                </div>

                                {/* Ollama Panel */}
                                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                                    <button
                                        className="btn btn-glass"
                                        style={{ width: '100%', justifyContent: 'space-between' }}
                                        onClick={() => setShowOllamaPanel(!showOllamaPanel)}
                                    >
                                        <span>🤖 Run with Ollama</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{showOllamaPanel ? '▲' : '▼'}</span>
                                    </button>

                                    {showOllamaPanel && (
                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <input
                                                    className="input-glass"
                                                    placeholder="Model (e.g. llama3.2)"
                                                    value={ollamaModel}
                                                    onChange={(e) => setOllamaModel(e.target.value)}
                                                    style={{ flex: '1 1 120px', padding: '0.5rem 0.875rem' }}
                                                />
                                                <input
                                                    className="input-glass"
                                                    placeholder="Ollama URL"
                                                    value={ollamaUrl}
                                                    onChange={(e) => setOllamaUrl(e.target.value)}
                                                    style={{ flex: '2 1 200px', padding: '0.5rem 0.875rem' }}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleRunWithOllama}
                                                    disabled={isOllamaLoading}
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    {isOllamaLoading ? 'Running…' : 'Run'}
                                                </button>
                                            </div>
                                            {ollamaResult && (
                                                <textarea
                                                    className="input-glass"
                                                    readOnly
                                                    value={ollamaResult}
                                                    style={{ minHeight: '180px', fontFamily: 'inherit', resize: 'vertical', color: 'var(--text-primary)' }}
                                                />
                                            )}
                                        </div>
                                    )}
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

                {/* Mobile Bottom Navigation */}
                <nav className="mobile-nav">
                    <button
                        className={`mobile-nav-btn${mobilePane === 'sidebar' ? ' active' : ''}`}
                        onClick={() => setMobilePane('sidebar')}
                    >
                        <MenuIcon style={{ width: '20px', height: '20px' }} />
                        <span>Vault</span>
                    </button>
                    <button
                        className={`mobile-nav-btn${mobilePane === 'list' ? ' active' : ''}`}
                        onClick={() => setMobilePane('list')}
                    >
                        <ListIcon style={{ width: '20px', height: '20px' }} />
                        <span>Prompts</span>
                    </button>
                    <button
                        className={`mobile-nav-btn${mobilePane === 'detail' ? ' active' : ''}`}
                        onClick={() => setMobilePane('detail')}
                        disabled={!selectedPromptId}
                    >
                        <FileIcon style={{ width: '20px', height: '20px' }} />
                        <span>Detail</span>
                    </button>
                </nav>

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
