"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    CalendarDays,
    ShoppingCart,
    Settings,
    Menu,
    BarChart3,
    ClipboardEdit,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const routes = [
    {
        label: "ダッシュボード",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "米袋在庫",
        icon: Package,
        href: "/inventory/bags",
        color: "text-violet-500",
    },
    {
        label: "シール在庫",
        icon: Package,
        href: "/inventory/stickers",
        color: "text-green-500",
    },
    {
        label: "その他在庫",
        icon: Package,
        href: "/inventory/others",
        color: "text-gray-400",
    },
    {
        label: "在庫入力",
        icon: ClipboardEdit,
        href: "/stock-input",
        color: "text-cyan-500",
    },
    {
        label: "特売イベント",
        icon: CalendarDays,
        href: "/events",
        color: "text-pink-700",
    },
    {
        label: "発注履歴",
        icon: ShoppingCart,
        href: "/orders",
        color: "text-orange-700",
    },
    {
        label: "レポート",
        icon: BarChart3,
        href: "/reports",
        color: "text-emerald-500",
    },
    {
        label: "米袋報告書",
        icon: FileText,
        href: "/reports/stock-report?category=bag",
        color: "text-violet-400",
    },
    {
        label: "シール報告書",
        icon: FileText,
        href: "/reports/stock-report?category=sticker",
        color: "text-green-400",
    },
    {
        label: "設定",
        icon: Settings,
        href: "/settings",
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <h1 className="text-2xl font-bold">
                        Inventory App
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MobileSidebar() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-[#111827]">
                <Sidebar />
            </SheetContent>
        </Sheet>
    );
}
