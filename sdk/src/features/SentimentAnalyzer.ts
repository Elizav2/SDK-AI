import OpenAI from 'openai';
import { logger } from '../utils/logger';

import type { TwitterMessage, TrendAnalysis } from '../types';

/**
 * Analyzes sentiment and viral potential of social media content
 */
export class SentimentAnalyzer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Analyze trend potential of a Twitter message
   */
  async analyzeTrend(message: TwitterMessage): Promise<TrendAnalysis> {
    try {
      logger.info(`Analyzing trend potential for tweet: ${message.id}`);

      // Perform sentiment analysis
      const sentimentResult = await this.analyzeSentiment(message.text);
      
      // Analyze viral potential
      const viralResult = await this.analyzeViralPotential(message);
      
      // Extract keywords and themes
      const keywords = await this.extractKeywords(message.text);
      
      // Generate token suggestion if sentiment is positive enough
      let tokenSuggestion;
      if (sentimentResult.score > 0.6 && viralResult.score > 0.5) {
        tokenSuggestion = await this.generateTokenSuggestion(message);
      }

      const analysis: TrendAnalysis = {
        keywords,
        sentiment: sentimentResult,
        viralPotential: viralResult,
        tokenSuggestion
      };

      logger.info('Trend analysis complete', {
        sentiment: sentimentResult.score,
        viral: viralResult.score,
        hasTokenSuggestion: !!tokenSuggestion
      });

      return analysis;

    } catch (error) {
      logger.error('Error analyzing trend:', error);
      
      // Return neutral analysis on error
      return {
        keywords: [],
        sentiment: { score: 0.5, label: 'neutral', confidence: 0.1 },
        viralPotential: { score: 0.3, factors: [] }
      };
    }
  }

  /**
   * Analyze sentiment of text content
   */
  async analyzeSentiment(text: string): Promise<{
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    try {
      const prompt = `Analyze the sentiment of this text and rate its positivity for meme coin potential:

"${text}"

Consider:
- Overall emotional tone (positive, negative, neutral)
- Excitement and energy level
- Meme/viral potential
- Community engagement potential

Respond with JSON: {
  "score": number (0-1, where 1 is most positive),
  "label": "positive" | "negative" | "neutral", 
  "confidence": number (0-1),
  "reasoning": string
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        score: Math.max(0, Math.min(1, result.score || 0.5)),
        label: result.label || 'neutral',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
      };

    } catch (error) {
      logger.error('Error analyzing sentiment:', error);
      return { score: 0.5, label: 'neutral', confidence: 0.1 };
    }
  }

  /**
   * Analyze viral potential based on content and metrics
   */
  async analyzeViralPotential(message: TwitterMessage): Promise<{
    score: number;
    factors: string[];
  }> {
    try {
      // Calculate engagement rate
      const totalEngagement = message.metrics.likes + message.metrics.retweets + message.metrics.replies;
      const engagementRate = message.metrics.views ? totalEngagement / message.metrics.views : 0;

      // Analyze content characteristics
      const contentAnalysis = await this.analyzeContentCharacteristics(message);

      // Combine factors for viral score
      const factors: string[] = [];
      let score = 0;

      // Engagement metrics (30% weight)
      if (message.metrics.likes > 100) {
        factors.push('High like count');
        score += 0.3;
      } else if (message.metrics.likes > 10) {
        factors.push('Moderate engagement');
        score += 0.1;
      }

      if (message.metrics.retweets > 20) {
        factors.push('Strong retweet activity');
        score += 0.2;
      }

      if (engagementRate > 0.05) {
        factors.push('High engagement rate');
        score += 0.15;
      }

      // Content factors (40% weight)
      if (contentAnalysis.hasEmojis) {
        factors.push('Contains emojis');
        score += 0.1;
      }

      if (contentAnalysis.hasHashtags) {
        factors.push('Uses trending hashtags');
        score += 0.15;
      }

      if (contentAnalysis.hasMemeKeywords) {
        factors.push('Contains meme language');
        score += 0.15;
      }

      // Timing factors (30% weight)
      const hoursSincePost = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSincePost < 2 && totalEngagement > 50) {
        factors.push('Rapid early engagement');
        score += 0.2;
      }

      if (this.isInTrendingTime()) {
        factors.push('Posted during peak hours');
        score += 0.1;
      }

      // Normalize score to 0-1 range
      score = Math.min(1, Math.max(0, score));

      return { score, factors };

    } catch (error) {
      logger.error('Error analyzing viral potential:', error);
      return { score: 0.3, factors: ['Analysis error'] };
    }
  }

  /**
   * Extract keywords from text content
   */
  async extractKeywords(text: string): Promise<string[]> {
    try {
      const prompt = `Extract the most important keywords and themes from this social media content for meme coin creation:

"${text}"

Focus on:
- Trending topics
- Meme references  
- Crypto/financial terms
- Emotional words
- Action words
- Cultural references

Respond with JSON: {
  "keywords": [string]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.keywords || [];

    } catch (error) {
      logger.error('Error extracting keywords:', error);
      return [];
    }
  }

  /**
   * Generate token suggestion based on content analysis
   */
  async generateTokenSuggestion(message: TwitterMessage): Promise<{
    name: string;
    symbol: string;
    concept: string;
  } | null> {
    try {
      const prompt = `Based on this viral social media content, suggest a creative meme coin:

Original Tweet: "${message.text}"
Author: @${message.authorUsername}
Engagement: ${message.metrics.likes} likes, ${message.metrics.retweets} retweets

Create a meme coin concept that:
- Captures the essence of the original content
- Has viral/meme potential
- Uses creative but appropriate naming
- Avoids copyright infringement
- Is family-friendly

Respond with JSON: {
  "name": string (full token name, 3-32 characters),
  "symbol": string (3-6 letters, uppercase),
  "concept": string (brief description of the token concept)
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      if (result.name && result.symbol && result.concept) {
        return {
          name: result.name,
          symbol: result.symbol.toUpperCase(),
          concept: result.concept
        };
      }

      return null;

    } catch (error) {
      logger.error('Error generating token suggestion:', error);
      return null;
    }
  }

  /**
   * Analyze content characteristics for viral potential
   */
  private async analyzeContentCharacteristics(message: TwitterMessage): Promise<{
    hasEmojis: boolean;
    hasHashtags: boolean;
    hasMemeKeywords: boolean;
    hasCallToAction: boolean;
    isQuestion: boolean;
  }> {
    const text = message.text.toLowerCase();
    
    // Check for emojis (basic check)
    const emojiRegex = /[\\u{1F600}-\u{1F64F}]|[\u{1F300}-\\u{1F5FF}]|[\\u{1F680}-\\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\\u{27BF}]/u;
    const hasEmojis = emojiRegex.test(message.text);

    // Check for hashtags
    const hasHashtags = message.hashtags.length > 0;

    // Check for meme keywords
    const memeKeywords = [
      'lol', 'lmao', 'based', 'chad', 'gigachad', 'sigma', 'wagmi', 'ngmi',
      'diamond hands', 'paper hands', 'moon', 'lambo', 'hodl', 'ape',
      'degen', 'gm', 'gn', 'fren', 'pepe', 'wojak', 'cope', 'seethe'
    ];
    const hasMemeKeywords = memeKeywords.some(keyword => text.includes(keyword));

    // Check for call to action
    const ctaKeywords = ['retweet', 'share', 'follow', 'like', 'comment', 'join'];
    const hasCallToAction = ctaKeywords.some(keyword => text.includes(keyword));

    // Check if it's a question
    const isQuestion = message.text.includes('?');

    return {
      hasEmojis,
      hasHashtags,
      hasMemeKeywords,
      hasCallToAction,
      isQuestion
    };
  }

  /**
   * Check if current time is during trending hours
   */
  private isInTrendingTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    // Peak social media hours: 6-9 AM, 12-2 PM, 7-10 PM (EST)
    const peakHours = [6, 7, 8, 9, 12, 13, 19, 20, 21, 22];
    
    return peakHours.includes(hour);
  }

  /**
   * Batch analyze multiple messages
   */
  async batchAnalyze(messages: TwitterMessage[]): Promise<TrendAnalysis[]> {
    const analyses: TrendAnalysis[] = [];
    
    for (const message of messages.slice(0, 10)) { // Limit to 10 for API costs
      try {
        const analysis = await this.analyzeTrend(message);
        analyses.push(analysis);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error analyzing message ${message.id}:`, error);
      }
    }
    
    return analyses;
  }

  /**
   * Get trending score for a set of messages
   */
  calculateTrendingScore(analyses: TrendAnalysis[]): {
    avgSentiment: number;
    avgViral: number;
    totalTokenSuggestions: number;
    topKeywords: string[];
  } {
    if (analyses.length === 0) {
      return {
        avgSentiment: 0,
        avgViral: 0,
        totalTokenSuggestions: 0,
        topKeywords: []
      };
    }

    const avgSentiment = analyses.reduce((sum, a) => sum + a.sentiment.score, 0) / analyses.length;
    const avgViral = analyses.reduce((sum, a) => sum + a.viralPotential.score, 0) / analyses.length;
    const totalTokenSuggestions = analyses.filter(a => a.tokenSuggestion).length;

    // Get top keywords
    const keywordCounts = new Map<string, number>();
    analyses.forEach(analysis => {
      analysis.keywords.forEach(keyword => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });
    });

    const topKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword);

    return {
      avgSentiment,
      avgViral,
      totalTokenSuggestions,
      topKeywords
    };
  }
}