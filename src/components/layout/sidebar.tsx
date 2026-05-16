"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Settings,
    Menu,
    BarChart3,
    ScanBarcode,
    ChevronDown,
    CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

// ルート定義の型
type RouteItem = {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    color?: string;
};

// メインメニュー（常時表示・最大6項目）
const mainRoutes: RouteItem[] = [
    {
        label: "ダッシュボード",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "在庫管理",
        icon: Package,
        href: "/inventory/bags",
        color: "text-violet-400",
    },
    {
        label: "スキャン",
        icon: ScanBarcode,
        href: "/scan",
        color: "text-green-400",
    },
    {
        label: "発注",
        icon: ShoppingCart,
        href: "/orders",
        color: "text-orange-400",
    },
    {
        label: "特売",
        icon: CalendarDays,
        href: "/events",
        color: "text-pink-400",
    },
    {
        label: "レポート",
        icon: BarChart3,
        href: "/reports",
        color: "text-emerald-400",
    },
];

// 設定サブメニュー（折りたたみ内）
const settingsRoutes: RouteItem[] = [
    { label: "一般設定", icon: Settings, href: "/settings/general", color: "text-gray-400" },
    { label: "仕入先", icon: Package, href: "/settings/suppliers", color: "text-blue-400" },
    { label: "ユーザー", icon: Settings, href: "/settings/users", color: "text-purple-400" },
    { label: "納品先", icon: Package, href: "/settings/delivery-addresses", color: "text-orange-400" },
    { label: "価格管理", icon: Settings, href: "/settings/prices", color: "text-amber-400" },
    { label: "データ管理", icon: Settings, href: "/settings/data", color: "text-teal-400" },
    { label: "通知", icon: Settings, href: "/notifications", color: "text-yellow-400" },
];

// ナビアイテム
function NavItem({ route, pathname, onClick }: { route: RouteItem; pathname: string; onClick?: () => void }): React.ReactElement {
    const isActive = pathname === route.href || pathname.startsWith(route.href + '/');

    return (
        <Link
            href={route.href}
            onClick={onClick}
            className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                isActive ? "text-white bg-white/10" : "text-zinc-400"
            )}
        >
            <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
            </div>
        </Link>
    );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }): React.ReactElement {
    const pathname = usePathname();
    const [settingsOpen, setSettingsOpen] = useState(false);

    // 設定系ページにいる場合は自動展開
    const isSettingsActive = settingsRoutes.some(r => pathname === r.href || pathname.startsWith(r.href + '/'));

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-10">
                    <h1 className="text-xl font-bold">
                        在庫管理
                    </h1>
                </Link>
                <div className="space-y-1">
                    {/* メインメニュー */}
                    {mainRoutes.map((route) => (
                        <NavItem key={route.href} route={route} pathname={pathname} onClick={onNavigate} />
                    ))}

                    {/* 区切り線 */}
                    <div className="my-3 border-t border-white/10" />

                    {/* 設定セクション（折りたたみ） */}
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={cn(
                            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                            isSettingsActive ? "text-white" : "text-zinc-400"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <Settings className={cn("h-5 w-5 mr-3", isSettingsActive ? "text-white" : "text-gray-400")} />
                            設定
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", (settingsOpen || isSettingsActive) && "rotate-180")} />
                    </button>
                    {(settingsOpen || isSettingsActive) && (
                        <div className="pl-4 space-y-1">
                            {settingsRoutes.map((route) => (
                                <NavItem key={route.href} route={route} pathname={pathname} onClick={onNavigate} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function MobileSidebar(): React.ReactElement {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-[#111827]">
                <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}

