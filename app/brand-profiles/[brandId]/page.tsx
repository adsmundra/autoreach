'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Edit2, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface BrandData {
  id: string;
  name: string;
  url: string;
  industry: string;
  location: string;
  email?: string;
  description?: string;
  competitors?: string[];
  logo?: string;
  favicon?: string;
  isScraped?: boolean;
  scrapedData?: {
    keywords?: string[];
    [key: string]: any;
  };
}

interface Analysis {
  id: string;
  companyName: string;
  analysisData: any;
  competitors: any;
  creditsUsed: number;
  createdAt: string;
}

interface AEOReport {
  id: string;
  customerName: string;
  url: string;
  createdAt: string;
}

interface SectionData {
  aeoReports: AEOReport[];
  brandMonitorReports: any[];
  geoFileReports: any[];
}

// Dummy data mapping
const DUMMY_BRANDS_MAP: { [key: string]: BrandData } = {
  '550e8400-e29b-41d4-a716-446655440001': {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Welzin',
    url: 'https://welzin.com',
    industry: 'AI/ML Consultancy',
    location: 'San Francisco, CA',
    email: 'info@welzin.com',
    description: 'Welzin is a full-spectrum AI/ML and Generative AI consultancy that empowers forward-thinking businesses with AI-driven transformation. They offer tailored AI solutions, custom AI agents, and proprietary platforms.',
    competitors: ['TechVision', 'DataFlow Analytics', 'NeuralPath AI', 'CloudNine Systems', 'DigitalForge', 'QuantumLeap'],
  },
  '550e8400-e29b-41d4-a716-446655440002': {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'TechVision',
    url: 'https://techvision.io',
    industry: 'Software Development',
    location: 'New York, NY',
    email: 'contact@techvision.io',
    description: 'TechVision specializes in cutting-edge software solutions and enterprise development. They deliver scalable, innovative technology products for businesses of all sizes.',
    competitors: ['Welzin', 'DataFlow Analytics', 'DigitalForge', 'VelocityStudio', 'NeuralPath AI'],
  },
  '550e8400-e29b-41d4-a716-446655440003': {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'DataFlow Analytics',
    url: 'https://dataflow-analytics.com',
    industry: 'Data Analytics',
    location: 'Austin, TX',
    email: 'hello@dataflow-analytics.com',
    description: 'DataFlow Analytics provides comprehensive data analysis and business intelligence solutions. Transform raw data into actionable insights with our advanced analytics platform.',
    competitors: ['Welzin', 'TechVision', 'CloudNine Systems', 'QuantumLeap'],
  },
  '550e8400-e29b-41d4-a716-446655440004': {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'CloudNine Systems',
    url: 'https://cloudnine-systems.com',
    industry: 'Cloud Infrastructure',
    location: 'Seattle, WA',
    email: 'support@cloudnine-systems.com',
    description: 'CloudNine Systems offers enterprise-grade cloud infrastructure and DevOps solutions. Scale your applications with our reliable and secure cloud platform.',
    competitors: ['DataFlow Analytics', 'Welzin', 'QuantumLeap', 'VelocityStudio'],
  },
  '550e8400-e29b-41d4-a716-446655440005': {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'NeuralPath AI',
    url: 'https://neuralpath.ai',
    industry: 'Artificial Intelligence',
    location: 'Boston, MA',
    email: 'team@neuralpath.ai',
    description: 'NeuralPath AI pioneers advanced machine learning and artificial intelligence technologies. We build intelligent systems that drive business transformation.',
    competitors: ['Welzin', 'QuantumLeap', 'DataFlow Analytics', 'TechVision'],
  },
  '550e8400-e29b-41d4-a716-446655440006': {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'DigitalForge',
    url: 'https://digitalforge.co',
    industry: 'Digital Marketing',
    location: 'Los Angeles, CA',
    email: 'hello@digitalforge.co',
    description: 'DigitalForge is a premier digital marketing agency creating compelling campaigns and digital experiences. We help brands achieve their marketing goals.',
    competitors: ['VelocityStudio', 'Welzin', 'TechVision'],
  },
  '550e8400-e29b-41d4-a716-446655440007': {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'QuantumLeap',
    url: 'https://quantumleap.dev',
    industry: 'Quantum Computing',
    location: 'Cambridge, MA',
    email: 'info@quantumleap.dev',
    description: 'QuantumLeap pioneers quantum computing solutions and next-generation computing technology. We develop groundbreaking quantum algorithms and applications.',
    competitors: ['NeuralPath AI', 'DataFlow Analytics', 'CloudNine Systems'],
  },
  '550e8400-e29b-41d4-a716-446655440008': {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'VelocityStudio',
    url: 'https://velocitystudio.com',
    industry: 'Design & Creative',
    location: 'Miami, FL',
    email: 'contact@velocitystudio.com',
    description: 'VelocityStudio is a creative powerhouse specializing in design, branding, and content creation. We transform brands through innovative visual storytelling.',
    competitors: ['DigitalForge', 'TechVision', 'CloudNine Systems'],
  },
};

export default function BrandProfilePage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;

  const [brand, setBrand] = useState<BrandData | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionData, setSectionData] = useState<SectionData>({
    aeoReports: [],
    brandMonitorReports: [],
    geoFileReports: [],
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    url: '',
    industry: '',
    location: '',
    email: '',
    description: '',
  });

  // Initialize edit form when editing starts
  useEffect(() => {
    if (isEditing && brand) {
      setEditFormData({
        name: brand.name,
        url: brand.url,
        industry: brand.industry,
        location: brand.location,
        email: brand.email || '',
        description: brand.description || '',
      });
    }
  }, [isEditing, brand]);

  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/brands/${brandId}`);

        if (response.status === 401) {
          // User not authenticated, use dummy data
          const dummyData = DUMMY_BRANDS_MAP[brandId];
          if (dummyData) {
            setBrand(dummyData);
            // Add some dummy analyses for display
            setAnalyses([
              {
                id: 'analysis-1',
                companyName: 'Latest Brand Monitor Run',
                analysisData: { visibility_score: 8.5 },
                competitors: dummyData.competitors?.slice(0, 3) || [],
                creditsUsed: 10,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ]);
          } else {
            setError('Brand not found');
          }
        } else if (!response.ok) {
          throw new Error('Failed to fetch brand data');
        } else {
          const data = await response.json();
          setBrand(data.brand);
          setAnalyses(data.analyses || []);
        }
      } catch (err) {
        console.error('Error fetching brand:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (brandId) {
      fetchBrandData();
    }
  }, [brandId]);

  // Fetch section-specific data (AEO reports, etc.)
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!brand) return;

      try {
        console.log('[Brand Profile] Fetching AEO reports for:', brand.name);
        // Fetch AEO reports for this brand with cache busting
        const aeoResponse = await fetch(
          `/api/aeo-reports-by-customer?customerName=${encodeURIComponent(brand.name)}&t=${Date.now()}`,
          {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
            },
          }
        );

        console.log('[Brand Profile] AEO response status:', aeoResponse.status);

        if (aeoResponse.ok) {
          const aeoData = await aeoResponse.json();
          console.log('[Brand Profile] Received reports:', aeoData.reports?.length || 0);
          console.log('[Brand Profile] Debug info:', aeoData.debug);
          setSectionData(prev => ({
            ...prev,
            aeoReports: aeoData.reports || [],
          }));
        } else if (aeoResponse.status === 401) {
          console.log('[Brand Profile] Not authenticated for AEO reports');
          const errorData = await aeoResponse.json();
          console.log('[Brand Profile] Auth error:', errorData);
        } else {
          console.error('[Brand Profile] Failed to fetch AEO reports:', aeoResponse.status);
          const errorData = await aeoResponse.json();
          console.log('[Brand Profile] Error response:', errorData);
        }
      } catch (err) {
        console.error('[Brand Profile] Error fetching section data:', err);
      }
    };

    fetchSectionData();
  }, [brand]);

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        throw new Error('Failed to update brand');
      }

      const data = await response.json();
      setBrand(data.brand);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating brand:', err);
      alert('Failed to update brand. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this brand profile?')) return;
    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 401) {
        // Success or user not authenticated, redirect anyway
        router.push('/brand-profiles');
      } else {
        throw new Error('Failed to delete brand');
      }
    } catch (err) {
      console.error('Error deleting brand:', err);
      alert('Failed to delete brand. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#f5f6fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading brand profile...</p>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="w-full min-h-screen bg-[#f5f6fb] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-slate-600 mb-4">{error || 'Brand profile not found'}</p>
          <Link href="/brand-profiles" className="text-blue-600 hover:underline">
            ← Back to profiles
          </Link>
        </div>
      </div>
    );
  }

  const getDomainColor = () => {
    const colors = ['bg-[#007bff]', 'bg-[#9C27B0]', 'bg-[#E91E63]', 'bg-[#4CAF50]', 'bg-[#FF9800]', 'bg-[#F44336]', 'bg-[#3F51B5]', 'bg-[#00BCD4]'];
    return colors[brand.name.charCodeAt(0) % colors.length];
  };

  const getInitials = () => {
    return brand.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sectionLinks = [
    { title: 'Brand Monitor', color: 'bg-blue-500', href: brand ? `/brand-monitor?brandId=${brand.id}` : '/brand-monitor' },
    { title: 'AEO Audit', color: 'bg-purple-500', href: brand ? `/aeo-report?customerName=${encodeURIComponent(brand.name)}&url=${encodeURIComponent(brand.url)}&auto=true` : '/aeo-report' },
    { title: 'GEO Files', color: 'bg-orange-500', href: brand ? `/generate-files?brandId=${brand.id}` : '/generate-files' },
    { title: 'IntelliWrite', color: 'bg-green-500', href: '/blog-writer' },
    { title: 'End 2 End', color: 'bg-indigo-500', href: '/chat' },
  ];

  return (
    <div className="w-full min-h-screen bg-[#f5f6fb] p-6 font-sans text-[#1a1a1a]">
      {/* Header with breadcrumb */}
      <div className="max-w-5xl mx-auto mb-6">
        <Link href="/brand-profiles" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          ← Back to profiles
        </Link>
      </div>

      {/* Profile Card */}
      <section className="bg-white w-full max-w-5xl mx-auto rounded-2xl shadow-md p-6 flex gap-6 relative">
        {/* Logo */}
        <div>
          {brand.logo ? (
            <img
              src={brand.logo}
              alt={brand.name}
              className="w-40 h-40 rounded-xl shadow-md object-contain bg-gray-50 p-2"
            />
          ) : (
            <div className={`${getDomainColor()} w-40 h-40 rounded-xl flex items-center justify-center text-white text-4xl font-bold`}>
              {getInitials()}
            </div>
          )}
        </div>

        {/* Edit button */}
        <button
          onClick={() => setIsEditing(true)}
          aria-label="Edit profile"
          className="absolute top-4 right-4 bg-white shadow-md p-2 rounded-full hover:scale-105 transition"
          type="button"
        >
          <Edit2 className="w-4 h-4 text-slate-700" />
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          aria-label="Delete profile"
          className="absolute top-16 right-4 bg-white shadow-md p-2 rounded-full hover:scale-105 transition"
          type="button"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>

        {/* Description */}
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-2">{brand.name}</h2>

          {brand.description && (
            <p className="text-sm leading-relaxed mb-4 text-[#555] line-clamp-3">
              {brand.description}
            </p>
          )}

          {/* Industry & Location Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Industry Tag */}
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
              {brand.industry}
            </span>

            {/* Location Tag */}
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
              {brand.location}
            </span>

            {/* Scraped Location Tag - Show if different from stored location */}
            {brand.scrapedData?.location && brand.scrapedData.location !== brand.location && (
              <span className="px-3 py-1.5 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-lg border border-cyan-300" title="Location from website">
                📍 {brand.scrapedData.location}
              </span>
            )}
          </div>

          {/* Keywords Section - Show scraped keywords */}
          {brand.scrapedData?.keywords && Array.isArray(brand.scrapedData.keywords) && brand.scrapedData.keywords.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#666] mb-2">Keywords</p>
              <div className="flex flex-wrap gap-2">
                {brand.scrapedData.keywords.slice(0, 8).map((keyword, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-md border border-green-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Competitor Buttons */}
          {brand.competitors && brand.competitors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#666] mb-2">Competitors</p>
              <div className="flex flex-wrap gap-2">
                {brand.competitors.slice(0, 6).map((competitor, i) => (
                  <button
                    key={i}
                    type="button"
                    className="bg-purple-100 text-purple-700 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-purple-200 transition border border-purple-200"
                  >
                    {competitor}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sections */}
      <main className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-12 max-w-6xl mx-auto" role="main">
        {sectionLinks.map((section) => {
          // Get reports for this section
          const reports = section.title === 'AEO Audit' ? sectionData.aeoReports : [];

          return (
            <section key={section.title}>
              {/* Top Button */}
              <Link
                href={section.href}
                type="button"
                className={`${section.color} w-full text-white shadow-md rounded-xl py-5 text-center font-semibold hover:scale-[1.02] transition block`}
              >
                {section.title}
              </Link>

              {/* Scrollable List */}
              <div className="mt-8 h-80 overflow-y-scroll bg-white shadow-md rounded-xl p-3 space-y-4">
                {section.title === 'AEO Audit' && reports.length > 0 ? (
                  // Show actual AEO reports
                  reports.map((report) => (
                    <div key={report.id}>
                      <Link
                        href={`/aeo-report?reportId=${report.id}`}
                        className="block p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-sm text-purple-900 cursor-pointer border border-purple-200"
                        role="link"
                      >
                        <p className="font-medium truncate">{report.customerName}</p>
                        <p className="text-xs text-purple-600 truncate mt-1">{report.url}</p>
                        <p className="text-xs text-purple-500 mt-1">
                          {new Date(report.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </Link>
                    </div>
                  ))
                ) : section.title === 'AEO Audit' ? (
                  // Empty state for AEO reports
                  <div className="p-4 text-center text-slate-500 text-sm">
                    <p>No AEO reports yet</p>
                    <p className="text-xs mt-1">Click the AEO Audit button to generate one</p>
                  </div>
                ) : (
                  // Dummy data for other sections
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <a
                        href="#"
                        className="block p-2 bg-[#e5e5e5] rounded-lg hover:bg-[#ececec] transition text-sm text-[#111] cursor-pointer"
                        role="link"
                      >
                        {section.title} Item {i + 1}
                      </a>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>

      {/* Recent Analyses Section */}
      {analyses.length > 0 && (
        <section className="mt-12 max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-[#1a1a1a]">Analysis History</h2>
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="flex items-center justify-between p-4 bg-[#f5f6fb] rounded-lg border border-[#dfe3f0] hover:shadow-md transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1a1a1a]">{analysis.companyName}</h3>
                  <p className="text-sm text-[#666]">
                    {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-[#666]">Credits Used</p>
                    <p className="text-lg font-bold text-[#1a1a1a]">{analysis.creditsUsed}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#dfe3f0]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit Modal */}
      {isEditing && brand && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold mb-6 text-[#1a1a1a]">Edit Brand Profile</h2>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  name="url"
                  value={editFormData.url}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Industry
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="industry"
                    value={editFormData.industry}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                  {brand.scrapedData?.industry && brand.scrapedData.industry !== editFormData.industry && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      💡 Scraped: {brand.scrapedData.industry}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="location"
                    value={editFormData.location}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                  {brand.scrapedData?.location && brand.scrapedData.location !== editFormData.location && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      💡 Scraped: {brand.scrapedData.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <div className="relative">
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditFormChange}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  />
                  {brand.description && brand.description !== editFormData.description && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      💡 Scraped: {brand.description.substring(0, 80)}...
                    </p>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-2.5 font-semibold rounded-lg transition ${
                    isSubmitting
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
