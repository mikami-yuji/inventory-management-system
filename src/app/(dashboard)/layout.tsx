import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900 dark:bg-gray-950 print:hidden">
                <Sidebar />
            </div>
            <main className="md:pl-60 print:pl-0">
                <div className="print:hidden">
                    <Navbar />
                </div>
                <div className="px-2 py-4 sm:p-4 md:p-8 print:p-0">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
}

