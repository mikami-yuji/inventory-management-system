/**
 * ネットワークドライブ画像インポートスクリプト
 * 
 * 指定されたネットワークパスから商品画像を検索し、Supabase Storageにアップロードして紐付けます。
 * 
 * 対象パス: \\Asahipack02\社内書類ｎｅｗ\01：部署別　営業部\03：デザインデータ\大阪本社　08：見上\幸南食糧依頼はここへ
 * 検索条件:
 *  1. ファイル名が "[SKU]-..." で始まる
 *  2. ファイル名に "立体" を含む (例: 1259412-1-5kg-立体.jpg)
 *  3. 拡張子が .jpg
 *  4. 同一SKUで複数ある場合は更新日時が新しいものを採用
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEARCH_DIR = 'C:\\Users\\asahi\\Dropbox\\幸南新ロゴ立体';
const STORAGE_BUCKET = 'product-images';

if (!supabaseUrl || !supabaseKey) {
    console.error('エラー: Supabase環境変数が設定されていません');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 再帰的にディレクトリを探索する関数 (深さ制限付き)
function findImages(dir, depth = 0, maxDepth = 2) {
    let results = [];
    if (depth > maxDepth) return results;

    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const fullPath = path.join(dir, file);
            try {
                const stat = fs.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(findImages(fullPath, depth + 1, maxDepth));
                } else {
                    // 条件: .jpg かつ "立体" を含む
                    if (path.extname(file).toLowerCase() === '.jpg' && file.includes('立体')) {
                        results.push({
                            path: fullPath,
                            filename: file,
                            mtime: stat.mtime
                        });
                    }
                }
            } catch (e) {
                // アクセス権限エラーなどは無視
            }
        });
    } catch (e) {
        console.error(`Directory access error: ${dir}`, e.message);
    }
    return results;
}

// ファイル名からSKUを抽出
function extractSku(filename) {
    // パターン1: 先頭が数字 (例: 1259412-1-...)
    let match = filename.match(/^([0-9]+)-/);
    if (match) return match[1];

    // パターン2: "立体"の後に数字 (例: 230419立体1164483-14...)
    match = filename.match(/立体\s*([0-9]+)-/);
    if (match) return match[1];

    return null;
}

async function uploadImage(filePath, filename) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        // URLエンコードするか、安全な名前に変更する
        // 日本語ファイル名がエラーになるため、SKUベースの名前に変更
        const sku = extractSku(filename);
        const safeFilename = sku ? `${sku}_${Date.now()}.jpg` : `img_${Date.now()}.jpg`;
        const storagePath = `imported/${safeFilename}`;

        const { data, error } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, fileBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);

        return publicUrl;
    } catch (err) {
        console.error(`Upload error for ${filename}:`, err);
        return null;
    }
}

async function main() {
    console.log(`Searching images in: ${SEARCH_DIR}`);
    const images = findImages(SEARCH_DIR);
    console.log(`Found ${images.length} potential images.`);

    // SKUごとに最新の画像をグループ化
    const imageMap = new Map(); // SKU -> ImageObject

    for (const img of images) {
        const sku = extractSku(img.filename);
        if (!sku) continue;

        if (!imageMap.has(sku)) {
            imageMap.set(sku, img);
        } else {
            // 更新日時が新しい方を採用
            const current = imageMap.get(sku);
            if (img.mtime > current.mtime) {
                imageMap.set(sku, img);
            }
        }
    }

    console.log(`Unique SKUs with images: ${imageMap.size}`);

    // DBからSKU一覧を取得してマッチング
    // SKUは文字列型と仮定
    const skus = Array.from(imageMap.keys());
    let successCount = 0;
    let matchCount = 0;

    // バッチ処理で商品を検索
    // 一度に全件は多すぎるかもしれないので、見つかった画像に対応する商品があるか確認するアプローチ

    for (const [sku, img] of imageMap) {
        // 0埋めなし、ありの両方で検索できるように考慮が必要だが、
        // 画像ファイル名のSKUとDBのSKUが一致するか確認

        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, image_url, sku')
            .or(`sku.eq.${sku}, sku.eq.${sku.padStart(7, '0')}`)
            .limit(1);

        if (error) {
            console.error(`Error searching product SKU ${sku}:`, error.message);
            continue;
        }

        if (products && products.length > 0) {
            const product = products[0];
            matchCount++;

            // 既に画像がある場合はスキップするか？ -> "最新の日の画像を入れて"とあるので上書きが望ましい
            // ただし、既に手動アップロードされたものを上書きするのは危険かも。
            // 今回は要望に従いインポートを実行する。

            console.log(`Uploading for [${product.name}] (SKU: ${product.sku})...`);

            const publicUrl = await uploadImage(img.path, img.filename);

            if (publicUrl) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ image_url: publicUrl })
                    .eq('id', product.id);

                if (updateError) {
                    console.error(`Failed to update product ${product.id}:`, updateError.message);
                } else {
                    console.log(`Updated image for ${product.name}`);
                    successCount++;
                }
            }
        } else {
            // console.log(`No product found for SKU ${sku}`);
        }
    }

    console.log('\n--- Import Completed ---');
    console.log(`Total SKUs with images found: ${imageMap.size}`);
    console.log(`Matched Products: ${matchCount}`);
    console.log(`Successfully Updated: ${successCount}`);
}

main();
