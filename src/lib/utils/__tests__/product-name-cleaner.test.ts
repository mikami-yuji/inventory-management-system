import { normalizeProductName } from '../product-name-cleaner';

describe('normalizeProductName', () => {
    test('全角NBを半角【NB】に統一し、県名を補完する', () => {
        expect(normalizeProductName('【ＮＢ】三重こしひかり')).toBe('【NB】三重県こしひかり');
        expect(normalizeProductName('【ＮＢ】北海道ななつぼし')).toBe('【NB】北海道ななつぼし');
        expect(normalizeProductName('【NB】富山県こしひかりＲ')).toBe('【NB】富山県こしひかりR');
    });

    test('全角JA/PB/SPおよびカッコを半角化し、県名を補完する', () => {
        expect(normalizeProductName('【新米】ＪＡ加美よつば宮城ひとめぼれ（万代PB）')).toBe('【新米】JA加美よつば宮城県ひとめぼれ(万代PB)');
        expect(normalizeProductName('ＪＡ加美よつば宮城ひとめぼれ（万代ＰＢ')).toBe('JA加美よつば宮城県ひとめぼれ(万代PB)');
        expect(normalizeProductName('国内産こしひかりRZＳＰ')).toBe('国内産こしひかりRZSP');
    });

    test('「県産」を「県」に統一する', () => {
        expect(normalizeProductName('青森県産はれわたり')).toBe('青森県はれわたり');
        expect(normalizeProductName('北海道産ななつぼし')).toBe('北海道ななつぼし');
        expect(normalizeProductName('【新米】千葉県産ふさこがねSP')).toBe('【新米】千葉県ふさこがねSP');
    });

    test('不要な接頭語（別注〜、●、△）を整理する', () => {
        expect(normalizeProductName('別注５ＫＳＦＭポリ　富山こしひかりＲ')).toBe('富山県こしひかりR');
        expect(normalizeProductName('別注５ＫSFMﾎﾟﾘ新米三重あきたこまちＲ')).toBe('【新米】三重県あきたこまちR');
        expect(normalizeProductName('別注５Ｋポリ無洗米おくさま印Ｒ')).toBe('【無洗米】おくさま印R');
        expect(normalizeProductName('●NO.596メッセージライス　金賞健康米（北海道ゆめぴりか３００ｇ）')).toBe('NO.596メッセージライス 金賞健康米(北海道ゆめぴりか300g)');
    });

    test('県名が省略されている主要品種に県名を補完する', () => {
        expect(normalizeProductName('新潟こしひかり')).toBe('新潟県こしひかり');
        expect(normalizeProductName('秋田あきたこまち')).toBe('秋田県あきたこまち');
        expect(normalizeProductName('福井こしひかり')).toBe('福井県こしひかり');
        expect(normalizeProductName('宮城ひとめぼれ')).toBe('宮城県ひとめぼれ');
    });

    test('ソフトクラフト無地などの正式な商品名が削られずに保持される', () => {
        expect(normalizeProductName('ソフトクラフト無地')).toBe('ソフトクラフト無地');
        expect(normalizeProductName('ソフトクラフト無地【R】')).toBe('ソフトクラフト無地【R】');
        expect(normalizeProductName('クラフト無地')).toBe('クラフト無地');
    });
});
