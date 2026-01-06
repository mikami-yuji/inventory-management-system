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
        console.log('Headers (Row 0):', data[0]);
    }

    if (data.length > 1) {
        console.log('Sample Row 1:', data[1]);
    }

    if (data.length > 2) {
        console.log('Sample Row 2:', data[2]);
    }

} catch (error) {
    console.error('Error reading Excel file:', error);
}
