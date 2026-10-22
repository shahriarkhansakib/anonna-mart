import { FileText, Package } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const CMSArticlesTab = lazy(() => import("@/components/admin/cms/CMSArticlesTab"));
const CMSMarketplaceTab = lazy(() => import("@/components/admin/cms/CMSMarketplaceTab"));

const tabs = [
  { value: "articles", label: "Articles", icon: FileText },
  { value: "marketplace", label: "Marketplace", icon: Package },
] as const;

const TabFallback = () => (
  <div className="space-y-4 pt-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-64 rounded-xl" />
  </div>
);

const AdminCMS = () => {
  useDocumentTitle("Content Hub - Admin");
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>("articles");

  return (
    <AdminLayout title="Content Hub" subtitle="Manage blog articles and store content">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop: Horizontal tabs */}
        {!isMobile ? (
          <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 mb-4">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 text-sm data-[state=active]:bg-background"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : (
          /* Mobile: Select dropdown */
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 -mx-1 px-1">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-10 rounded-xl">
                <div className="flex items-center gap-2">
                  {(() => {
                    const t = tabs.find((t) => t.value === activeTab);
                    return t ? (
                      <>
                        <t.icon className="h-4 w-4" />
                        <span>{t.label}</span>
                      </>
                    ) : null;
                  })()}
                </div>
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <TabsContent value="articles" className="mt-0">
          <Suspense fallback={<TabFallback />}>
            <CMSArticlesTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="marketplace" className="mt-0">
          <Suspense fallback={<TabFallback />}>
            <CMSMarketplaceTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminCMS;
