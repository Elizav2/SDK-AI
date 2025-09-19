import { PublicKey } from '@solana/web3.js';
import { Character } from '@elizaos/core';

export interface SDKConfig {
  eliza: {
    modelProvider: 'openai' | 'anthropic' | 'gemini';
    temperature: number;
    maxTokens: number;
    character?: Character;
  };
  
  solana: {
    cluster: 'devnet' | 'mainnet-beta' | 'testnet';
    commitment: 'processed' | 'confirmed' | 'finalized';
    rpcUrl?: string;
    privateKey?: string;
    programId: string;
  };
  
  twitter: {
    replyDelay: number;
    maxRepliesPerHour: number;
    username: string;
    password: string;
    apiKey?: string;
    apiSecret?: string;
  };
  
  memeCoin: {
    minSentimentScore: number;
    maxSupply: number;
    initialLiquidity: number;
  };
}

export interface TwitterMessage {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: Date;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  hashtags: string[];
  mentions: string[];
  isReply: boolean;
  parentTweetId?: string;
}

export interface MemeCoinData {
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  metadata: {
    twitterContext: TwitterMessage;
    sentimentScore: number;
    viralScore: number;
    createdBy: string;
    inspiration: string;
  };
}

export interface SolanaTokenParams {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  totalSupply: number;
  creator: PublicKey;
  initialBuy?: number;
}

export interface ElizaResponse {
  text: string;
  confidence: number;
  context: {
    personality: string;
    mood: string;
    topics: string[];
  };
  actions?: {
    createToken?: boolean;
    replyToTweet?: boolean;
    analyzeMore?: boolean;
  };
}

export interface TrendAnalysis {
  keywords: string[];
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  viralPotential: {
    score: number;
    factors: string[];
  };
  tokenSuggestion?: {
    name: string;
    symbol: string;
    concept: string;
  };
}

export interface TokenCreationResult {
  success: boolean;
  tokenAddress?: string;
  transactionId?: string;
  bondingCurveAddress?: string;
  error?: string;
}

export interface ReplyResult {
  success: boolean;
  replyId?: string;
  content: string;
  error?: string;
}

export interface AIAnalysis {
  shouldReply: boolean;
  shouldCreateToken: boolean;
  replyContent?: string;
  tokenConcept?: MemeCoinData;
  confidence: number;
  reasoning: string;
}