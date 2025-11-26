import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface AIOverviewProps {
  context: string;
  pageType: 'overview' | 'transformers' | 'inspections' | 'transformer-detail' | 'inspection-detail';
  className?: string;
  /** Optional key to force regeneration when changed (e.g., timestamp when tab becomes active) */
  regenerateKey?: string | number;
}

const SYSTEM_PROMPTS: Record<AIOverviewProps['pageType'], string> = {
  overview: `You are Arbit AI, an intelligent assistant for a transformer inspection management system. 
Generate a brief, insightful overview summary (2-3 sentences max) based on the dashboard data provided.
Focus on:
- Overall system health and key metrics
- Any critical issues or trends
- A quick actionable insight

Be concise, professional, and data-driven. Don't use bullet points, write in flowing sentences.
Start directly with the insight, no greetings or introductions.`,

  transformers: `You are Arbit AI, an intelligent assistant for transformer asset management.
Generate a brief summary (2-3 sentences max) about the transformer fleet based on the data provided.
Focus on:
- Fleet health distribution
- Geographic or type patterns
- Any recommendations for attention

Be concise and actionable. Write in flowing sentences, no bullet points.
Start directly with the insight.`,

  inspections: `You are Arbit AI, an intelligent assistant for transformer inspection tracking.
Generate a brief summary (2-3 sentences max) about recent inspections based on the data provided.
Focus on:
- Inspection completion status and trends
- Any urgent findings or patterns
- Recommended follow-up actions

Be concise and actionable. Write in flowing sentences, no bullet points.
Start directly with the insight.`,

  'transformer-detail': `You are Arbit AI, an intelligent assistant for transformer analysis.
Generate a brief analytical summary (2-3 sentences max) about this specific transformer.
Focus on:
- Current health status and risk factors
- Recent inspection trends
- Key recommendation

Be concise and professional. Write in flowing sentences, no bullet points.
Start directly with the analysis.`,

  'inspection-detail': `You are Arbit AI, an intelligent assistant for thermal inspection analysis.
Generate a brief analytical summary (2-3 sentences max) about this inspection's findings.
Focus on:
- Key thermal findings and anomalies detected
- Risk assessment
- Recommended action

Be concise and professional. Write in flowing sentences, no bullet points.
Start directly with the analysis.`,
};

export function AIOverview({ context, pageType, className, regenerateKey }: AIOverviewProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [fullText, setFullText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateOverview = useCallback(async () => {
    setIsLoading(true);
    setIsTyping(false);
    setDisplayedText('');
    setFullText('');
    setError(null);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: SYSTEM_PROMPTS[pageType] },
            { role: 'user', content: `Based on this data, generate a brief overview:\n\n${context}` },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate overview');
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'Unable to generate overview.';
      
      setFullText(text);
      setIsLoading(false);
      setIsTyping(true);
    } catch (err) {
      console.error('AI Overview error:', err);
      setError('Unable to generate AI insights at this time.');
      setIsLoading(false);
    }
  }, [context, pageType]);

  // Initial generation and regeneration when key changes
  useEffect(() => {
    if (context && GROQ_API_KEY) {
      generateOverview();
    } else if (!GROQ_API_KEY) {
      setError('AI features not configured.');
      setIsLoading(false);
    }
  }, [context, generateOverview, regenerateKey]);

  // Typing animation effect
  useEffect(() => {
    if (!isTyping || !fullText) return;

    let currentIndex = 0;
    const typingSpeed = 15; // ms per character

    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  }, [isTyping, fullText]);

  const handleRefresh = () => {
    generateOverview();
  };

  if (!GROQ_API_KEY) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-950/30 via-orange-900/20 to-orange-950/30 dark:from-orange-950/30 dark:via-orange-900/20 dark:to-orange-950/30 p-4 mb-6',
        className
      )}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 animate-pulse" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-orange-500" />
              {(isLoading || isTyping) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-sm font-medium text-orange-500">Arbit AI Insights</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isTyping}
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          >
            <RefreshCw className={cn('h-4 w-4', (isLoading || isTyping) && 'animate-spin')} />
          </Button>
        </div>

        <div className="min-h-[3rem]">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-orange-500/60 rounded-full animate-bounce" />
              </div>
              <span className="text-sm text-muted-foreground">Analyzing data...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">{error}</p>
          ) : (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-orange-500 ml-0.5 animate-pulse" />
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIOverview;
