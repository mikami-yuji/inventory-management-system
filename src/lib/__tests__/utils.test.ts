import { cn, isWithinDays } from '../utils';

describe('utils', () => {
    describe('cn', () => {
        it('クラス名を正常にマージすること', () => {
            const result = cn('bg-red-500', 'text-white', false && 'hidden', undefined, 'p-4');
            expect(result).toBe('bg-red-500 text-white p-4');
        });

        it('Tailwindの重複クラスを正しく競合解決すること', () => {
            const result = cn('p-2', 'p-4');
            expect(result).toBe('p-4');
        });
    });

    describe('isWithinDays', () => {
        it('nullやundefinedの場合はfalseを返すこと', () => {
            expect(isWithinDays(null)).toBe(false);
            expect(isWithinDays(undefined)).toBe(false);
        });

        it('不正な日付文字列の場合はfalseを返すこと', () => {
            expect(isWithinDays('invalid-date')).toBe(false);
        });

        it('指定日数以内の未来日付の場合はtrueを返すこと', () => {
            const future = new Date();
            future.setDate(future.getDate() + 3);
            expect(isWithinDays(future, 7)).toBe(true);
        });

        it('指定日数を超過した未来日付の場合はfalseを返すこと', () => {
            const farFuture = new Date();
            farFuture.setDate(farFuture.getDate() + 10);
            expect(isWithinDays(farFuture, 7)).toBe(false);
        });

        it('昨日や今日の範囲内ならtrueを返すこと', () => {
            const today = new Date();
            expect(isWithinDays(today, 7)).toBe(true);
        });
    });
});
