const XLSX = require('xlsx');
const EXCEL_PATH = 'C:\\Users\\asahi\\Desktop\\新幸南食糧様　在庫261.22.xlsx';

try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 最初の5行を取得して表示
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: null });

    console.log('--- Head 5 rows ---');
    rows.slice(0, 5).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

} catch (err) {
    console.error(err);
}
