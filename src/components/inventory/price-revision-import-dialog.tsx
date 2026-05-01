"use client";

import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Upload,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    FileSpreadsheet,
} from "lucide-react";

// Excelから読み取った商品データの型
type ParsedQuoteItem = {
    sku: string; // 受注№
    productName: string; // 商品名
    material: string; // 材質名称
    currentPrice: number; // 現行単価
    newPrice: number; // 新単価
    currentPrintingCost: number; // 現行印刷代
    newPrintingCost: number; // 新印刷代
};

// 材質ごとの適用日設定
type MaterialEffectiveDate = {
    material: string;
    effectiveDate: string; // YYYY-MM-DD
    itemCount: number; // この材質に属する商品数
};

type ImportResult = {
    updatedCount: number;
    skippedCount: number;
    errors: string[];
};

type PriceRevisionImportDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
};

export function PriceRevisionImportDialog({
    open,
    onOpenChange,
    onSuccess,
}: PriceRevisionImportDialogProps): React.ReactElement {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<"upload" | "configure" | "result">("upload");
    const [loading, setLoading] = useState(false);
    const [parsedItems, setParsedItems] = useState<ParsedQuoteItem[]>([]);
    const [materialDates, setMaterialDates] = useState<MaterialEffectiveDate[]>([]);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // ダイアログを閉じる時にリセット
    const handleOpenChange = useCallback((newOpen: boolean): void => {
        if (!newOpen) {
            setStep("upload");
            setParsedItems([]);
            setMaterialDates([]);
            setImportResult(null);
            setLoading(false);
        }
        onOpenChange(newOpen);
    }, [onOpenChange]);

    // Excelファイルを読み込み・解析
    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

            let items: ParsedQuoteItem[] = [];

            // 「見積書」シートから読み込む（値上げツールの出力形式）
            if (workbook.SheetNames.includes("見積書")) {
                const sheet = workbook.Sheets["見積書"];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: 12, defval: "" });

                items = rawData
                    .filter((row) => row["受注№"] && row["新単価"])
                    .map((row) => {
                        const nameMaterial = String(row["商品名 / 材質"] || "");
                        const [productName, material] = nameMaterial.split("\n");
                        return {
                            sku: String(row["受注№"] || ""),
                            productName: productName || "",
                            material: material || "",
                            currentPrice: Number(row["現行単価"]) || 0,
                            newPrice: Number(row["新単価"]) || 0,
                            currentPrintingCost: Number(row["現行印刷代"]) || 0,
                            newPrintingCost: Number(row["改定印刷代単価"]) || Number(row["現行印刷代"]) || 0,
                        };
                    });
            }
            // 「受注データ」シートから読み込む（元データ形式）
            else if (workbook.SheetNames.includes("受注データ")) {
                const sheet = workbook.Sheets["受注データ"];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

                items = rawData
                    .filter((row) => row["受注№"])
                    .map((row) => ({
                        sku: String(row["受注№"] || ""),
                        productName: String(row["商品名"] || ""),
                        material: String(row["材質名称"] || ""),
                        currentPrice: Number(row["単価"]) || 0,
                        newPrice: Number(row["単価"]) || 0, // 同じ（後でUIで設定）
                        currentPrintingCost: Number(row["印刷代"]) || 0,
                        newPrintingCost: Number(row["印刷代"]) || 0,
                    }));
            }

            if (items.length === 0) {
                alert("対応するシート（見積書 または 受注データ）が見つかりませんでした。");
                setLoading(false);
                return;
            }

            setParsedItems(items);

            // 材質ごとにグループ化して適用日設定リストを作成
            const materialMap = new Map<string, number>();
            items.forEach((item) => {
                const key = item.material || "（材質不明）";
                materialMap.set(key, (materialMap.get(key) || 0) + 1);
            });

            const dates: MaterialEffectiveDate[] = Array.from(materialMap.entries()).map(
                ([material, count]) => ({
                    material,
                    effectiveDate: "", // ユーザーが設定
                    itemCount: count,
                })
            );

            setMaterialDates(dates);
            setStep("configure");
        } catch (error) {
            console.error("Excel parse error:", error);
            alert("Excelファイルの読み込みに失敗しました。");
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }, []);

    // 材質の適用日を更新
    const updateMaterialDate = useCallback((index: number, date: string): void => {
        setMaterialDates((prev) => {
            const newDates = [...prev];
            newDates[index] = { ...newDates[index], effectiveDate: date };
            return newDates;
        });
    }, []);

    // 全材質に同じ日付を一括設定
    const setAllDates = useCallback((date: string): void => {
        setMaterialDates((prev) =>
            prev.map((d) => ({ ...d, effectiveDate: date }))
        );
    }, []);

    // インポート実行
    const handleImport = useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            // 適用日マップを作成
            const effectiveDates: Record<string, string> = {};
            materialDates.forEach((md) => {
                if (md.effectiveDate) {
                    effectiveDates[md.material] = md.effectiveDate;
                }
            });

            // APIリクエスト
            const requestBody = {
                items: parsedItems.map((item) => ({
                    sku: item.sku,
                    newUnitPrice: item.newPrice,
                    newPrintingCost: item.newPrintingCost,
                    material: item.material,
                })),
                effectiveDates,
            };

            const response = await fetch("/api/price-revision/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            setImportResult(result.data);
            setStep("result");
            onSuccess?.();
        } catch (error) {
            console.error("Import error:", error);
            alert("インポートに失敗しました: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setLoading(false);
        }
    }, [parsedItems, materialDates, onSuccess]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-orange-500" />
                        価格改定データの取り込み
                    </DialogTitle>
                    <DialogDescription>
                        値上げツールで作成した見積書Excelを読み込み、商品の単価を一括更新します。
                    </DialogDescription>
                </DialogHeader>

                {/* ステップ1: ファイルアップロード */}
                {step === "upload" && (
                    <div className="py-8 text-center space-y-4">
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 hover:border-orange-400 transition-colors">
                            <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-sm text-muted-foreground mb-4">
                                値上げツールで作成した見積書Excelをアップロードしてください
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="price-revision-file"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                                {loading ? "読み込み中..." : "Excelファイルを選択"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ステップ2: 材質ごとの適用日設定 */}
                {step === "configure" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {parsedItems.length}件の商品データを検出しました。
                                材質ごとに値上げが適用される手配日を設定してください。
                            </p>
                            <Badge variant="outline" className="shrink-0">
                                {materialDates.length}材質
                            </Badge>
                        </div>

                        {/* 一括設定 */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                            <Label className="text-sm font-medium whitespace-nowrap">一括設定:</Label>
                            <Input
                                type="date"
                                className="w-44"
                                onChange={(e) => setAllDates(e.target.value)}
                            />
                            <span className="text-xs text-muted-foreground">すべての材質に同じ日付を適用</span>
                        </div>

                        {/* 材質ごとの設定テーブル */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>材質名称</TableHead>
                                        <TableHead className="w-24 text-center">商品数</TableHead>
                                        <TableHead className="w-48">値上げ適用手配日</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materialDates.map((md, index) => (
                                        <TableRow key={md.material}>
                                            <TableCell className="font-medium text-sm">
                                                {md.material}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{md.itemCount}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="date"
                                                    value={md.effectiveDate}
                                                    onChange={(e) => updateMaterialDate(index, e.target.value)}
                                                    className="w-44"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* プレビュー: 最初の数件 */}
                        <details className="text-sm">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                商品データのプレビュー（先頭5件）
                            </summary>
                            <div className="mt-2 border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>受注№</TableHead>
                                            <TableHead>商品名</TableHead>
                                            <TableHead className="text-right">現行単価</TableHead>
                                            <TableHead className="text-right">新単価</TableHead>
                                            <TableHead className="text-right">差額</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedItems.slice(0, 5).map((item) => (
                                            <TableRow key={item.sku}>
                                                <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                                <TableCell className="text-xs max-w-[200px] truncate">{item.productName}</TableCell>
                                                <TableCell className="text-right">{item.currentPrice.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-medium text-orange-600">{item.newPrice.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    {item.newPrice - item.currentPrice > 0 ? "+" : ""}
                                                    {(item.newPrice - item.currentPrice).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </details>
                    </div>
                )}

                {/* ステップ3: 結果表示 */}
                {step === "result" && importResult && (
                    <div className="py-6 space-y-4">
                        <div className="text-center">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                            <h3 className="text-lg font-bold">取り込み完了</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-700">{importResult.updatedCount}</div>
                                <div className="text-sm text-green-600">更新成功</div>
                            </div>
                            <div className="p-4 bg-slate-50 border rounded-lg text-center">
                                <div className="text-2xl font-bold text-slate-500">{importResult.skippedCount}</div>
                                <div className="text-sm text-muted-foreground">スキップ（未登録）</div>
                            </div>
                        </div>

                        {importResult.errors.length > 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    エラー ({importResult.errors.length}件)
                                </div>
                                <ul className="text-xs text-red-600 space-y-1">
                                    {importResult.errors.slice(0, 10).map((err, i) => (
                                        <li key={i}>・{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === "configure" && (
                        <div className="flex gap-2 w-full justify-between">
                            <Button variant="outline" onClick={() => setStep("upload")}>
                                戻る
                            </Button>
                            <Button onClick={handleImport} disabled={loading} className="gap-2">
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                {loading ? "処理中..." : `${parsedItems.length}件の価格を更新する`}
                            </Button>
                        </div>
                    )}
                    {step === "result" && (
                        <Button onClick={() => handleOpenChange(false)}>閉じる</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
