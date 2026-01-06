import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export default function EventsPage() {
    const events = MOCK_EVENTS;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">特売イベント管理</h2>
                <Button asChild>
                    <Link href="/events/new">
                        <Plus className="mr-2 h-4 w-4" /> 新規イベント作成
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-bold">{event.name}</CardTitle>
                            <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                                {event.status}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="mt-2 space-y-2 text-sm text-gray-500">
                                <p>期間: {event.startDate} 〜 {event.endDate}</p>
                                <p>{event.description}</p>
                            </div>
                            <div className="mt-4">
                                <Button variant="outline" className="w-full" asChild>
                                    <Link href={`/events/${event.id}`}>詳細・在庫管理</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
