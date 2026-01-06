"use client";

import { MobileSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";

export function Navbar() {
    return (
        <div className="flex items-center p-4">
            <MobileSidebar />
            <div className="flex w-full justify-end">
                <Button variant="ghost" size="icon">
                    <UserCircle className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}
