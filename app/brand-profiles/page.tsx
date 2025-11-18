'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Search, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BrandProfile {
  id: string;
  name: string;
  url: string;
  industry: string;
  location: string;
  email?: string;
}

// Fallback dummy brands data (in case DB is not set up)
const DUMMY_BRANDS: BrandProfile[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Welzin',
    url: 'https://welzin.com',
    industry: 'AI/ML Consultancy',
    location: 'San Francisco, CA',
    email: 'info@welzin.com',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'TechVision',
    url: 'https://techvision.io',
    industry: 'Software Development',
    location: 'New York, NY',
    email: 'contact@techvision.io',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'DataFlow Analytics',
    url: 'https://dataflow-analytics.com',
    industry: 'Data Analytics',
    location: 'Austin, TX',
    email: 'hello@dataflow-analytics.com',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'CloudNine Systems',
    url: 'https://cloudnine-systems.com',
    industry: 'Cloud Infrastructure',
    location: 'Seattle, WA',
    email: 'support@cloudnine-systems.com',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'NeuralPath AI',
    url: 'https://neuralpath.ai',
    industry: 'Artificial Intelligence',
    location: 'Boston, MA',
    email: 'team@neuralpath.ai',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'DigitalForge',
    url: 'https://digitalforge.co',
    industry: 'Digital Marketing',
    location: 'Los Angeles, CA',
    email: 'hello@digitalforge.co',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'QuantumLeap',
    url: 'https://quantumleap.dev',
    industry: 'Quantum Computing',
    location: 'Cambridge, MA',
    email: 'info@quantumleap.dev',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'VelocityStudio',
    url: 'https://velocitystudio.com',
    industry: 'Design & Creative',
    location: 'Miami, FL',
    email: 'contact@velocitystudio.com',
  },
];

export default function BrandProfilesPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandProfile[]>(DUMMY_BRANDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBrands, setFilteredBrands] = useState<BrandProfile[]>(DUMMY_BRANDS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    industry: '',
    location: '',
    email: '',
    competitors: '',
  });

  // Fetch brands from database on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/brands');

      if (response.status === 401) {
        // User not authenticated, use dummy data
        setBrands(DUMMY_BRANDS);
      } else if (!response.ok) {
        throw new Error('Failed to fetch brands');
      } else {
        const data = await response.json();
        setBrands(data.brands || DUMMY_BRANDS);
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      // Fallback to dummy data if API fails
      setBrands(DUMMY_BRANDS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filter brands based on search query
    if (searchQuery.trim() === '') {
      setFilteredBrands(brands);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredBrands(
        brands.filter(
          (brand) =>
            brand.name.toLowerCase().includes(query) ||
            brand.industry.toLowerCase().includes(query) ||
            brand.url.toLowerCase().includes(query) ||
            brand.location.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, brands]);

  const handleDelete = async (brandId: string, brandName: string) => {
    if (!confirm(`Are you sure you want to delete "${brandName}"?`)) return;

    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete brand');
      }

      // Remove from local state
      setBrands(brands.filter((b) => b.id !== brandId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete brand');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.url || !formData.industry || !formData.location) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          industry: formData.industry,
          location: formData.location,
          email: formData.email || null,
        }),
      });

      if (response.status === 401) {
        // Not authenticated, create locally
        const newBrand: BrandProfile = {
          id: `brand-${Date.now()}`,
          name: formData.name,
          url: formData.url,
          industry: formData.industry,
          location: formData.location,
          email: formData.email || undefined,
        };
        setBrands([...brands, newBrand]);
      } else if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to create brand`);
        } catch (parseErr) {
          throw new Error(`HTTP ${response.status}: Failed to create brand. Please check your database connection.`);
        }
      } else {
        const data = await response.json();
        // Add to brands list
        setBrands([...brands, data.brand]);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        url: '',
        industry: '',
        location: '',
        email: '',
        competitors: '',
      });
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDomainColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading brand profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Brand Profiles</h1>
            <p className="text-slate-600 mt-2">Manage and view all your brand profiles</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Brand
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Search Bar - Only show if there are brands */}
        {brands.length > 0 && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search brands by name, industry, location, or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        )}
      </div>

      {/* Brands Grid */}
      <div className="max-w-7xl mx-auto">
        {brands.length === 0 ? (
          // Empty State - Show Create Form
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-slate-200">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Create Your First Brand
                </h3>
                <p className="text-slate-600">
                  Get started by creating your first brand profile to unlock all features
                </p>
              </div>

              <form onSubmit={handleAddBrand} className="space-y-5">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g., Welzin"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* URL Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Website URL *
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleFormChange}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Industry Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Industry *
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleFormChange}
                    placeholder="e.g., AI/ML Consultancy"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Location Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g., San Francisco, CA"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="info@example.com"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 font-semibold rounded-lg transition ${
                    isSubmitting
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSubmitting ? 'Creating...' : 'Create Brand Profile'}
                </button>
              </form>

              <p className="text-xs text-slate-500 text-center mt-6">
                You can add more brands and manage them later using the "New Brand" button
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-slate-200 overflow-hidden hover:border-blue-300 group"
              >
                {/* Card Header with Logo */}
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-16 h-16 ${getDomainColor(brand.name)} rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-md`}>
                      {getInitials(brand.name)}
                    </div>
                    <button
                      onClick={() => handleDelete(brand.id, brand.name)}
                      aria-label="Delete brand"
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 pt-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{brand.name}</h2>
                  <p className="text-sm text-slate-600 mb-4">{brand.industry}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {brand.location}
                    </span>
                    {brand.email && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {brand.email}
                      </span>
                    )}
                  </div>

                  {/* URL Preview */}
                  <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Website</p>
                    <a
                      href={brand.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1 group/link"
                    >
                      {brand.url}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100" />
                    </a>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      href={`/brand-profiles/${brand.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all text-center"
                    >
                      View Profile
                    </Link>
                    <button
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg text-sm font-semibold transition-all"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Counter */}
        {filteredBrands.length > 0 && (
          <div className="mt-8 text-center text-slate-600">
            Showing {filteredBrands.length} of {brands.length} brand
            {brands.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Add Brand Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-slate-900">Create New Brand Profile</h2>

            <form onSubmit={handleAddBrand} className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Welzin, TechVision"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              {/* URL Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleFormChange}
                  placeholder="e.g., https://example.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              {/* Industry Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Industry *
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleFormChange}
                  placeholder="e.g., AI/ML Consultancy, Software Development"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              {/* Location Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  placeholder="e.g., San Francisco, CA"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="e.g., info@example.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Competitors Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Competitors (Optional)
                </label>
                <textarea
                  name="competitors"
                  value={formData.competitors}
                  onChange={handleFormChange}
                  placeholder="Enter competitor names separated by commas&#10;e.g., Company A, Company B, Company C"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">Separate multiple competitors with commas</p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError(null);
                    setFormData({
                      name: '',
                      url: '',
                      industry: '',
                      location: '',
                      email: '',
                      competitors: '',
                    });
                  }}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 font-semibold rounded-lg transition ${
                    isSubmitting
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSubmitting ? 'Creating...' : 'Create Brand Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
