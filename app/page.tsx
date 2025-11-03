"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Menu, X, Plus, Trash2, Loader2 } from "lucide-react";
import { useCustomer, useRefreshCustomer } from "@/hooks/useAutumnCustomer";
import {
  useBrandAnalyses,
  useBrandAnalysis,
  useDeleteBrandAnalysis,
} from "@/hooks/useBrandAnalyses";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useSession } from "@/lib/auth-client";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BrandMonitor = dynamic(() => import("@/components/brand-monitor/brand-monitor").then(m => m.BrandMonitor), { ssr: false });
const FilesTab = dynamic(() => import("@/components/brand-monitor/files-tab").then(m => m.FilesTab), { ssr: false });

/**
 * Tabbed Brand Monitor Page
 *
 * - Hero header unchanged
 * - Tab bar sits below hero (in the light/grey area)
 * - Tab 1: Brand Monitor (renders your existing BrandMonitorContent)
 * - Tab 2: AEO Report (placeholder)
 * - Tab 3: Files (placeholder)
 * - Tab 4: UGC (placeholder)
 *
 * You can later replace placeholders with real components.
 */

/* --------------------- BrandMonitorContent (unchanged logic) --------------------- */
function BrandMonitorContent({ session, onOpenAeoForUrl, onOpenFilesForUrl, prefillBrand }: { session: any; onOpenAeoForUrl: (url: string, customerName?: string) => void; onOpenFilesForUrl: (url: string, customerName?: string) => void; prefillBrand?: { url: string; customerName: string } | null; }) {
  const router = useRouter();
  const { customer, isLoading, error } = useCustomer();
  const refreshCustomer = useRefreshCustomer();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null
  );


  // Queries and mutations
  const { data: analyses, isLoading: analysesLoading } = useBrandAnalyses();
  const { data: currentAnalysis } = useBrandAnalysis(selectedAnalysisId);
  const deleteAnalysis = useDeleteBrandAnalysis(); // kept for now if used elsewhere (no delete UI)

  // Get credits from customer data
  const messageUsage = customer?.features?.messages;
  const credits = messageUsage ? (messageUsage.balance || 0) : 0;

  useEffect(() => {
    // If there's an auth error, redirect to login
    if (error?.code === "UNAUTHORIZED" || error?.code === "AUTH_ERROR") {
      router.push("/login");
    }
  }, [error, router]);

  // If prefillBrand is provided, try to open existing analysis by exact URL
  useEffect(() => {
    if (prefillBrand?.url && analyses && analyses.length > 0) {
      const found = analyses.find(a => a.url === prefillBrand.url);
      if (found) {
        setSelectedAnalysisId(found.id);
      }
    }
  }, [prefillBrand?.url, analyses]);

  const handleCreditsUpdate = async () => {
    // Use the global refresh to update customer data everywhere
    await refreshCustomer();
  };



  const handleNewAnalysis = () => {
    setSelectedAnalysisId(null);
      setTimeout(() => {
          window.location.hash = '#brand';
      }, 0);
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Header */}
      {/* <div className="relative overflow-hidden bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2 animate-fade-in-up">
                  <span className="block text-zinc-900">AutoReach Monitor</span>
                  <span className="block bg-[#155DFC] bg-clip-text text-transparent">
                    AI Brand Visibility Platform
                  </span>
                </h1>
                <p className="text-lg text-zinc-600 animate-fade-in-up animation-delay-200">
                  Track how AI models rank your brand against competitors
                </p>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* --- Main area: sidebar + content (existing) --- */}
      <div className="flex relative">
        {/* Sidebar Toggle Button - Always visible */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-2 z-10 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 ${
            sidebarOpen ? "left-[324px]" : "left-4"
          }`}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5 text-gray-600" />
          ) : (
            <Menu className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "w-80" : "w-0"} bg-white border-r overflow-hidden flex flex-col transition-all duration-200`}
        >
          <div className="p-4 border-b">
            <Button onClick={handleNewAnalysis} className="w-full btn-firecrawl-orange">
              <Plus className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 max-h-[calc(100vh-15rem)]">
            {analysesLoading ? (
              <div className="p-4 text-center text-gray-500">Loading analyses...</div>
            ) : analyses?.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No analyses yet</div>
            ) : (
              <div className="space-y-1 p-2">
                {analyses?.slice(0, 9).map((analysis) => (
                  <div
                    key={analysis.id}
                    className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                      selectedAnalysisId === analysis.id ? "bg-gray-100" : ""
                    }`}
                    onClick={() => setSelectedAnalysisId(analysis.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{analysis.companyName || "Untitled Analysis"}</p>
                        <p className="text-sm text-gray-500 truncate">{analysis.url}</p>
                        <p className="text-xs text-gray-400">
                          {analysis.createdAt && format(new Date(analysis.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAeoForUrl(analysis.url, analysis.companyName || "autouser");
                          }}
                        >
                          AEO Report
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFilesForUrl(analysis.url, analysis.companyName || "autouser");
                          }}
                        >
                          Files
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 sm:px-8 lg:px-12 py-8">
            <BrandMonitor
              creditsAvailable={credits}
              onCreditsUpdate={handleCreditsUpdate}
              selectedAnalysis={selectedAnalysisId ? currentAnalysis : null}
              onSaveAnalysis={(analysis) => {}}
              initialUrl={prefillBrand?.url || null}
              autoRun={!!prefillBrand?.url && !selectedAnalysisId}
              onRequireCreditsConfirm={(required, balance, proceed) => {
                // Use native confirm for simplicity here; can swap to ConfirmationDialog if preferred
                const ok = window.confirm(`Starting a brand analysis may use up to ${required} credits. Your balance is ${balance}. Proceed?`);
                if (ok) proceed();
              }}
            />
          </div>
        </div>
      </div>


    </div>
  );
}

/* --------------------- Tabbed Page wrapper --------------------- */

function AeoReportTab({ prefill, onOpenBrandForUrl, onOpenFilesForUrl }: { prefill: { url: string; customerName: string } | null; onOpenBrandForUrl: (url: string, customerName?: string) => void; onOpenFilesForUrl: (url: string, customerName?: string) => void; }) {
  const [customerName, setCustomerName] = useState('');
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<{ htmlContent: string; customerName: string; reportType: string; generatedAt: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reports, setReports] = useState<Array<{ id: string; customerName: string; url: string; createdAt: string }>>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [handledPrefillKey, setHandledPrefillKey] = useState<string | null>(null);
  const [prefillLookupState, setPrefillLookupState] = useState<'idle' | 'looking' | 'no-match'>('idle');

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/aeo-report/list');
      const data = await res.json();
      if (res.ok && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch (e) {
      // silent fail
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  // Helper: normalize URL for robust matching (ignores trailing slash and lowercases hostname)
  const normalizeUrl = (u?: string | null) => {
    if (!u) return '';
    try {
      const urlObj = new URL(u);
      // lowercase hostname
      urlObj.hostname = urlObj.hostname.toLowerCase();
      let normalized = urlObj.toString();
      // remove trailing slash (but keep single slash after origin)
      if (normalized.endsWith('/') && !/^[a-zA-Z]+:\/\/$/.test(normalized)) {
        normalized = normalized.replace(/\/+$/, '');
      }
      return normalized;
    } catch {
      // fallback: trim, remove trailing slashes
      return String(u).trim().replace(/\/+$/, '');
    }
  };

  // prefill from cross-tab trigger
  useEffect(() => {
    if (!prefill) return;

    // Set inputs and show lookup state immediately
    setCustomerName(prefill.customerName || 'autouser');
    setUrl(prefill.url || '');
    setPrefillLookupState('looking');

    // Wait until reports are fetched
    if (loadingReports) return;

    // Once loaded, decide using a key that includes current reports length to avoid stale skips
    const decisionKey = `${prefill.url || ''}::${reports.length}`;
    if (handledPrefillKey === decisionKey) return;

    if (prefill.url) {
      const prefillNorm = normalizeUrl(prefill.url);
      const sameUrlReports = reports.filter(r => normalizeUrl(r.url) === prefillNorm);
      const match = sameUrlReports.length > 0 ? sameUrlReports[0] : null;

      if (match) {
        handleOpenReport(match.id);
        setPrefillLookupState('idle');
      } else {
        setPrefillLookupState('no-match');
      }
      setHandledPrefillKey(decisionKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, reports, loadingReports]);

  const generateReport = async () => {
    if (!customerName.trim() || !url.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/aeo-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: customerName.trim(), url: url.trim(), reportType: 'combined' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate report');
      setReportData(data);
      fetchReports();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenReport = async (id: string) => {
    try {
      const res = await fetch(`/api/aeo-report/view?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load report');
      setReportData({ htmlContent: data.html, customerName: data.customerName, reportType: 'combined-ai', generatedAt: data.createdAt });
      setSidebarOpen(false);
    } catch (e) {
      // no-op
    }
  };

  const downloadPDF = async () => {
    if (!reportData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>AEO Report - ${reportData.customerName}</title>
      <style>@page{size:A3 landscape;margin:12mm}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.card{page-break-inside:avoid}}</style>
    </head><body>
      <div class="header" style="text-align:center;margin-bottom:20px;border-bottom:2px solid #004d99;padding-bottom:10px">
        <h1 style="margin:0">AEO Report</h1>
        <p style="margin:6px 0 0">Customer: ${reportData.customerName} | Generated: ${new Date(reportData.generatedAt).toLocaleString()}</p>
      </div>
      ${reportData.htmlContent}
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); printWindow.close(); }, 500); };
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] relative">
      {/* Sidebar Toggle Button - Always visible */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute top-2 z-10 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 ${sidebarOpen ? 'left-[324px]' : 'left-4'}`}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (<X className="h-5 w-5 text-gray-600" />) : (<Menu className="h-5 w-5 text-gray-600" />)}
      </button>

      {/* Sidebar (inline like Brand Monitor) */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r overflow-hidden flex flex-col transition-all duration-200`}>
        <div className="p-4 border-b">
          <div className="font-semibold">AEO Reports</div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loadingReports ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No reports yet</div>
          ) : (
            <div className="space-y-1 p-2">
              {reports.map(r => (
                <div key={r.id} className="p-3 rounded-lg hover:bg-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenReport(r.id)}>
                      <p className="font-medium truncate">{r.customerName || 'Untitled'}</p>
                      <p className="text-sm text-gray-500 truncate">{r.url}</p>
                      <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex-shrink-0 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onOpenBrandForUrl(r.url, r.customerName || 'autouser'); }}>Brand Monitor</Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onOpenFilesForUrl(r.url, r.customerName || 'autouser'); }}>Files</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 sm:px-8 lg:px-12 py-8 max-w-7xl mx-auto">
          {/* Use shared Inputs/Labels/Buttons for consistency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="aeoCustomer" className="text-sm font-medium">Customer Name *</Label>
              <Input id="aeoCustomer" placeholder="Enter customer name" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aeoUrl" className="text-sm font-medium">Website URL *</Label>
              <Input id="aeoUrl" placeholder="https://example.com" value={url} onChange={e=>setUrl(e.target.value)} />
            </div>
          </div>
          <Button onClick={generateReport} disabled={isGenerating} className="btn-firecrawl-default h-9 px-4">
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>

          {/* Lookup status messages when coming from Brand Monitor button */}
          {!reportData && prefillLookupState === 'looking' && (
            <div className="mt-6 text-sm text-gray-600">Looking up existing report…</div>
          )}
          {!reportData && prefillLookupState === 'no-match' && (
            <div className="mt-6 text-sm text-blue-700">No matching report found for the selected URL.</div>
          )}

          {reportData && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600">Generated on {new Date(reportData.generatedAt).toLocaleString()} | Type: {reportData.reportType}</p>
                </div>
                <Button variant="outline" onClick={downloadPDF}>Download PDF</Button>
              </div>
              <div className="report-content border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: reportData.htmlContent }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrandMonitorPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // tabs: 'brand' | 'aeo' | 'files' | 'ugc'
  const [activeTab, setActiveTab] = useState<"brand" | "aeo" | "files" | "ugc">(
    "brand"
  );
  const [resetBrandState, setResetBrandState] = useState(false);

  // Auto-select tab from hash and handle explicit resets
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyHash = () => {
      const hash = window.location.hash.replace('#','');
      if (hash === 'files') setActiveTab('files');
      if (hash === 'aeo') setActiveTab('aeo');
      if (hash === 'brand') {
        setActiveTab('brand');
        // Trigger a reset so input box shows again
        setResetBrandState(true);
        // clear after a tick so subsequent renders behave normally
        setTimeout(() => setResetBrandState(false), 0);
      }
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access the brand monitor</p>
        </div>
      </div>
    );
  }

  // cross-tab state for orchestration
  const [prefillAeo, setPrefillAeo] = useState<{ url: string; customerName: string } | null>(null);
  const [prefillBrand, setPrefillBrand] = useState<{ url: string; customerName: string } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<{ url: string; customerName: string } | null>(null);

  const handleOpenAeoForUrl = (url: string, customerName?: string) => {
    setPrefillAeo({ url, customerName: (customerName && customerName.trim()) ? customerName : "autouser" });
    setActiveTab("aeo");
  };
  const handleOpenFilesForUrl = (url: string, customerName?: string) => {
    setPendingFiles({ url, customerName: (customerName && customerName.trim()) ? customerName : "autouser" });
    setActiveTab("files");
  };

  return (
    <div className="bg-gray-50">
      {/* Keep the hero header at top so it's shared across tabs */}
      <div className="relative overflow-hidden bg-white border-b">
        

        {/* TAB BAR (placed in the lower grey area under header) */}
        <div className="bg-gray-50 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Primary" className="mt-6">
              <div className="inline-flex items-end space-x-1">
                {/* Tab button common style */}
                {/** We'll visually 'lift' the active tab to look like a classic tabbed UI */}
                <TabButton
                  title="Brand Monitor"
                  active={activeTab === "brand"}
                  onClick={() => setActiveTab("brand")}
                />
                <TabButton
                  title="AEO Report"
                  active={activeTab === "aeo"}
                  onClick={() => setActiveTab("aeo")}
                />
                <TabButton
                  title="Files"
                  active={activeTab === "files"}
                  onClick={() => setActiveTab("files")}
                />
                <TabButton
                  title="UGC"
                  active={activeTab === "ugc"}
                  onClick={() => setActiveTab("ugc")}
                />
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Tab content area */}
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "brand" && <BrandMonitorContent session={session} onOpenAeoForUrl={handleOpenAeoForUrl} onOpenFilesForUrl={handleOpenFilesForUrl} prefillBrand={resetBrandState ? null : prefillBrand} />}
        {activeTab === "aeo" && <AeoReportTab prefill={prefillAeo} onOpenBrandForUrl={(url, customerName) => { setPrefillBrand({ url, customerName: (customerName && customerName.trim()) ? customerName : "autouser" }); setActiveTab("brand"); }} onOpenFilesForUrl={handleOpenFilesForUrl} />}
        {activeTab === "files" && (
          <FilesTab prefill={pendingFiles} />
        )}
        {activeTab === "ugc" && (
          <div className="bg-white rounded-lg border p-8 min-h-[50vh]">
            <h2 className="text-2xl font-semibold mb-4">UGC (coming soon)</h2>
            <p className="text-gray-600">This section is under development.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------- TabButton helper component --------------------- */
function TabButton({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-6 px-6 py-3 border rounded-t-lg transition-all ${
        active
          ? "bg-white border-gray-300 text-gray-900 shadow"
          : "bg-transparent border-b border-transparent text-gray-600 hover:text-gray-800"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={`${active ? "font-semibold" : "font-medium"}`}>{title}</span>
    </button>
  );
}