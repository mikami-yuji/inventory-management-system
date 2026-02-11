"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * エラー境界のProps型
 */
type ErrorBoundaryProps = {
    children: React.ReactNode;
    fallback?: React.ReactNode;
};

/**
 * エラー境界のState型
 */
type ErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

/**
 * エラー境界コンポーネント
 * 子コンポーネントのレンダリングエラーをキャッチして
 * フォールバックUIを表示する
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // エラーログをコンソールに出力（本番環境ではSentry等に送信推奨）
        console.error("ErrorBoundary caught error:", error, errorInfo);
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className="m-8 border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                            エラーが発生しました
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-red-600">
                            予期しないエラーが発生しました。ページを再読み込みしてください。
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-red-400 font-mono bg-red-100 p-2 rounded">
                                {this.state.error.message}
                            </p>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            ページを再読み込み
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}
