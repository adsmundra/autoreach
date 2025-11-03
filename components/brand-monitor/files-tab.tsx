"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { FileText, Settings, Code, HelpCircle } from "lucide-react";
import { useCustomer, useRefreshCustomer } from "@/hooks/useAutumnCustomer";
import { CREDITS_PER_FILE_GENERATION } from "@/config/constants";

export function FilesTab({ prefill }: { prefill?: { url?: string; customerName?: string } | null }) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";
  const { customer, isLoading: customerLoading } = useCustomer();
  const refreshCustomer = useRefreshCustomer();
  const creditsAvailable = customer?.features?.messages ? (customer.features.messages.balance || 0) : 0;

  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [brand, setBrand] = useState("");
  const [industry, setIndustry] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFilesInfo, setShowFilesInfo] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Initialize from session / prefill
  useEffect(() => {
    setEmail(userEmail || "");
  }, [userEmail]);

  useEffect(() => {
    if (prefill?.url && showForm) {
      setUrl(prefill.url);
    }
    if (prefill?.customerName && showForm) {
      setBrand(prefill.customerName);
    }
  }, [prefill?.url, prefill?.customerName]);

  // Note: Removed auto-fetch on URL change to prevent form from vanishing
  // Files are only fetched after submission or explicit refresh


  function addCompetitor() {
    const trimmed = competitorInput.trim();
    if (!trimmed) return;
    setCompetitors(prev => Array.from(new Set([...prev, trimmed])));
    setCompetitorInput("");
  }
  function removeCompetitor(c: string) { setCompetitors(prev => prev.filter(x => x !== c)); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const finalEmail = userEmail || email; // prefer session email
    if (!finalEmail || !url || !brand.trim() || !industry.trim()) {
      setError('Email, URL, Brand name and Industry are required');
      return;
    }

    const currentCredits = customer?.features?.messages ? (customer.features.messages.balance || 0) : 0;
    if (currentCredits < CREDITS_PER_FILE_GENERATION) {
      setError(`Insufficient credits. You need at least ${CREDITS_PER_FILE_GENERATION} credits to generate files.`);
      return;
    }

    setSending(true);
    try {
      const body = { url, competitors, prompts: prompt, brand: brand.trim(), category: industry.trim() };
      const res = await fetch('/api/files/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('[FilesTab] Failed to parse response', parseError);
      }

      if (!res.ok || !data?.jobId) {
        const apiMessage =
          data?.error?.message ||
          (typeof data?.error === 'string' ? data.error : null);
        throw new Error(apiMessage || 'Failed to create job');
      }

      // Show success message and files info
      const remainingCredits =
        typeof data?.remainingCredits === 'number' ? data.remainingCredits : null;
      const baseSuccess =
        'Files have been sent to your email and will be received in 30 minutes.';
      const creditsNote = remainingCredits !== null
        ? ` ${CREDITS_PER_FILE_GENERATION} credits were deducted. Remaining credits: ${remainingCredits}.`
        : ` ${CREDITS_PER_FILE_GENERATION} credits were deducted.`;
      setSuccessMessage(baseSuccess + creditsNote);
      setShowFilesInfo(true);
      setShowForm(false);

      try {
        await refreshCustomer();
      } catch (refreshError) {
        console.error('[FilesTab] Failed to refresh customer data', refreshError);
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setSending(false);
    }
  }

  function handleGenerateForAnotherSite() {
    // Reset form and show it again
    setUrl('');
    setPrompt('');
    setBrand('');
    setIndustry('');
    setCompetitors([]);
    setCompetitorInput('');
    setSuccessMessage(null);
    setError(null);
    setShowFilesInfo(false);
    setShowForm(true);
  }

  return (
    <div className="bg-white rounded-lg border p-8 min-h-[50vh]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Files</h2>
        <div className="flex gap-2">
          {/* Navigation to other tabs is handled by parent via setActiveTab */}
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg border-2 border-green-400 bg-green-50 text-green-800 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">{successMessage}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 text-red-800 px-4 py-2">
          {error}
        </div>
      )}

      {showFilesInfo && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">What files you'll receive:</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* LLM.txt */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-2">
                <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg">llm.txt</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    AI-optimized content file that helps large language models understand your business better.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>How to use:</strong> Place in your website root directory to improve AI model responses about your brand.
                  </p>
                </div>
              </div>
            </div>

            {/* Schema.org */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-2">
                <Code className="w-8 h-8 text-purple-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg">schema.org</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Structured data markup that helps search engines understand your content and display rich results.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>How to use:</strong> Add this JSON-LD code to your website's &lt;head&gt; section.
                  </p>
                </div>
              </div>
            </div>

            {/* robots.txt */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-2">
                <Settings className="w-8 h-8 text-gray-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg">robots.txt</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Instructions for search engine crawlers on which pages to index or avoid on your website.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>How to use:</strong> Place at your website root (example.com/robots.txt) to control crawler access.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ.txt */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-2">
                <HelpCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg">faq.txt</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Frequently asked questions optimized for AI search engines to provide accurate answers about your brand.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>How to use:</strong> Use content for your FAQ page or knowledge base to improve AI visibility.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AEO Report Info */}
          <div className="border-2 border-blue-200 rounded-lg p-5 bg-blue-50 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 rounded-full p-2 flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-blue-900">AEO Report</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Answer Engine Optimization report analyzing how well your website performs in AI-powered search engines.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  <strong>Includes:</strong> Performance metrics, optimization recommendations, and competitive analysis for AI search visibility.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleGenerateForAnotherSite}
              className="btn-firecrawl-default h-10 px-6"
            >
              Generate Files for Another Site
            </Button>
          </div>
        </div>
      )}

      {showForm && !showFilesInfo && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filesEmail">Email</Label>
              <Input id="filesEmail" type="email" value={userEmail || email} disabled className="bg-gray-100" />
              {!userEmail && (
                <p className="text-xs text-amber-700">No session email detected. Please ensure you are logged in.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="filesUrl">Website URL *</Label>
              <Input id="filesUrl" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filesBrand">Brand name *</Label>
              <Input id="filesBrand" value={brand} onChange={e=>setBrand(e.target.value)} placeholder="e.g., Welzin" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filesIndustry">Industry *</Label>
              <Input id="filesIndustry" value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="e.g., SaaS, Healthcare" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Competitors</Label>
            <div className="flex gap-2">
              <Input value={competitorInput} onChange={e=>setCompetitorInput(e.target.value)} placeholder="https://competitor.com" />
              <Button type="button" variant="secondary" onClick={addCompetitor}>Add</Button>
            </div>
            {!!competitors.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {competitors.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 text-sm bg-gray-100 px-2 py-1 rounded">
                    {c}
                    <button type="button" onClick={()=>removeCompetitor(c)} className="text-gray-500 hover:text-gray-700">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="filesPrompt">Prompts</Label>
            <textarea id="filesPrompt" value={prompt} onChange={e=>setPrompt(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" rows={4} placeholder="Describe what files you want generated..." />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" disabled={sending} className="btn-firecrawl-default h-9 px-4">{sending ? 'Generating…' : 'Generate Files'}</Button>
            <p className="text-sm text-gray-500">
              Requires {CREDITS_PER_FILE_GENERATION} credits. Available:{' '}
              {customerLoading ? '...' : creditsAvailable}
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
