"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useRefreshCustomer } from "@/hooks/useAutumnCustomer";
import { CREDITS_PER_FILE_GENERATION } from "@/config/constants";
import { FileText, Code, Settings, HelpCircle, ArrowLeft } from "lucide-react";
import type { FilesTabPrefill } from "@/types/files";

export function FilesTab({ prefill }: { prefill?: FilesTabPrefill | null }) {
  const { data: session } = useSession();
  const refreshCustomer = useRefreshCustomer();
  const userEmail = session?.user?.email || "";
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brandId");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [hasSent, setHasSent] = useState(false);

  const signature = useMemo(() => {
    if (!prefill) return null;
    const competitors = Array.isArray(prefill.competitors) ? prefill.competitors : [];
    return JSON.stringify({
      url: prefill.url?.trim(),
      brand: prefill.customerName?.trim(),
      industry: prefill.industry?.trim(),
      competitors,
    });
  }, [prefill]);

  useEffect(() => {
    const run = async () => {
      if (!prefill || !signature) return;
      if (!prefill.url || !prefill.customerName || !prefill.industry) {
        setError("Brand profile is missing required data.");
        return;
      }
      if (signature === lastSignature) return;

      setSending(true);
      setError(null);
      try {
        const competitors = Array.isArray(prefill.competitors)
          ? prefill.competitors
              .map((c) => (typeof c === "string" ? c.trim() : ""))
              .filter(Boolean)
          : [];

        const res = await fetch("/api/files/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: prefill.url,
            brand: prefill.customerName,
            category: prefill.industry,
            competitors,
            prompts: "",
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const apiMessage =
            data?.error?.message ||
            (typeof data?.error === "string" ? data.error : null) ||
            "Failed to trigger GEO Files webhook.";
          throw new Error(apiMessage);
        }

        setHasSent(true);
        setLastSignature(signature);
        await refreshCustomer();
      } catch (err: any) {
        setError(err?.message || "Unexpected error while sending GEO Files.");
      } finally {
        setSending(false);
      }
    };

    run();
  }, [prefill, signature, lastSignature, refreshCustomer]);

  const headline = (() => {
    if (!prefill) {
      return "Select a brand profile (or click GEO Files inside a profile) to send the files.";
    }
    if (error) {
      return error;
    }
    if (sending) {
      return "Preparing your GEO Files and emailing them shortly…";
    }
    if (hasSent) {
      return `Files have been sent to ${userEmail || "your email"} and will be received in about 30 minutes. ${CREDITS_PER_FILE_GENERATION} credits were deducted automatically.`;
    }
    return "GEO Files will be emailed to you in about 30 minutes once the brand data loads.";
  })();

  return (
    <div className="space-y-6">
      {brandId && (
        <Link
          href={`/brand-profiles/${brandId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
      )}

      <section className="rounded-2xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">GEO Files Delivery</h2>
        <p className="text-base text-slate-600">{headline}</p>
        {prefill && !error && (
          <p className="mt-3 text-sm text-slate-500">
            Brand: <span className="font-semibold text-slate-800">{prefill.customerName || "Unnamed brand"}</span> · Website:{" "}
            <span className="font-semibold text-blue-700 break-all">{prefill.url}</span>
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900 mb-2">What arrives in your inbox</h3>
        <p className="text-sm text-slate-600 mb-6">
          You will receive a zip containing the following files. Upload them to your site to improve how AI and search
          systems understand your brand.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 flex gap-3">
            <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-lg">llm.txt</h4>
              <p className="text-sm text-slate-600">
                AI-optimized context file that trains large language models on your offerings. Place it at the root of your site.
              </p>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex gap-3">
            <Code className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-lg">schema.json</h4>
              <p className="text-sm text-slate-600">
                Complete schema.org markup. Embed it inside your website&apos;s <code>&lt;head&gt;</code> for richer search visibility.
              </p>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex gap-3">
            <Settings className="w-8 h-8 text-slate-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-lg">robots.txt</h4>
              <p className="text-sm text-slate-600">
                Updated crawler instructions so AI search engines can reach your new content. Save it at <code>/robots.txt</code>.
              </p>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex gap-3">
            <HelpCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-lg">faq.txt</h4>
              <p className="text-sm text-slate-600">
                AI-ready FAQ answers that cover your key offerings and objections. Publish them on your FAQ or support page.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
