/**
 * ネットワークドライブから受注Noが一致する画像をSupabaseに登録するスクリプト（V2）
 * 
 * 拡張点:
 * - フォルダ名からのSKUマッチング（従来）
 * - バルクフォルダ内のファイル名からのSKUマッチング（新規）
 *   対象: 新ロゴ立体画像, 表示画像png, 幸南食糧さま画像, 幸南NB2kg10kg立体
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ネットワークドライブのパス
const NETWORK_PATH = '\\\\Asahipack02\\社内書類ｎｅｗ\\01：部署別　営業部\\03：デザインデータ\\大阪本社　08：見上\\幸南食糧依頼はここへ';

// 画像の拡張子
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tif', '.tiff'];

/**
 * フォルダ名から受注No（SKU）を抽出する
 */
function extractSkusFromName(name) {
    const matches = name.match(/\b(\d{5,7})\b/g);
    if (!matches) return [];
    return [...new Set(matches)];
}

/**
 * フォルダ内の代表画像を選択
 */
function selectBestImage(folderPath) {
    let allFiles = [];

    try {
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(folderPath, entry.name);
            if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (IMAGE_EXTENSIONS.includes(ext)) {
                    allFiles.push({ name: entry.name, path: fullPath });
                }
            } else if (entry.isDirectory()) {
                try {
                    const subEntries = fs.readdirSync(fullPath);
                    for (const subFile of subEntries) {
                        const subFullPath = path.join(fullPath, subFile);
                        const ext = path.extname(subFile).toLowerCase();
                        if (IMAGE_EXTENSIONS.includes(ext) && fs.statSync(subFullPath).isFile()) {
                            allFiles.push({ name: subFile, path: subFullPath });
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        }
    } catch (err) {
        return null;
    }

    if (allFiles.length === 0) return null;

    const priorities = [
        (f) => f.name.includes('表立体'),
        (f) => f.name.includes('表') && !f.name.includes('裏'),
        (f) => f.name.includes('立体') && !f.name.includes('裏') && !f.name.includes('側面') && !f.name.includes('上面'),
        (f) => f.name.includes('立体'),
        (f) => ['.jpg', '.jpeg', '.png'].includes(path.extname(f.name).toLowerCase()),
    ];

    for (const priorityFn of priorities) {
        const found = allFiles.find(priorityFn);
        if (found) return found;
    }

    return allFiles[0];
}

/**
 * Supabaseに画像をアップロードしてDBを更新する
 */
async function uploadAndUpdate(product, imagePath, imageName) {
    try {
        const fileBuffer = fs.readFileSync(imagePath);
        const ext = path.extname(imageName).toLowerCase();
        const storagePath = `products/${product.id}${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(storagePath, fileBuffer, {
                contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
                upsert: true,
            });

        if (uploadError) {
            console.error(`  [FAIL] ${product.sku} (${product.name}) - アップロードエラー:`, uploadError.message);
            return false;
        }

        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(storagePath);

        const { error: updateError } = await supabase
            .from('products')
            .update({ image_url: urlData.publicUrl })
            .eq('id', product.id);

        if (updateError) {
            console.error(`  [FAIL] ${product.sku} (${product.name}) - DB更新エラー:`, updateError.message);
            return false;
        }

        console.log(`  [OK] ${product.sku} | ${product.name} | ${imageName}`);
        return true;
    } catch (err) {
        console.error(`  [FAIL] ${product.sku} (${product.name}) - ${err.message}`);
        return false;
    }
}

/**
 * メイン処理
 */
async function main() {
    console.log('=== ネットワークドライブから画像インポート (V2) ===');
    console.log('');

    // 1. DB商品のSKU一覧を取得（画像未登録のもの）
    console.log('1. DB商品データを取得中...');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, sku, name, image_url')
        .not('sku', 'is', null);

    if (error) {
        console.error('DB取得エラー:', error.message);
        return;
    }

    const skuToProduct = {};
    products.forEach(p => {
        if (p.sku) skuToProduct[p.sku] = p;
    });

    const needImage = products.filter(p => !p.image_url);
    console.log(`   DB商品数: ${products.length} (画像未登録: ${needImage.length})`);

    // 2. ネットワークドライブのフォルダを走査
    console.log('2. フォルダベースのマッチング...');
    let folders;
    try {
        folders = fs.readdirSync(NETWORK_PATH, { withFileTypes: true })
            .filter(d => d.isDirectory());
    } catch (err) {
        console.error('ネットワークドライブ読み取りエラー:', err.message);
        return;
    }

    let uploadedCount = 0;
    let matchedCount = 0;
    let skippedCount = 0;

    // バルクフォルダ以外のフォルダを走査
    const bulkFolderNames = ['幸南NB2kg10kg立体', '新ロゴ立体画像', '幸南食糧さま画像', '表示画像png', 'カンプ旧', '幸南食糧_新ロゴ変更分', '新ロゴ立体画像'];
    for (const folder of folders) {
        if (bulkFolderNames.includes(folder.name)) continue;

        const folderPath = path.join(NETWORK_PATH, folder.name);
        const skus = extractSkusFromName(folder.name);

        for (const sku of skus) {
            const product = skuToProduct[sku];
            if (!product) continue;
            matchedCount++;

            if (product.image_url) {
                skippedCount++;
                continue;
            }

            const bestImage = selectBestImage(folderPath);
            if (!bestImage) continue;

            if (await uploadAndUpdate(product, bestImage.path, bestImage.name)) {
                uploadedCount++;
                product.image_url = 'uploaded'; // 重複防止フラグ
            }
        }
    }

    // 3. バルクフォルダを走査（ファイル名でSKUマッチング）
    console.log('3. バルクフォルダのファイル名マッチング...');

    for (const bulkName of bulkFolderNames) {
        const bulkPath = path.join(NETWORK_PATH, bulkName);
        if (!fs.existsSync(bulkPath)) continue;

        console.log(`   フォルダ: ${bulkName}`);

        let files;
        try {
            files = [];
            // 再帰的にファイル取得
            const getFilesRecursive = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (IMAGE_EXTENSIONS.includes(ext)) {
                            files.push({ name: entry.name, path: fullPath });
                        }
                    } else if (entry.isDirectory()) {
                        try { getFilesRecursive(fullPath); } catch (e) { /* ignore */ }
                    }
                }
            };
            getFilesRecursive(bulkPath);
        } catch (err) {
            console.error(`   読み取りエラー: ${err.message}`);
            continue;
        }

        // ファイル名からSKUを抽出しマッチング
        // SKUごとに最適な画像を選ぶ
        const skuFiles = {};
        for (const file of files) {
            const skus = extractSkusFromName(file.name);
            for (const sku of skus) {
                if (!skuFiles[sku]) skuFiles[sku] = [];
                skuFiles[sku].push(file);
            }
        }

        for (const [sku, matchedFiles] of Object.entries(skuFiles)) {
            const product = skuToProduct[sku];
            if (!product) continue;
            matchedCount++;

            if (product.image_url) {
                skippedCount++;
                continue;
            }

            // 最適な画像を選択（表立体 > 立体 > JPG > PNG）
            let bestFile = matchedFiles.find(f => f.name.includes('表立体'))
                || matchedFiles.find(f => f.name.includes('立体') && !f.name.includes('裏') && !f.name.includes('側面') && !f.name.includes('上面'))
                || matchedFiles.find(f => f.name.includes('立体'))
                || matchedFiles.find(f => f.name.endsWith('.jpg') || f.name.endsWith('.jpeg'))
                || matchedFiles.find(f => f.name.endsWith('.png'))
                || matchedFiles[0];

            if (bestFile) {
                if (await uploadAndUpdate(product, bestFile.path, bestFile.name)) {
                    uploadedCount++;
                    product.image_url = 'uploaded';
                }
            }
        }
    }

    console.log('');
    console.log('=== 完了 ===');
    console.log(`  SKUマッチ合計: ${matchedCount}件`);
    console.log(`  画像アップロード: ${uploadedCount}件`);
    console.log(`  既に登録済み（スキップ）: ${skippedCount}件`);

    // 残りの画像なし商品を表示
    const { data: remaining } = await supabase
        .from('products')
        .select('sku, name')
        .is('image_url', null)
        .not('sku', 'is', null);
    console.log(`  画像未登録の商品: ${remaining ? remaining.length : '?'}件`);
}

main().catch(err => {
    console.error('致命的エラー:', err);
    process.exit(1);
});
