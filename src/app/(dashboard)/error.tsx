"use client";

/**
 * ダッシュボードエリアのNext.jsエラーページ
 * サーバーサイド/クライアントサイドの未処理エラーをキャッチ
 */

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type ErrorPageProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function DashboardError({ error, reset }: ErrorPageProps): React.ReactElement {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-lg border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        エラーが発生しました
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-red-600">
                        ページの読み込み中にエラーが発生しました。
                    </p>
                    {error.message && (
                        <div className="text-xs text-red-400 font-mono bg-red-100 p-3 rounded overflow-auto max-h-32">
                            {error.message}
                        </div>
                    )}
                    {error.digest && (
                        <p className="text-xs text-red-300">
                            エラーID: {error.digest}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={reset}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            もう一度試す
                        </Button>
                        <Button variant="ghost" asChild className="gap-2">
                            <Link href="/dashboard">
                                <Home className="h-4 w-4" />
                                ダッシュボードに戻る
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
