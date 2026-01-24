const XLSX = require('xlsx');
const path = require('path');

// User provided path: C:\Users\見上　祐司\Desktop\43006_幸南食糧（株）.xlsx
// Note: We need to handle the path correctly.
const filePath = 'C:\\Users\\見上　祐司\\Desktop\\43006_幸南食糧（株）.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get headers (first row) and first few rows of data
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('Sheet Name:', sheetName);
    console.log('Total Rows:', data.length);

    if (data.length > 0) {
        // ヘッダーを除外してデータ行のみを処理
        const dataRows = data.slice(1);

        // 商品コード（インデックス3）がある行を探す
        const rowsWithProductCode = dataRows.filter(row => row[3] && String(row[3]).trim() !== '');

        console.log(`Total rows: ${dataRows.length}`);
        console.log(`Rows with Product Code: ${rowsWithProductCode.length}`);

        if (rowsWithProductCode.length > 0) {
            console.log('Sample rows with Product Code:');
            rowsWithProductCode.slice(0, 5).forEach((row, i) => {
                console.log(`Sample ${i + 1}: Col A (OrderNo)=${row[0]}, Col D (ProductCode)=${row[3]}`);
            });
        } else {
            console.log('No rows with Product Code found.');
        }
    }

} catch (error) {
    console.error('Error reading Excel file:', error);
}
