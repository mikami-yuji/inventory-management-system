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
    ChevronDown,
    ChevronRight,
    Boxes,
    Truck,
    Wrench,
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

type RouteGroup = {
    groupLabel: string;
    groupIcon: React.ComponentType<{ className?: string }>;
    groupColor?: string;
    children: RouteItem[];
};

type RouteEntry = RouteItem | RouteGroup;

// グループかどうかを判定
const isGroup = (entry: RouteEntry): entry is RouteGroup => {
    return 'children' in entry;
};

// ルート定義
const routes: RouteEntry[] = [
    // メイン
    {
        label: "ダッシュボード",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    // 在庫管理グループ
    {
        groupLabel: "在庫管理",
        groupIcon: Boxes,
        groupColor: "text-violet-500",
        children: [
            {
                label: "米袋在庫",
                icon: Package,
                href: "/inventory/bags",
                color: "text-violet-400",
            },
            {
                label: "シール在庫",
                icon: Package,
                href: "/inventory/stickers",
                color: "text-green-400",
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
                color: "text-cyan-400",
            },
        ],
    },
    // 販売・業務グループ
    {
        groupLabel: "販売・業務",
        groupIcon: Truck,
        groupColor: "text-orange-500",
        children: [
            {
                label: "発注履歴",
                icon: ShoppingCart,
                href: "/orders",
                color: "text-orange-400",
            },
            {
                label: "特売イベント",
                icon: CalendarDays,
                href: "/events",
                color: "text-pink-400",
            },
        ],
    },
    // 設定・分析グループ
    {
        groupLabel: "設定・分析",
        groupIcon: Wrench,
        groupColor: "text-emerald-500",
        children: [
            {
                label: "レポート",
                icon: BarChart3,
                href: "/reports",
                color: "text-emerald-400",
            },
            {
                label: "設定",
                icon: Settings,
                href: "/settings",
                color: "text-gray-400",
            },
        ],
    },
];

// 単一リンクアイテム
function NavItem({ route, pathname, onClick }: { route: RouteItem; pathname: string; onClick?: () => void }) {
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

// グループアイテム（アコーディオン）
function NavGroup({ group, pathname, onClick }: { group: RouteGroup; pathname: string; onClick?: () => void }) {
    // 子のいずれかがアクティブならグループを開く
    const isChildActive = group.children.some(
        child => pathname === child.href || pathname.startsWith(child.href + '/')
    );
    const [isOpen, setIsOpen] = useState(isChildActive);

    return (
        <div className="space-y-1">
            {/* グループヘッダー */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                    isChildActive ? "text-white" : "text-zinc-400"
                )}
            >
                <div className="flex items-center flex-1">
                    <group.groupIcon className={cn("h-5 w-5 mr-3", group.groupColor)} />
                    {group.groupLabel}
                </div>
                {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                ) : (
                    <ChevronRight className="h-4 w-4" />
                )}
            </button>

            {/* 子アイテム */}
            {isOpen && (
                <div className="pl-4 space-y-1">
                    {group.children.map((child) => (
                        <NavItem key={child.href} route={child} pathname={pathname} onClick={onClick} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-10">
                    <h1 className="text-xl font-bold">
                        在庫管理システム
                    </h1>
                </Link>
                <div className="space-y-2">
                    {routes.map((entry, index) => (
                        isGroup(entry) ? (
                            <NavGroup key={entry.groupLabel} group={entry} pathname={pathname} onClick={onNavigate} />
                        ) : (
                            <NavItem key={entry.href} route={entry} pathname={pathname} onClick={onNavigate} />
                        )
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
                <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}
