import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function BagsInventorySkeleton(): React.ReactElement {
    return (
        <div className="space-y-4">
            {/* タイトル＆クイックタブ スケルトン */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-28 rounded-md" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <div className="flex gap-1.5 ml-2">
                        <Skeleton className="h-6.5 w-16 rounded-full" />
                        <Skeleton className="h-6.5 w-20 rounded-full" />
                        <Skeleton className="h-6.5 w-20 rounded-full" />
                        <Skeleton className="h-6.5 w-20 rounded-full" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-24 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                    <Skeleton className="h-7 w-20 rounded-md" />
                </div>
            </div>

            {/* フィルターバー スケルトン */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap gap-2 items-center">
                <Skeleton className="h-7.5 w-64 rounded-md" />
                <Skeleton className="h-7.5 w-24 rounded-md" />
                <Skeleton className="h-7.5 w-24 rounded-md" />
                <Skeleton className="h-7.5 w-24 rounded-md" />
                <Skeleton className="h-7.5 w-24 rounded-md" />
                <Skeleton className="h-7.5 w-28 rounded-md" />
            </div>

            {/* テーブル スケルトン */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <Skeleton className="h-5 w-32 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <div className="divide-y divide-slate-100">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="p-3 flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-48 rounded-md" />
                                <Skeleton className="h-3 w-32 rounded-md" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-md" />
                            <Skeleton className="h-6 w-16 rounded-md" />
                            <Skeleton className="h-6 w-20 rounded-md" />
                            <Skeleton className="h-6 w-20 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
