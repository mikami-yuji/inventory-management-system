"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // 簡易的なフォーム処理（実際はServer ActionやReact Hook Formを使う）
    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        alert("イベントを作成しました（モック）");
        router.push('/events');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">新規イベント作成</h2>
                <p className="text-muted-foreground">新しい特売イベントを作成し、在庫を確保します。</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>イベント基本情報</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">イベント名</Label>
                            <Input id="name" placeholder="例: 年末大感謝祭" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">開始日</Label>
                                <Input id="startDate" type="date" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">終了日</Label>
                                <Input id="endDate" type="date" required />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">説明・備考</Label>
                            <Textarea id="description" placeholder="イベントの概要や対象クライアントについて..." />
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => router.back()}>キャンセル</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? '作成中...' : 'イベントを作成'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
