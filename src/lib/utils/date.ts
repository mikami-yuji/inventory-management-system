/**
 * 日付・時刻関連のユーティリティ
 */

/**
 * 日本時間 (JST) の現在日時を取得する
 */
export function getJSTNow(): Date {
    return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

/**
 * 日本時間 (JST) の今日の日付を YYYY-MM-DD 形式で取得する
 */
export function getJSTDateString(date: Date = new Date()): string {
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jstDate.toISOString().split('T')[0];
}

/**
 * 文字列日付を JST 基準で Date オブジェクトに変換する (UTCとしての解釈を防ぐ)
 */
export function parseJSTDate(dateStr: string): Date {
    // YYYY-MM-DD 形式を想定
    return new Date(`${dateStr}T00:00:00+09:00`);
}

/**
 * 日付を指定された形式（例：M/D）でフォーマットする
 */
export function formatMonthDay(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}
