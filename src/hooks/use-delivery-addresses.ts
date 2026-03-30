"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DeliveryAddress } from '@/types';
import { toast } from 'react-hot-toast';

/**
 * 納品先住所データを取得・操作するフック
 */
export function useDeliveryAddresses(): {
    addresses: DeliveryAddress[];
    loading: boolean;
    error: string | null;
    addAddress: (address: Omit<DeliveryAddress, 'id' | 'clientId'>) => Promise<boolean>;
    updateAddress: (address: DeliveryAddress) => Promise<boolean>;
    deleteAddress: (id: string) => Promise<boolean>;
    refetch: () => void;
} {
    const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);

    const fetchAddresses = useCallback(async (): Promise<void> => {
        if (!loadedRef.current) setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/delivery-addresses');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setAddresses(data);
            loadedRef.current = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '住所の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    // 住所を追加
    const addAddress = async (address: Omit<DeliveryAddress, 'id' | 'clientId'>): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/delivery-addresses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(address),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '作成に失敗しました');
            }

            await fetchAddresses();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '作成に失敗しました');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 住所を更新
    const updateAddress = async (address: DeliveryAddress): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/delivery-addresses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(address),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '更新に失敗しました');
            }

            await fetchAddresses();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新に失敗しました');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 住所を削除
    const deleteAddress = async (id: string): Promise<boolean> => {
        if (!confirm('この納品先を削除してもよろしいですか？')) return false;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/delivery-addresses?id=${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '削除に失敗しました');
            }
            
            toast.success('納品先を削除しました');
            await fetchAddresses();
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : '削除に失敗しました';
            setError(msg);
            toast.error(msg);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        addresses,
        loading,
        error,
        addAddress,
        updateAddress,
        deleteAddress,
        refetch: fetchAddresses
    };
}
