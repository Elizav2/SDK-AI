import { PublicKey } from '@solana/web3.js';
import { SolanaManager } from '../integrations/SolanaManager';
import { logger } from '../utils/logger';
import { formatTokenName, sanitizeContent } from '../utils/helpers';

import type { MemeCoinData, SolanaTokenParams, TokenCreationResult } from '../types';

/**
 * Handles meme coin creation with TokenLaunch Pro bonding curve integration
 */
export class MemeCoinCreator {
  constructor(
    private solanaManager: SolanaManager,
    private config: {
      minSentimentScore: number;
      maxSupply: number;
      initialLiquidity: number;
    }
  ) {}

  /**
   * Create a new meme coin from social media data
   */
  async createToken(memeCoinData: MemeCoinData): Promise<TokenCreationResult> {
    try {
      logger.info(`Creating meme coin: ${memeCoinData.symbol} - "${memeCoinData.name}"`);

      // Validate meme coin data
      const validation = this.validateMemeCoinData(memeCoinData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Sanitize and format token data
      const sanitizedData = this.sanitizeTokenData(memeCoinData);

      // Create metadata URI
      const metadataUri = await this.createMetadataUri(sanitizedData);

      // Prepare token parameters
      const tokenParams: SolanaTokenParams = {
        name: sanitizedData.name,
        symbol: sanitizedData.symbol,
        uri: metadataUri,
        decimals: 9,
        totalSupply: this.config.maxSupply,
        creator: new PublicKey('11111111111111111111111111111111'), // Placeholder
        initialBuy: this.config.initialLiquidity
      };

      // Create token with bonding curve
      const result = await this.solanaManager.createTokenWithBondingCurve(tokenParams);

      if (result.success) {
        // Log successful creation
        logger.info(`Meme coin created successfully!`, {
          symbol: memeCoinData.symbol,
          tokenAddress: result.tokenAddress,
          inspiration: memeCoinData.metadata.twitterContext.text,
          sentimentScore: memeCoinData.metadata.sentimentScore
        });

        // Store creation data for analytics
        await this.recordTokenCreation(memeCoinData, result);
      }

      return result;

    } catch (error) {
      logger.error('Error creating meme coin:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate meme coin data before creation
   */
  private validateMemeCoinData(data: MemeCoinData): { isValid: boolean; error?: string } {
    // Check sentiment score threshold
    if (data.metadata.sentimentScore < this.config.minSentimentScore) {
      return {
        isValid: false,
        error: `Sentiment score too low: ${data.metadata.sentimentScore} < ${this.config.minSentimentScore}`
      };
    }

    // Check name length
    if (data.name.length < 3 || data.name.length > 32) {
      return {
        isValid: false,
        error: 'Token name must be between 3 and 32 characters'
      };
    }

    // Check symbol format
    if (!/^[A-Z]{3,6}$/.test(data.symbol)) {
      return {
        isValid: false,
        error: 'Token symbol must be 3-6 uppercase letters'
      };
    }

    // Check for banned content
    const bannedWords = ['scam', 'rug', 'hack', 'steal'];
    const content = (data.name + ' ' + data.description + ' ' + data.metadata.twitterContext.text).toLowerCase();
    
    for (const word of bannedWords) {
      if (content.includes(word)) {
        return {
          isValid: false,
          error: `Contains banned content: ${word}`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Sanitize token data for blockchain compatibility
   */
  private sanitizeTokenData(data: MemeCoinData): MemeCoinData {
    return {
      name: formatTokenName(data.name),
      symbol: data.symbol.toUpperCase().substring(0, 6),
      description: sanitizeContent(data.description),
      imageUrl: data.imageUrl,
      metadata: {
        ...data.metadata,
        twitterContext: {
          ...data.metadata.twitterContext,
          text: sanitizeContent(data.metadata.twitterContext.text)
        }
      }
    };
  }

  /**
   * Create metadata URI for the token
   */
  private async createMetadataUri(data: MemeCoinData): Promise<string> {
    // Create metadata object following Metaplex standard
    const metadata = {
      name: data.name,
      symbol: data.symbol,
      description: data.description,
      image: data.imageUrl || this.generateDefaultImage(data),
      attributes: [
        {
          trait_type: 'Source Platform',
          value: 'Twitter'
        },
        {
          trait_type: 'Sentiment Score',
          value: data.metadata.sentimentScore
        },
        {
          trait_type: 'Viral Score',
          value: data.metadata.viralScore
        },
        {
          trait_type: 'Created By',
          value: data.metadata.createdBy
        },
        {
          trait_type: 'Original Tweet Author',
          value: data.metadata.twitterContext.authorUsername
        }
      ],
      properties: {
        files: [
          {
            uri: data.imageUrl || this.generateDefaultImage(data),
            type: 'image/png'
          }
        ],
        category: 'image',
        creators: [
          {
            address: data.metadata.createdBy,
            share: 100
          }
        ]
      },
      external_url: `https://twitter.com/${data.metadata.twitterContext.authorUsername}/status/${data.metadata.twitterContext.id}`,
      collection: {
        name: 'TokenLaunch Pro Memes',
        family: 'TokenLaunch Pro'
      }
    };

    // Upload metadata to IPFS or Arweave
    // For now, return a placeholder URI
    const metadataJson = JSON.stringify(metadata, null, 2);
    logger.info('Token metadata created', { size: metadataJson.length });

    // TODO: Upload to decentralized storage
    return `https://arweave.net/placeholder-${Date.now()}`;
  }

  /**
   * Generate default image URL if none provided
   */
  private generateDefaultImage(data: MemeCoinData): string {
    // Generate a placeholder image based on token data
    const encodedName = encodeURIComponent(data.name);
    const encodedSymbol = encodeURIComponent(data.symbol);
    
    return `https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=${encodedSymbol}`;
  }

  /**
   * Record token creation for analytics
   */
  private async recordTokenCreation(data: MemeCoinData, result: TokenCreationResult): Promise<void> {
    try {
      const record = {
        tokenAddress: result.tokenAddress,
        symbol: data.symbol,
        name: data.name,
        createdAt: new Date().toISOString(),
        twitterSource: {
          tweetId: data.metadata.twitterContext.id,
          authorUsername: data.metadata.twitterContext.authorUsername,
          originalText: data.metadata.twitterContext.text
        },
        metrics: {
          sentimentScore: data.metadata.sentimentScore,
          viralScore: data.metadata.viralScore,
          twitterMetrics: data.metadata.twitterContext.metrics
        },
        bondingCurve: result.bondingCurveAddress,
        transactionId: result.transactionId
      };

      // TODO: Store in database or analytics service
      logger.info('Token creation recorded', record);

    } catch (error) {
      logger.error('Error recording token creation:', error);
    }
  }

  /**
   * Get token creation statistics
   */
  async getCreationStats(): Promise<{
    totalTokensCreated: number;
    successRate: number;
    avgSentimentScore: number;
    topPerformers: any[];
  }> {
    // TODO: Implement analytics queries
    return {
      totalTokensCreated: 0,
      successRate: 0,
      avgSentimentScore: 0,
      topPerformers: []
    };
  }

  /**
   * Check if token symbol is available
   */
  async isTokenSymbolAvailable(symbol: string): Promise<boolean> {
    try {
      // TODO: Check against existing tokens
      // For now, just validate format
      return /^[A-Z]{3,6}$/.test(symbol);
    } catch (error) {
      logger.error('Error checking token symbol availability:', error);
      return false;
    }
  }

  /**
   * Suggest alternative token symbols
   */
  async suggestTokenSymbols(baseName: string, count: number = 3): Promise<string[]> {
    const suggestions: string[] = [];
    const base = baseName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);

    // Generate variations
    for (let i = 1; suggestions.length < count && i <= 99; i++) {
      const variant = base + i.toString().padStart(2, '0');
      if (variant.length <= 6 && await this.isTokenSymbolAvailable(variant)) {
        suggestions.push(variant);
      }
    }

    return suggestions;
  }
}