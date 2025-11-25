'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProfessionalLoaderProps {
  title?: string;
  message?: string;
  stage?: 'scraping' | 'analyzing' | 'generating' | 'preparing';
}

export function ProfessionalLoader({
  title = 'Processing',
  message = 'Please wait while we process your request...',
  stage = 'scraping'
}: ProfessionalLoaderProps) {
  const stageMessages = {
    scraping: {
      title: 'Scraping Website',
      message: 'Collecting and analyzing your website data...',
      steps: ['Fetching content', 'Extracting information', 'Identifying competitors']
    },
    analyzing: {
      title: 'Analyzing Data',
      message: 'Processing your brand and competitor information...',
      steps: ['Analyzing brand', 'Comparing competitors', 'Generating insights']
    },
    generating: {
      title: 'Generating Prompts',
      message: 'Creating AI-powered analysis prompts...',
      steps: ['Preparing data', 'Generating prompts', 'Optimizing questions']
    },
    preparing: {
      title: 'Preparing Analysis',
      message: 'Getting everything ready for analysis...',
      steps: ['Loading data', 'Initializing providers', 'Preparing environment']
    }
  };

  const config = stageMessages[stage];

  return (
    <div className="flex-1 flex items-center justify-center min-h-0 h-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="w-full max-w-lg px-8">
        <div className="space-y-8">
          {/* Main Loader */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              {/* Outer rotating circle */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>

              {/* Inner pulsing circle */}
              <div className="absolute inset-2 rounded-full border-4 border-blue-100 opacity-50"></div>

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
            <p className="text-gray-600 text-base leading-relaxed">
              {config.message}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3 bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
            {config.steps.map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {index === 0 ? (
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    </div>
                  )}
                </div>
                <span className={index === 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom tip */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              This usually takes a few moments...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
