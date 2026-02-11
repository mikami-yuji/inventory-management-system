/**
 * ダッシュボードエリアの404ページ
 * 存在しないルートにアクセスした場合に表示
 */

import React from "react";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DashboardNotFound(): React.ReactElement {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                        <FileQuestion className="h-6 w-6" />
                        ページが見つかりません
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        お探しのページは存在しないか、移動された可能性があります。
                    </p>
                    <div className="flex gap-3">
                        <Button variant="default" asChild className="gap-2">
                            <Link href="/dashboard">
                                <Home className="h-4 w-4" />
                                ダッシュボードへ
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2"
                            asChild
                        >
                            <Link href="javascript:history.back()">
                                <ArrowLeft className="h-4 w-4" />
                                前のページに戻る
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
