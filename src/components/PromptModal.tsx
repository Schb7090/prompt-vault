import { useState, useEffect } from 'react';
import { Prompt, Category } from './PromptCard';
import { StarIcon } from './Icons';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (promptData: any) => void;
    initialData?: Prompt | null;
    categories: Category[];
}

export default function PromptModal({ isOpen, onClose, onSave, initialData, categories }: PromptModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        model: 'GPT-4o',
        environment: 'ChatGPT',
        goodFor: '',
        description: '',
        rating: 3,
        categoryId: '',
        scheduledAt: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                content: initialData.content,
                model: initialData.model || '',
                environment: initialData.environment || '',
                goodFor: initialData.goodFor || '',
                description: initialData.description || '',
                rating: initialData.rating || 0,
                categoryId: initialData.categoryId || '',
                scheduledAt: initialData.scheduledAt
                    ? new Date(initialData.scheduledAt).toISOString().slice(0, 16)
                    : '',
            });
        } else {
            setFormData({
                title: '',
                content: '',
                model: 'GPT-4o',
                environment: 'ChatGPT',
                goodFor: '',
                description: '',
                rating: 3,
                categoryId: '',
                scheduledAt: '',
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                    {initialData ? 'Edit Prompt' : 'New Prompt'}
                </h2>

                <input
                    className="input-glass"
                    placeholder="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <select
                        className="input-glass"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                        <option value="">No Category</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    <input
                        className="input-glass"
                        placeholder="AI Model (e.g., GPT-4o, Claude 3.5)"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                    <input
                        className="input-glass"
                        placeholder="Environment (e.g., ChatGPT, API)"
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    />

                    <input
                        className="input-glass"
                        placeholder="Good For (e.g., Brainstorming, Code Review)"
                        value={formData.goodFor}
                        onChange={(e) => setFormData({ ...formData, goodFor: e.target.value })}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Rating</label>
                        <div className="star-rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                    key={star}
                                    className={star <= formData.rating ? "star active" : "star"}
                                    onClick={() => setFormData({ ...formData, rating: star })}
                                    style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Schedule</label>
                        <input
                            type="datetime-local"
                            className="input-glass"
                            value={formData.scheduledAt}
                            onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Prompt Content</label>
                        <textarea
                            className="input-glass"
                            placeholder="Enter prompt content here..."
                            style={{ minHeight: '150px' }}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Notes & Description</label>
                        <textarea
                            className="input-glass"
                            placeholder="Enter notes and use-cases..."
                            style={{ minHeight: '150px' }}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn btn-glass" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => onSave(formData)}>Save Prompt</button>
                </div>
            </div>
        </div>
    );
}
