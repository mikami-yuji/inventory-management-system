"use client";

import useSWR from 'swr';
import type { Supplier, User } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * 仕入先データを取得するフック
 */
export function useSuppliers(activeOnly: boolean = true) {
    const { data, error, isLoading, mutate } = useSWR(`/api/suppliers?active=${activeOnly}`, fetcher);

    return {
        suppliers: Array.isArray(data?.data) ? data.data : [],
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * ユーザー一覧を取得するフック
 */
export function useUsers() {
    const { data, error, isLoading, mutate } = useSWR('/api/users', fetcher);

    return {
        users: Array.isArray(data?.data) ? data.data : [],
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * アプリケーション設定を取得するフック
 */
export function useAppSettings() {
    const { data, error, isLoading, mutate } = useSWR('/api/settings', fetcher);

    return {
        settings: (data?.data as Record<string, unknown>) || {},
        isLoading,
        isError: error,
        mutate,
    };
}
