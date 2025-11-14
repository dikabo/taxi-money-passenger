import BottomNav from '@/components/layout/BottomNav';

/**
 * File: /app/(dashboard)/layout.tsx
 * Purpose: The layout for the protected passenger dashboard.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Dark theme
    <div className="min-h-screen bg-black text-white">
      {/* Main content area, centered and scrollable */}
      <main className="max-w-md mx-auto pb-24 pt-4 px-4">
        {children}
      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  );
}