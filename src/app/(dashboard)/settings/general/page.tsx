
"use client";

import { useState, useEffect } from "react";
import { useAppSettings } from "@/hooks/use-masters";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GeneralSettingsPage() {
    const { settings, isLoading, isError, mutate } = useAppSettings();
    const [minStockAlertRoll, setMinStockAlertRoll] = useState<string>("1500");
    const [minStockAlertBag, setMinStockAlertBag] = useState<string>("3000");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (settings) {
            if (settings.default_min_stock_alert_roll !== undefined) {
                setMinStockAlertRoll(String(settings.default_min_stock_alert_roll));
            }
            if (settings.default_min_stock_alert_bag !== undefined) {
                setMinStockAlertBag(String(settings.default_min_stock_alert_bag));
            }
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const res1 = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: "default_min_stock_alert_roll",
                    value: Number(minStockAlertRoll)
                }),
            });

            const res2 = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: "default_min_stock_alert_bag",
                    value: Number(minStockAlertBag)
                }),
            });

            if (!res1.ok || !res2.ok) throw new Error("Failed to update settings");

            await mutate();
            setMessage({ type: 'success', text: "設定を保存しました" });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "保存に失敗しました" });
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (isError) {
        return <div className="text-red-500">エラーが発生しました</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">一般設定</h2>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>在庫アラート設定</CardTitle>
                    <CardDescription>
                        在庫不足と判定するデフォルトの閾値を設定します。
                        個別に閾値が設定されていない商品に適用されます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="min-stock-roll">ロール袋 (m)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="min-stock-roll"
                                    type="number"
                                    value={minStockAlertRoll}
                                    onChange={(e) => setMinStockAlertRoll(e.target.value)}
                                    className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">m</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="min-stock-bag">単袋・その他 (枚)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="min-stock-bag"
                                    type="number"
                                    value={minStockAlertBag}
                                    onChange={(e) => setMinStockAlertBag(e.target.value)}
                                    className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">枚</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground pt-2">
                        この数値を下回ると、在庫一覧やダッシュボードで警告が表示されます。
                    </p>

                    {message && (
                        <Alert variant={message.type === 'error' ? "destructive" : "default"} className={message.type === 'success' ? "border-green-500 text-green-700 bg-green-50" : ""}>
                            <AlertTitle>{message.type === 'success' ? "成功" : "エラー"}</AlertTitle>
                            <AlertDescription>{message.text}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!saving && <Save className="mr-2 h-4 w-4" />}
                        保存
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
