/**
 * ダッシュボードエリアのNext.jsローディングページ
 * ページ遷移時のスケルトンUIを表示
 */

import React from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading(): React.ReactElement {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
        </div>
    );
}
