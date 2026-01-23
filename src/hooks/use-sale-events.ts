"use client";

import { useState, useEffect, useCallback } from 'react';

// 特売イベントの型
export type SaleEvent = {
    id: string;
    clientName: string;
    scheduleType: 'single' | 'monthly';
    dates: string[];
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    description: string | null;
    createdAt: string;
    items: SaleEventItem[];
};

export type SaleEventItem = {
    id: string;
    productId: string;
    productName: string;
    productSku: string | null;
    plannedQuantity: number;
    allocatedQuantity: number;
    actualQuantity: number | null;
    currentStock: number;
};

// 新規イベント作成用の入力型
export type SaleEventInput = {
    clientName: string;
    scheduleType: 'single' | 'monthly';
    dates: string[];
    description?: string;
    items: Array<{ productId: string; quantity: number }>;
    allocateStock?: boolean;
};

/**
 * 特売イベント一覧を取得するフック
 */
export function useSaleEvents(options?: { status?: string }): {
    events: SaleEvent[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
} {
    const [events, setEvents] = useState<SaleEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options?.status && options.status !== 'all') {
                params.append('status', options.status);
            }

            const url = `/api/sale-events${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            setEvents(result.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [options?.status]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return { events, loading, error, refetch: fetchEvents };
}

/**
 * 特売イベントを作成するフック
 */
export function useCreateSaleEvent(): {
    createEvent: (input: SaleEventInput) => Promise<{ success: boolean; error?: string }>;
    loading: boolean;
} {
    const [loading, setLoading] = useState(false);

    const createEvent = async (input: SaleEventInput): Promise<{ success: boolean; error?: string }> => {
        setLoading(true);

        try {
            const response = await fetch('/api/sale-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            });

            const result = await response.json();

            if (result.error) {
                return { success: false, error: result.error };
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : '作成に失敗しました' };
        } finally {
            setLoading(false);
        }
    };

    return { createEvent, loading };
}

/**
 * 特売イベントを更新するフック
 */
export function useUpdateSaleEvent(): {
    updateStatus: (eventId: string, status: string) => Promise<boolean>;
    updateActual: (eventId: string, items: Array<{ itemId: string; actualQuantity: number }>) => Promise<boolean>;
    allocateStock: (eventId: string) => Promise<boolean>;
    deleteEvent: (eventId: string) => Promise<boolean>;
    loading: boolean;
} {
    const [loading, setLoading] = useState(false);

    const updateStatus = async (eventId: string, status: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/sale-events', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    action: 'updateStatus',
                    data: { status }
                })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateActual = async (eventId: string, items: Array<{ itemId: string; actualQuantity: number }>): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/sale-events', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    action: 'updateActual',
                    data: { items }
                })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const allocateStock = async (eventId: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/sale-events', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    action: 'allocateStock',
                    data: {}
                })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteEvent = async (eventId: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch(`/api/sale-events?id=${eventId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { updateStatus, updateActual, allocateStock, deleteEvent, loading };
}
