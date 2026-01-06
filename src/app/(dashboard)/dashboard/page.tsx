import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Package, TicketPercent } from "lucide-react";
import { MOCK_INCOMING_STOCK, MOCK_EVENTS, MOCK_INVENTORY } from "@/lib/mock-data";

export default function DashboardPage() {
    const activeEvents = MOCK_EVENTS.filter(e => e.status === 'active');
    const incomingStock = MOCK_INCOMING_STOCK;
    const lowStockItems = MOCK_INVENTORY.filter(i => i.quantity < 50);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">進行中の特売イベント</CardTitle>
                        <TicketPercent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeEvents.length} 件</div>
                        <p className="text-xs text-muted-foreground">
                            現在開催中のイベント
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">入荷予定</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{incomingStock.length} 件</div>
                        <p className="text-xs text-muted-foreground">
                            直近の入荷スケジュール
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">要確認在庫</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{lowStockItems.length} 品目</div>
                        <p className="text-xs text-muted-foreground">
                            在庫数が50未満の商品
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Incoming Stock List */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>入荷予定スケジュール</CardTitle>
                        <CardDescription>
                            直近入荷予定の商品一覧です。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {incomingStock.map((stock) => (
                                <div key={stock.id} className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">商品ID: {stock.productId}</p>
                                        <p className="text-sm text-muted-foreground">
                                            予定日: {stock.expectedDate} / 数量: {stock.quantity}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">
                                        {stock.note && <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">{stock.note}</span>}
                                    </div>
                                </div>
                            ))}
                            {incomingStock.length === 0 && (
                                <p className="text-sm text-muted-foreground">入荷予定はありません。</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Active Events Banner */}
                <Card className="col-span-3 bg-gradient-to-br from-pink-50 to-white border-pink-100">
                    <CardHeader>
                        <CardTitle className="text-pink-700">開催中の特売イベント</CardTitle>
                        <CardDescription>
                            あなたに関連する特売イベント
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeEvents.map(event => (
                            <div key={event.id} className="mb-4 last:mb-0 p-4 bg-white rounded-lg shadow-sm border border-pink-100">
                                <h4 className="font-semibold text-pink-900">{event.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">{event.startDate} 〜 {event.endDate}</p>
                                <p className="text-sm mt-2">{event.description}</p>
                            </div>
                        ))}
                        {activeEvents.length === 0 && (
                            <p className="text-sm text-muted-foreground">現在開催中のイベントはありません。</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
