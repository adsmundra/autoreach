"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { useCustomer, useRefreshCustomer } from "@/hooks/useAutumnCustomer";
import {
  useBrandAnalyses,
  useBrandAnalysis,
  useDeleteBrandAnalysis,
} from "@/hooks/useBrandAnalyses";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FilesTabPrefill } from "@/types/files";

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
function BrandMonitorContent({ session, onOpenAeoForUrl, onOpenFilesForUrl, prefillBrand }: { session: any; onOpenAeoForUrl: (url: string, customerName?: string) => void; onOpenFilesForUrl: (payload: FilesTabPrefill) => void; prefillBrand?: { url: string; customerName: string } | null; }) {
  const router = useRouter();
  const { customer, isLoading, error } = useCustomer();
  const refreshCustomer = useRefreshCustomer();
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

  return (
    <div className="flex h-full relative flex-col">
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
  );
}

/* --------------------- Tabbed Page wrapper --------------------- */

function AeoReportTab({ prefill, onOpenBrandForUrl, onOpenFilesForUrl }: { prefill: { url: string; customerName: string } | null; onOpenBrandForUrl: (url: string, customerName?: string) => void; onOpenFilesForUrl: (payload: FilesTabPrefill) => void; }) {
  const [customerName, setCustomerName] = useState('');
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<{ htmlContent: string; customerName: string; reportType: string; generatedAt: string; read: boolean } | null>(null);
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
      setReportData({ htmlContent: data.html, customerName: data.customerName, reportType: 'combined-ai', generatedAt: data.createdAt, read: data.read });
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
    <div className="flex h-full relative flex-col">
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

function UGCTab({ prefill, prefillBlogId }: { prefill?: { url: string; brandName: string } | null; prefillBlogId?: string | null }) {
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brandId");
  const [companyUrl, setCompanyUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [brandName, setBrandName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blogContent, setBlogContent] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [suggestingTopics, setSuggestingTopics] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  const fetchSuggestions = async (bName: string) => {
    if (!bName) return;
    try {
      const res = await fetch(`/api/topic-suggestion?brand_name=${encodeURIComponent(bName)}`);
      const data = await res.json();
      if (data.topics) setSuggestedTopics(data.topics);
    } catch {}
  };

  useEffect(() => {
    if (brandName) fetchSuggestions(brandName);
  }, [brandName]);

  const handleSuggest = async () => {
    if (!brandName.trim()) {
      setError("Please enter a Brand Name first to generate suggestions.");
      return;
    }
    setSuggestingTopics(true);
    setError(null);
    try {
      const res = await fetch("/api/topic-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_name: brandName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.topics) setSuggestedTopics(data.topics);
    } catch (e: any) {
      setError(e.message || "Failed to suggest topics");
    } finally {
      setSuggestingTopics(false);
    }
  };

  const canSubmit = companyUrl.trim() && topic.trim();

  useEffect(() => {
    if (prefill) {
      if (prefill.url) setCompanyUrl(prefill.url);
      if (prefill.brandName) setBrandName(prefill.brandName);
    }
  }, [prefill]);

  useEffect(() => {
    const loadBlog = async () => {
      if (!prefillBlogId) return;
      try {
        const res = await fetch(`/api/write-blog/view?id=${encodeURIComponent(prefillBlogId)}`);
        const data = await res.json();
        if (res.ok) {
          setCompanyUrl(data.company_url || '');
          setTopic(data.topic || '');
          setBrandName(data.brand_name || '');
          setBlogContent(data.blog || '');
          setSelectedId(Number(prefillBlogId));
          // Sidebar closed by default
        }
      } catch (e) {
        console.error("Failed to load prefilled blog", e);
      }
    };
    loadBlog();
  }, [prefillBlogId]);

  useEffect(() => {
    // Prefill email from session if available (read-only)
    const load = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        const email = data?.session?.user?.email || '';
        if (email) setEmailId(email);
      } catch {}
    };
    load();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError("Please fill at least Company URL and Topic.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        company_url: companyUrl.trim(),
        topic: topic.trim(),
        brand_name: brandName.trim() || undefined,
        email_id: emailId.trim() || undefined,
      } as any;

      const res = await fetch("/api/write-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate blog");
      }
      setBlogContent(data.blog || "");
      setSelectedId(data.id || null);
    } catch (e: any) {
      setError(e.message || "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(blogContent || '');
    } catch {}
  };

  const downloadMarkdown = () => {
    const blob = new Blob([blogContent || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (brandName?.trim() ? brandName.trim() + '-' : '') + 'blog.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full relative flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-lg border p-6 max-w-7xl mx-auto">
          {brandId && (
            <Link
              href={`/brand-profiles/${brandId}`}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Link>
          )}
          <h2 className="text-2xl font-semibold mb-4">UGC Blog Generator</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ugc-company-url">Company URL *</Label>
              <Input id="ugc-company-url" placeholder="https://example.com" value={companyUrl} onChange={e=>setCompanyUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ugc-topic">Topic *</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
                  onClick={handleSuggest}
                  disabled={suggestingTopics}
                >
                  {suggestingTopics ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Suggest Topics
                </Button>
              </div>
              <Input id="ugc-topic" placeholder="Topic for the blog" value={topic} onChange={e=>setTopic(e.target.value)} />
              
              {suggestedTopics.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopics.slice(0, 5).map((t, i) => (
                      <button
                        key={i}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100 hover:bg-blue-100 transition text-left"
                        onClick={() => setTopic(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ugc-brand-name">Brand Name</Label>
              <Input id="ugc-brand-name" placeholder="e.g., Acme Corp" value={brandName} onChange={e=>setBrandName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ugc-email-id">Email</Label>
              <Input id="ugc-email-id" value={emailId} disabled />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button className="btn-firecrawl-default h-9 px-4" onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? "Generating..." : "Generate Blog"}
            </Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>

          {/* Editor */}
          <div className="mt-6">
            <Label htmlFor="ugc-editor">Blog Editor</Label>
            <textarea
              id="ugc-editor"
              className="mt-2 w-full min-h-[320px] p-3 border rounded-md font-mono text-sm"
              placeholder="Generated blog content will appear here..."
              value={blogContent}
              onChange={(e) => setBlogContent(e.target.value)}
            />
            <div className="mt-3 flex gap-3">
              <Button variant="outline" onClick={copyToClipboard}>Copy to clipboard</Button>
              <Button variant="secondary" onClick={downloadMarkdown}>Download .md</Button>
              <Button onClick={async () => {
                if (!selectedId) return;
                const res = await fetch('/api/write-blog/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: selectedId, company_url: companyUrl, brand_name: brandName || null, topic: topic || null, blog: blogContent })
                });
                            const data = await res.json();
                            if (res.ok) {
                              // success
                            } else {
                              console.error('Failed to save', data?.error);
                            }
                          }}>Save Changes</Button>            </div>
            <p className="text-xs text-gray-500 mt-2">You can edit the blog directly in this editor. Copy or save as needed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandMonitorPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandProfileIdFromQuery = searchParams.get("brandId");
  const blogIdFromQuery = searchParams.get("blogId");

  // tabs: 'brand' | 'aeo' | 'files' | 'ugc'
  const [activeTab, setActiveTab] = useState<"brand" | "aeo" | "files" | "ugc">(
    "brand"
  );
  const [prefillAeo, setPrefillAeo] = useState<{ url: string; customerName: string } | null>(null);
  const [prefillBrand, setPrefillBrand] = useState<{ url: string; customerName: string } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<FilesTabPrefill | null>(null);
  const [prefillUgc, setPrefillUgc] = useState<{ url: string; brandName: string } | null>(null);
  const [appliedBrandPrefill, setAppliedBrandPrefill] = useState<string | null>(null);

  // Auto-select tab from hash or params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#','');
      if (hash === 'files') setActiveTab('files');
      if (hash === 'aeo') setActiveTab('aeo');
      if (hash === 'brand') setActiveTab('brand');
      if (hash === 'ugc') setActiveTab('ugc');
      
      if (blogIdFromQuery) setActiveTab('ugc');
    }
  }, [blogIdFromQuery]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session || !brandProfileIdFromQuery) return;
    if (appliedBrandPrefill === brandProfileIdFromQuery) return;

    let isCancelled = false;

    const hydrateFromBrandProfile = async () => {
      try {
        const response = await fetch(`/api/brands/${brandProfileIdFromQuery}`);
        if (!response.ok) {
          console.error(`[BrandMonitor] Failed to fetch brand profile ${brandProfileIdFromQuery}`);
          return;
        }
        const data = await response.json();
        if (isCancelled) return;

        const brandRecord = data?.brand;
        if (!brandRecord?.url) return;

        const scrapedCompetitors = Array.isArray(brandRecord?.scrapedData?.competitors)
          ? brandRecord.scrapedData.competitors
              .map((entry: any) =>
                typeof entry === "string" ? entry : entry?.name,
              )
              .filter((name: string | undefined): name is string => Boolean(name))
          : [];

        setPendingFiles({
          url: brandRecord.url,
          customerName: brandRecord.name,
          industry: brandRecord.industry,
          competitors: scrapedCompetitors,
        });
        setPrefillUgc({
          url: brandRecord.url,
          brandName: brandRecord.name,
        });
        setPrefillBrand({
          url: brandRecord.url,
          customerName: brandRecord.name,
        });
        setAppliedBrandPrefill(brandProfileIdFromQuery);

        // Respect hash or params if present
        if (blogIdFromQuery) {
          setActiveTab("ugc");
        } else if (typeof window !== 'undefined') {
          const h = window.location.hash;
          if (h === '#files') setActiveTab("files");
          else if (h === '#ugc') setActiveTab("ugc");
          else if (h === '#aeo') setActiveTab("aeo");
          else setActiveTab("brand");
        } else {
          setActiveTab("brand");
        }
      } catch (err) {
        console.error("[BrandMonitor] Unable to hydrate Files tab from brand profile", err);
      }
    };

    hydrateFromBrandProfile();

    return () => {
      isCancelled = true;
    };
  }, [appliedBrandPrefill, brandProfileIdFromQuery, session, blogIdFromQuery]);

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

  const handleOpenAeoForUrl = (url: string, customerName?: string) => {
    setPrefillAeo({ url, customerName: (customerName && customerName.trim()) ? customerName : "autouser" });
    setActiveTab("aeo");
  };
  const handleOpenFilesForUrl = (payload: FilesTabPrefill) => {
    if (!payload?.url) return;
    setPendingFiles({
      url: payload.url,
      customerName: payload.customerName && payload.customerName.trim() ? payload.customerName : "autouser",
      industry: payload.industry,
      competitors: payload.competitors,
    });
    setActiveTab("files");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "brand" && <BrandMonitorContent session={session} onOpenAeoForUrl={handleOpenAeoForUrl} onOpenFilesForUrl={handleOpenFilesForUrl} prefillBrand={prefillBrand} />}
        {activeTab === "aeo" && <AeoReportTab prefill={prefillAeo} onOpenBrandForUrl={(url, customerName) => { setPrefillBrand({ url, customerName: (customerName && customerName.trim()) ? customerName : "autouser" }); setActiveTab("brand"); }} onOpenFilesForUrl={handleOpenFilesForUrl} />}
        {activeTab === "files" && (
          <FilesTab prefill={pendingFiles} />
        )}
        {activeTab === "ugc" && (
          <UGCTab prefill={prefillUgc} prefillBlogId={blogIdFromQuery} />
        )}
      </div>
    </div>
  );
}


