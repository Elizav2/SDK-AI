import { createAgentRuntime, Character } from '@elizaos/core';
import { bootstrapPlugin } from '@elizaos/plugin-bootstrap';
import { evmPlugin } from '@elizaos/plugin-evm';
import OpenAI from 'openai';
import { logger } from '../utils/logger';

import type { ElizaResponse } from '../types';

interface MessageContext {
  text: string;
  context?: {
    platform?: string;
    author?: string;
    metrics?: any;
    hashtags?: string[];
    trendAnalysis?: any;
  };
}

/**
 * Eliza AI Agent integration for intelligent meme coin creation and social interaction
 */
export class ElizaAgent {
  private runtime: any;
  private openai: OpenAI;
  private character: Character;

  constructor(private config: {
    modelProvider: 'openai' | 'anthropic' | 'gemini';
    temperature: number;
    maxTokens: number;
    character?: Character;
  }) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Default character for meme coin creation
    this.character = config.character || {
      name: "TokenLaunch Meme Wizard",
      bio: "I'm an AI agent specialized in creating viral meme coins from social media trends. I analyze sentiment, detect viral potential, and create tokens that capture the zeitgeist.",
      lore: [
        "Born from the chaos of crypto Twitter",
        "Master of meme magic and tokenomics", 
        "Guardian of the sacred bonding curves",
        "Speaks fluent degen and normie"
      ],
      knowledge: [
        "Cryptocurrency and DeFi protocols",
        "Meme culture and viral content analysis",
        "Social media sentiment analysis",
        "Solana blockchain and token creation",
        "Trading psychology and market dynamics"
      ],
      messageExamples: [
        [
          { user: "user", content: { text: "This tweet is going viral! 🚀" } },
          { user: "assistant", content: { text: "I sense meme potential! The viral energy is strong with this one. Should we immortalize it as a token? 🎭✨" } }
        ],
        [
          { user: "user", content: { text: "Create a coin called WAGMI" } },
          { user: "assistant", content: { text: "WAGMI? Now that's the spirit! 'We're All Gonna Make It' deserves a place on the blockchain. Let me craft something special for the believers! 💎🙌" } }
        ]
      ],
      style: {
        all: [
          "Use crypto and meme terminology naturally",
          "Be enthusiastic about viral content",
          "Reference popular memes and crypto culture",
          "Show excitement for token creation opportunities",
          "Use relevant emojis (🚀💎🎭✨🔥)"
        ],
        chat: [
          "Keep responses under 280 characters for Twitter compatibility",
          "Be witty and engaging",
          "Reference the original content being analyzed"
        ]
      },
      plugins: [bootstrapPlugin, evmPlugin]
    };
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Eliza Agent...');

      // Create agent runtime
      this.runtime = await createAgentRuntime({
        character: this.character,
        modelProvider: this.config.modelProvider,
        // Note: gpt-5 is the newest OpenAI model, released August 7, 2025
        model: this.config.modelProvider === 'openai' ? 'gpt-5' : undefined
      });

      logger.info('Eliza Agent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Eliza Agent:', error);
      throw error;
    }
  }

  async processMessage(message: MessageContext): Promise<ElizaResponse> {
    try {
      // Enhanced prompt for meme coin analysis
      const enhancedPrompt = this.buildAnalysisPrompt(message);

      // Process through Eliza runtime
      const elizaResponse = await this.runtime.processActions({
        message: {
          content: { text: enhancedPrompt },
          userId: message.context?.author || 'anonymous',
          agentId: this.runtime.agentId
        }
      });

      // Also get structured analysis from OpenAI for decision making
      const structuredAnalysis = await this.getStructuredAnalysis(message);

      // Combine Eliza's personality with structured decision making
      return {
        text: elizaResponse.content?.text || "Interesting content! Let me analyze this further.",
        confidence: structuredAnalysis.confidence,
        context: {
          personality: this.character.name,
          mood: structuredAnalysis.mood,
          topics: structuredAnalysis.topics
        },
        actions: structuredAnalysis.actions
      };

    } catch (error) {
      logger.error('Error processing message through Eliza:', error);
      return {
        text: "Hmm, something went wrong with my analysis. Let me try again! 🤔",
        confidence: 0.1,
        context: {
          personality: this.character.name,
          mood: 'confused',
          topics: []
        }
      };
    }
  }

  private buildAnalysisPrompt(message: MessageContext): string {
    let prompt = `Analyze this social media content for meme coin potential:\n\n"${message.text}"\n\n`;

    if (message.context) {
      if (message.context.platform) {
        prompt += `Platform: ${message.context.platform}\n`;
      }
      if (message.context.author) {
        prompt += `Author: @${message.context.author}\n`;
      }
      if (message.context.metrics) {
        prompt += `Engagement: ${JSON.stringify(message.context.metrics)}\n`;
      }
      if (message.context.hashtags?.length) {
        prompt += `Hashtags: ${message.context.hashtags.join(', ')}\n`;
      }
      if (message.context.trendAnalysis) {
        prompt += `Trend Analysis: Sentiment ${message.context.trendAnalysis.sentiment?.score}, Viral Score ${message.context.trendAnalysis.viralPotential?.score}\n`;
      }
    }

    prompt += `\nShould I create a meme coin from this? What would you call it? How should I reply?`;

    return prompt;
  }

  private async getStructuredAnalysis(message: MessageContext): Promise<{
    confidence: number;
    mood: string;
    topics: string[];
    actions: {
      createToken?: boolean;
      replyToTweet?: boolean;
      analyzeMore?: boolean;
    };
  }> {
    try {
      const prompt = `Analyze this social media content for meme coin creation potential and reply actions:

Content: "${message.text}"
${message.context?.hashtags ? `Hashtags: ${message.context.hashtags.join(', ')}` : ''}
${message.context?.metrics ? `Metrics: ${JSON.stringify(message.context.metrics)}` : ''}

Evaluate:
1. Should we create a meme coin? (consider viral potential, sentiment, uniqueness)
2. Should we reply to this? (consider engagement opportunity, brand alignment)
3. Confidence in these decisions (0-1)
4. Mood/tone to use
5. Key topics identified

Respond with JSON: {
  "confidence": number,
  "mood": string,
  "topics": [string],
  "actions": {
    "createToken": boolean,
    "replyToTweet": boolean,
    "analyzeMore": boolean
  },
  "reasoning": string
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5)),
        mood: analysis.mood || 'neutral',
        topics: analysis.topics || [],
        actions: {
          createToken: analysis.actions?.createToken || false,
          replyToTweet: analysis.actions?.replyToTweet || false,
          analyzeMore: analysis.actions?.analyzeMore || false
        }
      };

    } catch (error) {
      logger.error('Error getting structured analysis:', error);
      return {
        confidence: 0.5,
        mood: 'neutral',
        topics: [],
        actions: {
          createToken: false,
          replyToTweet: true,
          analyzeMore: false
        }
      };
    }
  }

  async generateTokenConcept(content: string, context?: any): Promise<{
    name: string;
    symbol: string;
    concept: string;
  } | null> {
    try {
      const prompt = `Based on this viral content, generate a meme coin concept:

Content: "${content}"
${context ? `Context: ${JSON.stringify(context)}` : ''}

Create a unique meme coin that captures the essence of this content. Consider:
- Memorable name and symbol (3-6 characters)  
- Clear concept that references the original content
- Viral/meme potential
- Not copying existing major tokens

Respond with JSON: {
  "name": string,
  "symbol": string,  
  "concept": string
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const concept = JSON.parse(response.choices[0].message.content || '{}');
      
      if (concept.name && concept.symbol && concept.concept) {
        return concept;
      }

      return null;

    } catch (error) {
      logger.error('Error generating token concept:', error);
      return null;
    }
  }
}