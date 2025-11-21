import React from 'react';
import { ResultsTab } from '@/lib/brand-monitor-reducer';

interface ResultsNavigationProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  onRestart: () => void;
}

export function ResultsNavigation({
  activeTab,
  onTabChange,
  onRestart
}: ResultsNavigationProps) {
  const handleTabClick = (tab: ResultsTab) => {
    onTabChange(tab);
  };
  
  return (
    <nav className="w-47 flex-shrink-0 animate-fade-in flex flex-col h-[calc(100vh-8rem)] ml-[-2rem] sticky top-8" style={{ animationDelay: '0.3s' }}>
      
      <div className="w-full flex flex-col justify-between flex-1">
        
        {/* Navigation Tabs - at the top */}
        <div className="space-y-2">
        <button
          onClick={() => handleTabClick('matrix')}
          className={`w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200 ${
            activeTab === 'matrix'
              ? 'bg-[#090376] text-white [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#171310,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(58,_33,_8,_58%)]'
              : 'bg-[#155DFC] text-white hover:bg-[#090376] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#090376,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(23,_13,_242,_58%)] hover:translate-y-[1px] hover:scale-[0.98]'
          }`}
        >
          Comparison Matrix
        </button>
        <button
          onClick={() => handleTabClick('prompts')}
          className={`w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200 ${
            activeTab === 'prompts'
              ? 'bg-[#090376] text-white [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#171310,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(58,_33,_8,_58%)]'
              : 'bg-[#155DFC] text-white hover:bg-[#090376] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#090376,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(23,_13,_242,_58%)] hover:translate-y-[1px] hover:scale-[0.98]'
          }`}
        >
          Prompts & Responses
        </button>
        <button
          onClick={() => handleTabClick('rankings')}
          className={`w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200 ${
            activeTab === 'rankings'
              ? 'bg-[#090376] text-white [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#171310,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(58,_33,_8,_58%)]'
              : 'bg-[#155DFC] text-white hover:bg-[#090376] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#090376,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(23,_13,_242,_58%)] hover:translate-y-[1px] hover:scale-[0.98]'
          }`}
        >
          Provider Rankings
        </button>
        <button
          onClick={() => handleTabClick('visibility')}
          className={`w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200 ${
            activeTab === 'visibility'
              ? 'bg-[#090376] text-white [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#171310,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(58,_33,_8,_58%)]'
              : 'bg-[#155DFC] text-white hover:bg-[#090376] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#090376,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(23,_13,_242,_58%)] hover:translate-y-[1px] hover:scale-[0.98]'
          }`}
        >
          Visibility Score
        </button>
         <div className="mt-4 text-gray-700 text-xs space-y-1">
                <p className="text-sm"><strong>Glossary</strong></p>
                <br/>
                <p><strong>Annotation:</strong></p>
                <p><strong>Visibility:</strong> How often your brand appears in search results for the tracked keywords.</p>
                <p><strong>Share of Voice:</strong> Your brand&apos;s percentage of mentions compared to competitors across the analyzed content.</p>
                <p><strong>Sentiment:</strong> The overall emotional tone (positive, negative, neutral) of the content where your brand is mentioned.</p>
                <br />
                <p><strong>Formulas:</strong></p>
                <p><strong>Visibility </strong>= (Number of responses citing your domain) ÷ (Total responses)</p>
                <p><strong>Share of Voice </strong>= (Brand's total mentions / Total mentions across all competitors) × 100</p>
                <p><strong>Sentiment Score </strong>= (Positive sentiment mentions / Total mentions) × 100</p>
                <p><strong>AveragePosition  </strong>= Sum of all positions where brand was mentioned / Number of mentions</p>
        </div>
        </div>
        <br></br>
        


       
      </div>
    </nav>
  );
}