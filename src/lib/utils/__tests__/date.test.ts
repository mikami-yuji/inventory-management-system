import { getJSTNow, getJSTDateString, parseJSTDate, formatMonthDay } from '../date';

describe('date utility', () => {
    describe('getJSTNow', () => {
        it('JSTの日時が返されること', () => {
            const now = getJSTNow();
            expect(now).toBeInstanceOf(Date);
            expect(isNaN(now.getTime())).toBe(false);
        });
    });

    describe('getJSTDateString', () => {
        it('YYYY-MM-DD形式の文字列を返すこと', () => {
            const testDate = new Date('2026-09-05T00:00:00Z');
            const result = getJSTDateString(testDate);
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('引数を省略した場合、本日の日付が返されること', () => {
            const result = getJSTDateString();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('parseJSTDate', () => {
        it('日付文字列をJSTのDateオブジェクトに変換すること', () => {
            const result = parseJSTDate('2026-09-05');
            expect(result).toBeInstanceOf(Date);
            // タイムゾーン非依存でエポックミリ秒とISO文字列を検証
            const expected = new Date('2026-09-05T00:00:00+09:00');
            expect(result.getTime()).toBe(expected.getTime());
            expect(result.toISOString()).toBe(expected.toISOString());
        });
    });

    describe('formatMonthDay', () => {
        it('日付文字列をM/D形式に変換すること', () => {
            const result = formatMonthDay('2026-09-05T12:00:00');
            expect(result).toBe('9/5');
        });

        it('空文字が渡された場合は空文字を返すこと', () => {
            const result = formatMonthDay('');
            expect(result).toBe('');
        });
    });
});
