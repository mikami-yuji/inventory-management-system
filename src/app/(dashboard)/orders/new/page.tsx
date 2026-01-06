"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        alert("出荷依頼を送信しました（モック）");
        router.push('/orders');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">新規出荷依頼</h2>
                <p className="text-muted-foreground">通常在庫からの出荷依頼を作成します。</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>依頼内容</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">

                        <div className="grid gap-2">
                            <Label htmlFor="product">商品</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="商品を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MOCK_PRODUCTS.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} (在庫あり)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="quantity">数量</Label>
                            <Input id="quantity" type="number" min="1" placeholder="10" required />
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => router.back()}>キャンセル</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? '送信中...' : '出荷依頼を確定'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
