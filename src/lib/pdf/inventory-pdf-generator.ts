import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfGenerationOptions {
    filename?: string;
    orientation?: 'p' | 'portrait' | 'l' | 'landscape';
    format?: 'a4';
    onProgress?: (progress: number) => void;
}

/**
 * HTML要素を高解像度マルチページPDFに変換してダウンロードする
 */
export async function exportElementToPdf(
    element: HTMLElement,
    options: PdfGenerationOptions = {}
): Promise<Blob> {
    const {
        filename = `米袋_在庫状況一覧_${new Date().toISOString().slice(0, 10)}.pdf`,
        orientation = 'portrait',
        format = 'a4',
        onProgress
    } = options;

    if (onProgress) onProgress(10);

    // 一時的にスタイルを調整（印刷用の完全表示にする）
    const originalDisplay = element.style.display;
    const originalVisibility = element.style.visibility;
    element.style.display = 'block';
    element.style.visibility = 'visible';

    try {
        if (onProgress) onProgress(30);

        const canvas = await html2canvas(element, {
            scale: 2, // 高解像度
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200
        });

        if (onProgress) onProgress(70);

        const isLandscape = orientation === 'l' || orientation === 'landscape';
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format
        });

        // A4サイズ (mm)
        const pageWidth = isLandscape ? 297 : 210;
        const pageHeight = isLandscape ? 210 : 297;
        const margin = 5; // 余白 5mm
        const printWidth = pageWidth - margin * 2;
        const printHeight = (canvas.height * printWidth) / canvas.width;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        let heightLeft = printHeight;
        let position = margin;

        // 1ページ目
        pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
        heightLeft -= (pageHeight - margin * 2);

        // 2ページ目以降の分割
        while (heightLeft > 0) {
            position = heightLeft - printHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
            heightLeft -= (pageHeight - margin * 2);
        }

        if (onProgress) onProgress(90);

        // PDFファイルの保存
        pdf.save(filename);

        if (onProgress) onProgress(100);

        return pdf.output('blob');
    } finally {
        element.style.display = originalDisplay;
        element.style.visibility = originalVisibility;
    }
}
