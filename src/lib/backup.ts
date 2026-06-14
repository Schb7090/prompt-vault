import fs from 'fs';
import path from 'path';

interface BackupPrompt {
    id: string;
    title: string;
    content: string;
    model: string;
    environment: string;
    goodFor?: string | null;
    rating: number;
    categoryId?: string | null;
    description?: string | null;
}

export async function savePromptToMarkdown(prompt: BackupPrompt): Promise<void> {
    try {
        const backupDir = path.join(process.cwd(), 'prompts_backup');

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Sanitize filename
        const safeTitle = prompt.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeTitle}_${prompt.id.substring(0, 8)}.md`;
        const filePath = path.join(backupDir, fileName);

        const content = `---
title: ${prompt.title}
model: ${prompt.model}
environment: ${prompt.environment}
goodFor: ${prompt.goodFor || ''}
rating: ${prompt.rating}
categoryId: ${prompt.categoryId || ''}
updatedAt: ${new Date().toISOString()}
---

# ${prompt.title}

## Description
${prompt.description || 'No description provided.'}

## Prompt Content
\`\`\`
${prompt.content}
\`\`\`
`;

        fs.writeFileSync(filePath, content, 'utf8');
    } catch (err) {
        console.error(`[backup] Failed to save prompt "${prompt.id}" to markdown:`, err);
    }
}
