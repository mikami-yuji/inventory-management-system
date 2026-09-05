import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeliveryAddresses } from '../use-delivery-addresses';
import type { DeliveryAddress } from '@/types';

// fetchのグローバルモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('react-hot-toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

describe('use-delivery-addresses', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.confirm = jest.fn().mockReturnValue(true);
    });

    it('住所一覧を正常に取得できること', async () => {
        const mockAddresses: DeliveryAddress[] = [
            {
                id: 'addr-1',
                name: '本社配送センター',
                postalCode: '100-0001',
                address: '東京都千代田区1-1',
                phone: '03-1234-5678',
                isDefault: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
            },
        ];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAddresses,
        });

        const { result } = renderHook(() => useDeliveryAddresses());

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.addresses).toEqual(mockAddresses);
        expect(result.current.error).toBeNull();
    });

    it('新しい住所を追加できること', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        id: 'addr-2',
                        name: '大阪支店',
                        address: '大阪市北区梅田',
                    },
                ],
            });

        const { result } = renderHook(() => useDeliveryAddresses());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        let success = false;
        await act(async () => {
            success = await result.current.addAddress({
                name: '大阪支店',
                address: '大阪市北区梅田',
                postalCode: '530-0001',
                phone: '06-1234-5678',
                isDefault: false,
            });
        });

        expect(success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/delivery-addresses', expect.objectContaining({
            method: 'POST',
        }));
    });

    it('住所を削除できること', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ id: 'addr-1', name: '削除対象' }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });

        const { result } = renderHook(() => useDeliveryAddresses());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        let success = false;
        await act(async () => {
            success = await result.current.deleteAddress('addr-1');
        });

        expect(success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/delivery-addresses?id=addr-1', expect.objectContaining({
            method: 'DELETE',
        }));
    });
});
