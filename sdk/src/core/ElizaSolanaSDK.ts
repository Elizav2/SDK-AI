import { ElizaAgent } from '../integrations/ElizaAgent';
import { SolanaManager } from '../integrations/SolanaManager';
import { TwitterBot } from '../integrations/TwitterBot';
import { MemeCoinCreator } from '../features/MemeCoinCreator';
import { MessageReplyHandler } from '../features/MessageReplyHandler';
import { SentimentAnalyzer } from '../features/SentimentAnalyzer';
import { logger } from '../utils/logger';
import { validateConfig } from '../utils/helpers';

import type {
  SDKConfig,
  TwitterMessage,
  ElizaResponse,
  TokenCreationResult,
  ReplyResult,
  AIAnalysis
} from '../types';

/**
 * Main SDK class that orchestrates Eliza AI, Solana blockchain, and Twitter integration
 * for automated meme coin creation and social media interaction.
 */
export class ElizaSolanaSDK {
  private elizaAgent: ElizaAgent;
  private solanaManager: SolanaManager;
  private twitterBot: TwitterBot;
  private memeCoinCreator: MemeCoinCreator;
  private replyHandler: MessageReplyHandler;
  private sentimentAnalyzer: SentimentAnalyzer;

  private isRunning: boolean = false;
  private processedTweets: Set<string> = new Set();

  constructor(private config: SDKConfig) {
    // Validate configuration
    validateConfig(config);

    // Initialize components
    this.elizaAgent = new ElizaAgent(config.eliza);
    this.solanaManager = new SolanaManager(config.solana);
    this.twitterBot = new TwitterBot(config.twitter);
    this.memeCoinCreator = new MemeCoinCreator(this.solanaManager, config.memeCoin);
    this.replyHandler = new MessageReplyHandler(this.twitterBot, config.twitter);
    this.sentimentAnalyzer = new SentimentAnalyzer();

    logger.info('ElizaSolanaSDK initialized successfully');
  }

  /**
   * Start the SDK - begins monitoring Twitter and processing messages
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting ElizaSolanaSDK...');

      // Initialize all components
      await this.elizaAgent.initialize();
      await this.solanaManager.initialize();
      await this.twitterBot.initialize();

      // Start monitoring Twitter
      this.isRunning = true;
      this.startTwitterMonitoring();

      logger.info('ElizaSolanaSDK started successfully');
    } catch (error) {
      logger.error('Failed to start ElizaSolanaSDK:', error);
      throw error;
    }
  }

  /**
   * Stop the SDK
   */
  async stop(): Promise<void> {
    logger.info('Stopping ElizaSolanaSDK...');
    
    this.isRunning = false;
    await this.twitterBot.stop();
    
    logger.info('ElizaSolanaSDK stopped');
  }

  /**
   * Process a single Twitter message through the AI pipeline
   */
  async processTwitterMessage(message: TwitterMessage): Promise<AIAnalysis> {
    if (this.processedTweets.has(message.id)) {
      logger.debug(`Tweet ${message.id} already processed, skipping`);
      return {
        shouldReply: false,
        shouldCreateToken: false,
        confidence: 0,
        reasoning: 'Already processed'
      };
    }

    try {
      logger.info(`Processing tweet: ${message.id} from @${message.authorUsername}`);

      // Analyze sentiment and viral potential
      const trendAnalysis = await this.sentimentAnalyzer.analyzeTrend(message);
      
      // Get AI analysis from Eliza
      const elizaResponse = await this.elizaAgent.processMessage({
        text: message.text,
        context: {
          platform: 'twitter',
          author: message.authorUsername,
          metrics: message.metrics,
          hashtags: message.hashtags,
          trendAnalysis
        }
      });

      // Determine actions based on AI analysis
      const analysis: AIAnalysis = {
        shouldReply: elizaResponse.actions?.replyToTweet || false,
        shouldCreateToken: elizaResponse.actions?.createToken || false,
        replyContent: elizaResponse.text,
        confidence: elizaResponse.confidence,
        reasoning: `AI confidence: ${elizaResponse.confidence}, Sentiment: ${trendAnalysis.sentiment.score}`
      };

      // Add token concept if creation is suggested
      if (analysis.shouldCreateToken && trendAnalysis.tokenSuggestion) {
        analysis.tokenConcept = {
          name: trendAnalysis.tokenSuggestion.name,
          symbol: trendAnalysis.tokenSuggestion.symbol,
          description: trendAnalysis.tokenSuggestion.concept,
          metadata: {
            twitterContext: message,
            sentimentScore: trendAnalysis.sentiment.score,
            viralScore: trendAnalysis.viralPotential.score,
            createdBy: this.config.twitter.username,
            inspiration: message.text
          }
        };
      }

      this.processedTweets.add(message.id);
      logger.info(`Tweet analysis complete: Reply=${analysis.shouldReply}, Token=${analysis.shouldCreateToken}`);

      return analysis;

    } catch (error) {
      logger.error(`Error processing tweet ${message.id}:`, error);
      return {
        shouldReply: false,
        shouldCreateToken: false,
        confidence: 0,
        reasoning: `Error: ${error.message}`
      };
    }
  }

  /**
   * Create a meme coin based on analysis
   */
  async createMemeCoin(analysis: AIAnalysis): Promise<TokenCreationResult> {
    if (!analysis.tokenConcept) {
      throw new Error('No token concept provided');
    }

    logger.info(`Creating meme coin: ${analysis.tokenConcept.symbol}`);

    try {
      const result = await this.memeCoinCreator.createToken(analysis.tokenConcept);
      
      if (result.success) {
        logger.info(`Meme coin created successfully: ${result.tokenAddress}`);
        
        // Optionally tweet about the new token
        await this.replyHandler.announceTokenCreation(analysis.tokenConcept, result);
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
   * Reply to a Twitter message
   */
  async replyToTweet(message: TwitterMessage, replyContent: string): Promise<ReplyResult> {
    logger.info(`Replying to tweet ${message.id} by @${message.authorUsername}`);

    try {
      const result = await this.replyHandler.replyToTweet(message, replyContent);
      
      if (result.success) {
        logger.info(`Successfully replied to tweet: ${result.replyId}`);
      }

      return result;
    } catch (error) {
      logger.error('Error replying to tweet:', error);
      return {
        success: false,
        content: replyContent,
        error: error.message
      };
    }
  }

  /**
   * Get AI response for any text input
   */
  async getAIResponse(text: string, context?: any): Promise<ElizaResponse> {
    return await this.elizaAgent.processMessage({ text, context });
  }

  /**
   * Start monitoring Twitter for new messages
   */
  private async startTwitterMonitoring(): Promise<void> {
    logger.info('Starting Twitter monitoring...');

    // Monitor mentions and hashtags
    this.twitterBot.onMention(async (message) => {
      if (!this.isRunning) return;

      const analysis = await this.processTwitterMessage(message);
      
      // Execute actions based on analysis
      if (analysis.shouldReply && analysis.replyContent) {
        await this.replyToTweet(message, analysis.replyContent);
      }

      if (analysis.shouldCreateToken && analysis.tokenConcept) {
        await this.createMemeCoin(analysis);
      }
    });

    // Monitor trending hashtags
    this.twitterBot.onTrendingTopic(async (message) => {
      if (!this.isRunning) return;

      const analysis = await this.processTwitterMessage(message);
      
      // Only create tokens for highly viral content
      if (analysis.shouldCreateToken && analysis.confidence > 0.8) {
        await this.createMemeCoin(analysis);
      }
    });

    await this.twitterBot.startMonitoring();
  }

  /**
   * Get SDK statistics
   */
  getStats() {
    return {
      processedTweets: this.processedTweets.size,
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() : 0
    };
  }
}