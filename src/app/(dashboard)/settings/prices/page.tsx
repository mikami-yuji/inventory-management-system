"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PriceRevisionImportDialog } from "@/components/products/price-revision-import-dialog";
import { Settings, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PriceSettingsPage(): React.ReactElement {
    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">価格管理</h1>
                <p className="text-muted-foreground mt-1">
                    商品の価格改定スケジュールを一括で管理・予約します
                </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">価格改定の予約について</AlertTitle>
                <AlertDescription className="text-blue-700">
                    指定した「改定日」になると、システム全体の単価が自動的に更新されます。
                    また、過去の発注データにはその時点の単価が保存されているため、改定後も過去の金額は維持されます。
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-amber-500" />
                        価格改定の一括予約（Excelインポート）
                    </CardTitle>
                    <CardDescription>
                        Excelファイルをアップロードして、未来の日付を指定した価格改定を一括で行います。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                        <div>
                            <p className="font-medium">一括アップロードを実行する</p>
                            <p className="text-sm text-muted-foreground">「受注№」と「単価」の列が必要です</p>
                        </div>
                        <PriceRevisionImportDialog />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>使い方のヒント</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• 1つの商品に対して複数の未来の価格を予約できます。</p>
                    <p>• すでに同じ改定日で予約がある場合は、後からアップロードした内容で上書きされます。</p>
                    <p>• 改定日当日になると、在庫一覧や新規発注時の単価に自動反映されます。</p>
                </CardContent>
            </Card>
        </div>
    );
}
