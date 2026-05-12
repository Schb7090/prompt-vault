'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CalendarIcon, SyncIcon } from './Icons';

interface CalendarEvent {
    id: string;
    summary: string;
    start: string;
    promptId: string | null;
}

interface CalendarPanelProps {
    calendarAuthed: boolean;
    onSyncComplete?: () => void;
}

function formatEventDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export default function CalendarPanel({ calendarAuthed, onSyncComplete }: CalendarPanelProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchEvents = useCallback(async () => {
        if (!calendarAuthed) return;
        setLoading(true);
        try {
            const res = await fetch('/api/calendar');
            const data = await res.json();
            if (data.events) setEvents(data.events);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [calendarAuthed]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    async function handleSync() {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/calendar/sync', { method: 'POST' });
            const data = await res.json();
            setSyncResult(`Synced ${data.synced ?? 0} · ${data.updated ?? 0} updated · ${data.unlinked ?? 0} removed`);
            await fetchEvents();
            onSyncComplete?.();
        } catch {
            setSyncResult('Sync failed');
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncResult(null), 4000);
        }
    }

    return (
        <div className="calendar-panel">
            <div className="calendar-panel-header">
                <CalendarIcon width={16} height={16} />
                <span>Google Calendar</span>
            </div>

            {!calendarAuthed ? (
                <a href="/api/auth/google" className="calendar-connect-btn">
                    Connect Google Calendar
                </a>
            ) : (
                <>
                    <div className="calendar-panel-actions">
                        <button
                            className="calendar-sync-btn"
                            onClick={handleSync}
                            disabled={syncing}
                            title="Pull changes from Google Calendar"
                        >
                            <SyncIcon
                                width={14}
                                height={14}
                                style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }}
                            />
                            {syncing ? 'Syncing…' : 'Sync'}
                        </button>
                        {syncResult && <span className="calendar-sync-result">{syncResult}</span>}
                    </div>

                    <div className="calendar-events-list">
                        {loading && <div className="calendar-loading">Loading…</div>}
                        {!loading && events.length === 0 && (
                            <div className="calendar-empty">No upcoming scheduled prompts</div>
                        )}
                        {events.map((event) => (
                            <div key={event.id} className="calendar-event-item">
                                <div className="calendar-event-title">{event.summary}</div>
                                <div className="calendar-event-time">{formatEventDate(event.start)}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
