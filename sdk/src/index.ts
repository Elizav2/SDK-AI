/**
 * TokenLaunch Pro Eliza-Solana SDK
 * 
 * A comprehensive SDK that integrates Eliza AI framework with Solana blockchain
 * to create meme coins from X/Twitter interactions and handle automated replies.
 */

export { ElizaSolanaSDK } from './core/ElizaSolanaSDK';
export { TwitterBot } from './integrations/TwitterBot';
export { SolanaManager } from './integrations/SolanaManager';
export { ElizaAgent } from './integrations/ElizaAgent';
export { MemeCoinCreator } from './features/MemeCoinCreator';
export { MessageReplyHandler } from './features/MessageReplyHandler';
export { SentimentAnalyzer } from './features/SentimentAnalyzer';

// Types
export type {
  SDKConfig,
  TwitterMessage,
  MemeCoinData,
  SolanaTokenParams,
  ElizaResponse,
  TrendAnalysis
} from './types';

// Utilities
export { validateConfig, formatTokenName, sanitizeContent } from './utils/helpers';
export { logger } from './utils/logger';

// Default configuration
export const defaultConfig = {
  eliza: {
    modelProvider: 'openai',
    temperature: 0.7,
    maxTokens: 500
  },
  solana: {
    cluster: 'devnet',
    commitment: 'confirmed'
  },
  twitter: {
    replyDelay: 2000,
    maxRepliesPerHour: 20
  },
  memeCoin: {
    minSentimentScore: 0.6,
    maxSupply: 1000000000,
    initialLiquidity: 1.0 // SOL
  }
};