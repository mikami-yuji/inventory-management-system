"use client";

/**
 * データ管理ページ
 * CSVエクスポート・インポート機能を提供
 */

import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Download,
    Upload,
    FileSpreadsheet,
    Package,
    Boxes,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    FileUp,
} from "lucide-react";

// インポート結果の型
type ImportResult = {
    success: boolean;
    totalRows: number;
    successCount: number;
    errorCount: number;
    errors: string[];
};

// エクスポート項目の型
type ExportItem = {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    endpoint: string;
    color: string;
};

// エクスポート設定
const exportItems: ExportItem[] = [
    {
        label: "商品マスタ",
        description: "全商品データ（ID, 名前, SKU, JANコード, 重量, 単価など）",
        icon: Package,
        endpoint: "/api/products/export",
        color: "text-violet-500",
    },
    {
        label: "在庫データ",
        description: "在庫数量データ（商品ID, 商品名, 数量, 更新日時）",
        icon: Boxes,
        endpoint: "/api/inventory/export",
        color: "text-emerald-500",
    },
];

// インポート先の型
type ImportTarget = {
    label: string;
    description: string;
    endpoint: string;
    accept: string;
};

// インポート設定
const importTargets: ImportTarget[] = [
    {
        label: "商品マスタ",
        description: "商品データを一括更新（IDベースで既存データを上書き）",
        endpoint: "/api/products/import",
        accept: ".csv",
    },
    {
        label: "在庫データ",
        description: "在庫数量を一括更新（product_idベースでUpsert）",
        endpoint: "/api/inventory/import",
        accept: ".csv",
    },
];

export default function DataManagementPage(): React.ReactElement {
    const [exportLoading, setExportLoading] = useState<string | null>(null);
    const [importTarget, setImportTarget] = useState<ImportTarget | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // エクスポート処理
    const handleExport = async (item: ExportItem): Promise<void> => {
        setExportLoading(item.endpoint);
        try {
            const response = await fetch(item.endpoint);
            if (!response.ok) throw new Error("エクスポートに失敗しました");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Content-Dispositionからファイル名を取得
            const disposition = response.headers.get("Content-Disposition");
            const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/);
            a.download = filenameMatch?.[1] || `export_${new Date().toISOString().slice(0, 10)}.csv`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
            alert("エクスポートに失敗しました");
        } finally {
            setExportLoading(null);
        }
    };

    // ファイル選択処理
    const handleFileSelect = useCallback((file: File): void => {
        setImportFile(file);
        setImportResult(null);
    }, []);

    // ドラッグ&ドロップ処理
    const handleDrop = useCallback((e: React.DragEvent): void => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith(".csv")) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    // インポート実行
    const handleImport = async (): Promise<void> => {
        if (!importFile || !importTarget) return;

        setImportLoading(true);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append("file", importFile);

            const response = await fetch(importTarget.endpoint, {
                method: "POST",
                body: formData,
            });

            const result: ImportResult = await response.json();
            setImportResult(result);

            if (result.success) {
                setImportFile(null);
            }
        } catch (error) {
            console.error("Import error:", error);
            setImportResult({
                success: false,
                totalRows: 0,
                successCount: 0,
                errorCount: 1,
                errors: [error instanceof Error ? error.message : "インポートに失敗しました"],
            });
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">データ管理</h1>
                <p className="text-muted-foreground mt-1">
                    CSVファイルでデータのエクスポート・インポートを行います
                </p>
            </div>

            {/* エクスポートセクション */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-blue-500" />
                        エクスポート
                    </CardTitle>
                    <CardDescription>
                        データをCSVファイルとしてダウンロードします
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {exportItems.map((item) => (
                            <div
                                key={item.endpoint}
                                className="border rounded-lg p-4 flex items-start gap-4 hover:bg-accent/50 transition-colors"
                            >
                                <div className={cn("mt-0.5", item.color)}>
                                    <item.icon className="h-8 w-8" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="font-medium">{item.label}</div>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleExport(item)}
                                        disabled={exportLoading === item.endpoint}
                                        className="gap-2"
                                    >
                                        {exportLoading === item.endpoint ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="h-4 w-4" />
                                        )}
                                        CSVダウンロード
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* インポートセクション */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-green-500" />
                        インポート
                    </CardTitle>
                    <CardDescription>
                        CSVファイルをアップロードしてデータを一括更新します
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* インポート先選択 */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">インポート先を選択</label>
                        <div className="flex gap-2">
                            {importTargets.map((target) => (
                                <Button
                                    key={target.endpoint}
                                    variant={importTarget?.endpoint === target.endpoint ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setImportTarget(target);
                                        setImportFile(null);
                                        setImportResult(null);
                                    }}
                                >
                                    {target.label}
                                </Button>
                            ))}
                        </div>
                        {importTarget && (
                            <p className="text-sm text-muted-foreground mt-2">
                                {importTarget.description}
                            </p>
                        )}
                    </div>

                    {/* ファイルアップロードエリア */}
                    {importTarget && (
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                                importFile && "border-green-500 bg-green-50 dark:bg-green-950/20"
                            )}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            {importFile ? (
                                <div className="space-y-2">
                                    <FileSpreadsheet className="h-10 w-10 mx-auto text-green-500" />
                                    <p className="font-medium">{importFile.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {(importFile.size / 1024).toFixed(1)} KB
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setImportFile(null); setImportResult(null); }}
                                    >
                                        ファイルを変更
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <FileUp className="h-10 w-10 mx-auto text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">CSVファイルをドラッグ&ドロップ</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            または
                                            <button
                                                className="text-primary underline mx-1"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                ファイルを選択
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={importTarget.accept}
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                            />
                        </div>
                    )}

                    {/* インポート実行ボタン */}
                    {importFile && importTarget && (
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleImport}
                                disabled={importLoading}
                                className="gap-2"
                            >
                                {importLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                                インポート実行
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                <AlertTriangle className="h-4 w-4 inline mr-1 text-amber-500" />
                                既存データが上書きされます
                            </p>
                        </div>
                    )}

                    {/* インポート結果 */}
                    {importResult && (
                        <div className={cn(
                            "border rounded-lg p-4 space-y-2",
                            importResult.errorCount === 0 ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                        )}>
                            <div className="flex items-center gap-2 font-medium">
                                {importResult.errorCount === 0 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-amber-500" />
                                )}
                                インポート結果
                            </div>
                            <div className="flex gap-4 text-sm">
                                <Badge variant="secondary">合計: {importResult.totalRows}件</Badge>
                                <Badge variant="secondary" className="text-green-700">
                                    成功: {importResult.successCount}件
                                </Badge>
                                {importResult.errorCount > 0 && (
                                    <Badge variant="destructive">
                                        エラー: {importResult.errorCount}件
                                    </Badge>
                                )}
                            </div>
                            {importResult.errors.length > 0 && (
                                <div className="mt-2 text-sm space-y-1">
                                    <p className="font-medium text-red-600">エラー詳細:</p>
                                    {importResult.errors.map((err, i) => (
                                        <p key={i} className="text-red-600 ml-2">• {err}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 注意事項 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        注意事項
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• エクスポートしたCSVはExcelで開くとJANコードが数値変換される場合があります。編集後のインポートにはCSV形式を維持してください。</p>
                    <p>• インポートは既存データを上書き更新します。新規追加は行われません（商品マスタの場合）。</p>
                    <p>• 在庫データのインポートはUpsert（存在すれば更新、なければ挿入）で処理されます。</p>
                    <p>• インポート前にエクスポートでバックアップを取得することを推奨します。</p>
                </CardContent>
            </Card>
        </div>
    );
}
