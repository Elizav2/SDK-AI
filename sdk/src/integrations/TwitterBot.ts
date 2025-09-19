import { TwitterApi } from 'twitter-api-v2';
import { logger } from '../utils/logger';

import type { TwitterMessage, ReplyResult } from '../types';

/**
 * Twitter/X integration for monitoring trends and posting replies
 */
export class TwitterBot {
  private client?: TwitterApi;
  private isMonitoring: boolean = false;
  private mentionCallbacks: ((message: TwitterMessage) => void)[] = [];
  private trendCallbacks: ((message: TwitterMessage) => void)[] = [];

  constructor(private config: {
    replyDelay: number;
    maxRepliesPerHour: number;
    username: string;
    password: string;
    apiKey?: string;
    apiSecret?: string;
  }) {}

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Twitter Bot...');

      // Initialize with API keys if available
      if (this.config.apiKey && this.config.apiSecret) {
        this.client = new TwitterApi({
          appKey: this.config.apiKey,
          appSecret: this.config.apiSecret,
          accessToken: process.env.TWITTER_ACCESS_TOKEN,
          accessSecret: process.env.TWITTER_ACCESS_SECRET,
        });
      } else {
        // Alternative initialization with username/password
        // Note: This would require a more complex authentication flow
        logger.warn('No Twitter API keys provided - using alternative auth');
        await this.initializeWithCredentials();
      }

      logger.info('Twitter Bot initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Twitter Bot:', error);
      throw error;
    }
  }

  /**
   * Start monitoring Twitter for mentions and trends
   */
  async startMonitoring(): Promise<void> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    this.isMonitoring = true;
    logger.info('Starting Twitter monitoring...');

    try {
      // Monitor mentions
      await this.monitorMentions();
      
      // Monitor trending topics
      await this.monitorTrendingTopics();

    } catch (error) {
      logger.error('Error starting Twitter monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    this.isMonitoring = false;
    logger.info('Twitter monitoring stopped');
  }

  /**
   * Post a reply to a tweet
   */
  async replyToTweet(originalTweet: TwitterMessage, replyContent: string): Promise<ReplyResult> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      logger.info(`Replying to tweet ${originalTweet.id}: "${replyContent}"`);

      // Add delay to avoid rate limiting
      await this.delay(this.config.replyDelay);

      const reply = await this.client.v2.reply(replyContent, originalTweet.id);

      return {
        success: true,
        replyId: reply.data.id,
        content: replyContent
      };

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
   * Post a new tweet
   */
  async tweet(content: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      logger.info(`Posting tweet: "${content}"`);

      const tweet = await this.client.v2.tweet(content);

      return {
        success: true,
        tweetId: tweet.data.id
      };

    } catch (error) {
      logger.error('Error posting tweet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Register callback for mentions
   */
  onMention(callback: (message: TwitterMessage) => void): void {
    this.mentionCallbacks.push(callback);
  }

  /**
   * Register callback for trending topics
   */
  onTrendingTopic(callback: (message: TwitterMessage) => void): void {
    this.trendCallbacks.push(callback);
  }

  /**
   * Search for tweets with specific criteria
   */
  async searchTweets(query: string, options?: {
    maxResults?: number;
    sinceId?: string;
  }): Promise<TwitterMessage[]> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const tweets = await this.client.v2.search(query, {
        max_results: options?.maxResults || 10,
        since_id: options?.sinceId,
        'tweet.fields': ['created_at', 'author_id', 'public_metrics', 'entities'],
        'user.fields': ['username']
      });

      return tweets.data?.data?.map(tweet => this.convertToTwitterMessage(tweet)) || [];

    } catch (error) {
      logger.error('Error searching tweets:', error);
      return [];
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      // Get trends for worldwide (WOEID: 1)
      const trends = await this.client.v1.trends({ id: 1 });
      
      return trends[0]?.trends?.map(trend => trend.name) || [];

    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return [];
    }
  }

  /**
   * Monitor mentions of the bot
   */
  private async monitorMentions(): Promise<void> {
    if (!this.client) return;

    try {
      // Search for mentions of the bot
      const mentions = await this.searchTweets(`@${this.config.username}`, {
        maxResults: 50
      });

      mentions.forEach(mention => {
        this.mentionCallbacks.forEach(callback => {
          try {
            callback(mention);
          } catch (error) {
            logger.error('Error in mention callback:', error);
          }
        });
      });

      // Continue monitoring if still active
      if (this.isMonitoring) {
        setTimeout(() => this.monitorMentions(), 30000); // Check every 30 seconds
      }

    } catch (error) {
      logger.error('Error monitoring mentions:', error);
    }
  }

  /**
   * Monitor trending topics for meme potential
   */
  private async monitorTrendingTopics(): Promise<void> {
    try {
      const trends = await this.getTrendingTopics();
      
      // Search for tweets in trending topics
      for (const trend of trends.slice(0, 5)) { // Check top 5 trends
        const trendTweets = await this.searchTweets(trend, { maxResults: 10 });
        
        trendTweets.forEach(tweet => {
          this.trendCallbacks.forEach(callback => {
            try {
              callback(tweet);
            } catch (error) {
              logger.error('Error in trend callback:', error);
            }
          });
        });
      }

      // Continue monitoring if still active
      if (this.isMonitoring) {
        setTimeout(() => this.monitorTrendingTopics(), 60000); // Check every minute
      }

    } catch (error) {
      logger.error('Error monitoring trending topics:', error);
    }
  }

  /**
   * Initialize with username/password (alternative auth)
   */
  private async initializeWithCredentials(): Promise<void> {
    // This is a placeholder for alternative authentication methods
    // Real implementation would use puppeteer or similar for web scraping
    logger.info('Alternative Twitter auth not yet implemented');
    throw new Error('Twitter API keys required for full functionality');
  }

  /**
   * Convert Twitter API response to our format
   */
  private convertToTwitterMessage(tweet: any): TwitterMessage {
    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      authorUsername: tweet.username || 'unknown',
      createdAt: new Date(tweet.created_at),
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        views: tweet.public_metrics?.impression_count
      },
      hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag) || [],
      mentions: tweet.entities?.mentions?.map((m: any) => m.username) || [],
      isReply: !!tweet.in_reply_to_user_id,
      parentTweetId: tweet.referenced_tweets?.[0]?.id
    };
  }

  /**
   * Add delay for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get bot statistics
   */
  getStats() {
    return {
      isMonitoring: this.isMonitoring,
      mentionCallbacks: this.mentionCallbacks.length,
      trendCallbacks: this.trendCallbacks.length
    };
  }
}