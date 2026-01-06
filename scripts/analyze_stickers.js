const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = 'C:\\Users\\見上　祐司\\Desktop\\43006_幸南食糧（株）.xlsx';

function inspectStickers() {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Analyzing ${rows.length} rows...`);

    // Keywords to look for
    const stickers = rows.filter(row => {
        const name = row['商品名'] || '';
        const type = row['種別'] || '';
        return name.includes('シール') || type.includes('シール');
    });

    console.log(`Found ${stickers.length} potential sticker items.`);

    if (stickers.length > 0) {
        console.log('Sample Stickers:');
        stickers.slice(0, 5).forEach(s => {
            console.log(`- Type: ${s['種別']}, Name: ${s['商品名']}, Material: ${s['材質名称']}`);
        });
    }

    // Also check distinct '種別' (Types)
    const types = new Set(rows.map(r => r['種別']));
    console.log('Distinct Types:', Array.from(types));
}

inspectStickers();
