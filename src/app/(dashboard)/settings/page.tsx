"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Bell,
    Mail,
    AlertTriangle,
    Package,
    Calendar,
    RefreshCw,
    Send,
    Info,
    Download,
    Upload,
    Loader2,
    Database,
    CheckCircle2,
} from "lucide-react";
import { useNotification } from "@/contexts/notification-context";
import { inventoryService } from "@/lib/services";
import { useMemo } from "react";

export default function SettingsPage(): React.ReactElement {
    const { settings, updateSettings, resetSettings, testNotification } = useNotification();

    // データ管理用の状態
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; error: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 現在の低在庫商品数を計算
    const lowStockStats = useMemo(() => {
        const inventory = inventoryService.getInventory();
        const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity < settings.lowStockThreshold).length;
        const outOfStock = inventory.filter(i => i.quantity === 0).length;
        return { lowStock, outOfStock };
    }, [settings.lowStockThreshold]);

    // CSVエクスポート（直接URLを開いてダウンロード）
    const handleExport = (): void => {
        setIsExporting(true);
        // 直接URLに遷移してダウンロード
        window.location.href = '/api/products/export';
        // 少し遅延してローディング解除
        setTimeout(() => setIsExporting(false), 2000);
    };

    // CSVインポート
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/products/import', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setImportResult({ success: result.successCount, error: result.errorCount });
            } else {
                throw new Error(result.error || 'Import failed');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('インポートに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">設定</h2>
                <p className="text-muted-foreground">在庫アラート通知の設定を管理します</p>
            </div>

            {/* データ管理 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        データ管理
                    </CardTitle>
                    <CardDescription>
                        商品データをCSVでエクスポート・インポートして一括編集できます
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* エクスポート */}
                        <div className="flex-1 p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">CSVエクスポート</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                全商品データをCSVファイルでダウンロードします。
                                Excel/Googleスプレッドシートで編集できます。
                            </p>
                            <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                                {isExporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                {isExporting ? 'エクスポート中...' : 'CSVをダウンロード'}
                            </Button>
                        </div>

                        {/* インポート */}
                        <div className="flex-1 p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">CSVインポート</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                編集したCSVをアップロードして一括更新します。
                                ID列は変更しないでください。
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleImport}
                                className="hidden"
                                id="csv-import"
                            />
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isImporting}
                                className="gap-2"
                            >
                                {isImporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                                {isImporting ? 'インポート中...' : 'CSVをアップロード'}
                            </Button>

                            {importResult && (
                                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>成功: {importResult.success}件</span>
                                        {importResult.error > 0 && (
                                            <span className="text-red-600">/ 失敗: {importResult.error}件</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 現在のステータス */}
            <Card className="bg-gradient-to-r from-amber-50 to-white border-amber-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-5 w-5" />
                        現在の在庫状況
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-lg px-3 py-1">
                                {lowStockStats.outOfStock}
                            </Badge>
                            <span className="text-sm text-muted-foreground">欠品</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-lg px-3 py-1 bg-amber-100 text-amber-800">
                                {lowStockStats.lowStock}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                低在庫（{settings.lowStockThreshold}個未満）
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* メイン設定 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        通知設定
                    </CardTitle>
                    <CardDescription>
                        在庫アラートの通知方法を設定します
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 通知有効/無効 */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="enabled" className="text-base">通知を有効にする</Label>
                            <p className="text-sm text-muted-foreground">
                                在庫アラートのメール通知を受け取ります
                            </p>
                        </div>
                        <Switch
                            id="enabled"
                            checked={settings.enabled}
                            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                        />
                    </div>

                    <Separator />

                    {/* メールアドレス */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            通知先メールアドレス
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="example@company.com"
                            value={settings.email}
                            onChange={(e) => updateSettings({ email: e.target.value })}
                            disabled={!settings.enabled}
                        />
                    </div>

                    <Separator />

                    {/* 低在庫閾値 */}
                    <div className="space-y-4">
                        <Label className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            低在庫の閾値
                        </Label>
                        <div className="flex items-center gap-4">
                            <Slider
                                value={[settings.lowStockThreshold]}
                                onValueChange={(value) => updateSettings({ lowStockThreshold: value[0] })}
                                min={10}
                                max={200}
                                step={10}
                                className="flex-1"
                                disabled={!settings.enabled}
                            />
                            <div className="w-20 text-right">
                                <Badge variant="outline" className="text-lg">
                                    {settings.lowStockThreshold}個
                                </Badge>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            在庫数がこの値を下回ると通知されます
                        </p>
                    </div>

                    <Separator />

                    {/* アラート種類 */}
                    <div className="space-y-4">
                        <Label className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            アラート種類
                        </Label>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="outOfStock">欠品アラート</Label>
                                <p className="text-sm text-muted-foreground">
                                    商品が欠品になった時に通知
                                </p>
                            </div>
                            <Switch
                                id="outOfStock"
                                checked={settings.outOfStockAlert}
                                onCheckedChange={(checked) => updateSettings({ outOfStockAlert: checked })}
                                disabled={!settings.enabled}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* レポート設定 */}
                    <div className="space-y-4">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            定期レポート
                        </Label>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="dailyReport">日次レポート</Label>
                                <p className="text-sm text-muted-foreground">
                                    毎日の在庫状況サマリーを送信
                                </p>
                            </div>
                            <Switch
                                id="dailyReport"
                                checked={settings.dailyReport}
                                onCheckedChange={(checked) => updateSettings({ dailyReport: checked })}
                                disabled={!settings.enabled}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="weeklyReport">週次レポート</Label>
                                <p className="text-sm text-muted-foreground">
                                    週間の在庫推移レポートを送信
                                </p>
                            </div>
                            <Switch
                                id="weeklyReport"
                                checked={settings.weeklyReport}
                                onCheckedChange={(checked) => updateSettings({ weeklyReport: checked })}
                                disabled={!settings.enabled}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 注意書き */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-900">
                                メール通知について
                            </p>
                            <p className="text-sm text-blue-700">
                                実際のメール送信にはバックエンドサーバーとの連携が必要です。
                                現在はフロントエンドのみの実装のため、設定は保存されますが
                                メールは送信されません。
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* アクションボタン */}
            <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={resetSettings} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    設定をリセット
                </Button>
                <Button onClick={testNotification} disabled={!settings.enabled} className="gap-2">
                    <Send className="h-4 w-4" />
                    テスト通知を送信
                </Button>
            </div>
        </div>
    );
}
