import { TwitterBot } from '../integrations/TwitterBot';
import { logger } from '../utils/logger';

import type { TwitterMessage, ReplyResult, MemeCoinData, TokenCreationResult } from '../types';

/**
 * Handles automated replies to Twitter messages with rate limiting and context awareness
 */
export class MessageReplyHandler {
  private replyHistory: Map<string, number> = new Map();
  private hourlyReplyCount: number = 0;
  private lastHourReset: number = Date.now();

  constructor(
    private twitterBot: TwitterBot,
    private config: {
      replyDelay: number;
      maxRepliesPerHour: number;
    }
  ) {
    // Reset hourly counter every hour
    setInterval(() => this.resetHourlyCounter(), 60 * 60 * 1000);
  }

  /**
   * Reply to a Twitter message with context-aware content
   */
  async replyToTweet(message: TwitterMessage, replyContent: string): Promise<ReplyResult> {
    try {
      // Check rate limits
      if (!this.canReply()) {
        return {
          success: false,
          content: replyContent,
          error: 'Rate limit exceeded'
        };
      }

      // Check if we've replied to this user recently
      if (this.hasRecentReply(message.authorId)) {
        logger.info(`Skipping reply to @${message.authorUsername} - recent interaction`);
        return {
          success: false,
          content: replyContent,
          error: 'Recent reply to this user'
        };
      }

      // Format reply with proper context
      const formattedReply = this.formatReply(message, replyContent);

      // Send reply via Twitter bot
      const result = await this.twitterBot.replyToTweet(message, formattedReply);

      // Update tracking if successful
      if (result.success) {
        this.updateReplyTracking(message.authorId);
      }

      return result;

    } catch (error) {
      logger.error('Error handling reply:', error);
      return {
        success: false,
        content: replyContent,
        error: error.message
      };
    }
  }

  /**
   * Announce the creation of a new token
   */
  async announceTokenCreation(
    tokenData: MemeCoinData,
    creationResult: TokenCreationResult
  ): Promise<ReplyResult> {
    try {
      if (!creationResult.success) {
        return {
          success: false,
          content: '',
          error: 'Token creation failed'
        };
      }

      const announcement = this.generateTokenAnnouncement(tokenData, creationResult);
      
      // Post as new tweet (not a reply)
      const tweetResult = await this.twitterBot.tweet(announcement);

      return {
        success: tweetResult.success,
        replyId: tweetResult.tweetId,
        content: announcement,
        error: tweetResult.error
      };

    } catch (error) {
      logger.error('Error announcing token creation:', error);
      return {
        success: false,
        content: '',
        error: error.message
      };
    }
  }

  /**
   * Generate contextual reply templates
   */
  generateContextualReply(message: TwitterMessage, context: {
    sentiment?: number;
    viralScore?: number;
    shouldCreateToken?: boolean;
    aiPersonality?: string;
  }): string {
    const templates = this.getReplyTemplates(context);
    const template = templates[Math.floor(Math.random() * templates.length)];

    return this.personalizeReply(template, message, context);
  }

  /**
   * Check if we can send another reply based on rate limits
   */
  private canReply(): boolean {
    // Reset counter if an hour has passed
    if (Date.now() - this.lastHourReset > 60 * 60 * 1000) {
      this.resetHourlyCounter();
    }

    return this.hourlyReplyCount < this.config.maxRepliesPerHour;
  }

  /**
   * Check if we've replied to this user recently
   */
  private hasRecentReply(userId: string): boolean {
    const lastReply = this.replyHistory.get(userId);
    if (!lastReply) return false;

    // Don't reply to same user more than once per hour
    return Date.now() - lastReply < 60 * 60 * 1000;
  }

  /**
   * Update reply tracking
   */
  private updateReplyTracking(userId: string): void {
    this.replyHistory.set(userId, Date.now());
    this.hourlyReplyCount++;
    
    logger.info(`Reply sent. Hourly count: ${this.hourlyReplyCount}/${this.config.maxRepliesPerHour}`);
  }

  /**
   * Reset hourly reply counter
   */
  private resetHourlyCounter(): void {
    this.hourlyReplyCount = 0;
    this.lastHourReset = Date.now();
    logger.info('Hourly reply counter reset');
  }

  /**
   * Format reply with proper mentions and context
   */
  private formatReply(message: TwitterMessage, content: string): string {
    let reply = content;

    // Add mention if not already included
    if (!reply.includes(`@${message.authorUsername}`)) {
      reply = `@${message.authorUsername} ${reply}`;
    }

    // Ensure reply fits Twitter length limit (280 chars)
    if (reply.length > 280) {
      reply = reply.substring(0, 277) + '...';
    }

    return reply;
  }

  /**
   * Generate token creation announcement
   */
  private generateTokenAnnouncement(
    tokenData: MemeCoinData,
    result: TokenCreationResult
  ): string {
    const emojis = ['🚀', '✨', '🎭', '💎', '🔥', '⚡'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const announcement = `${randomEmoji} NEW MEME COIN ALERT! ${randomEmoji}

Just created $${tokenData.symbol} - "${tokenData.name}"!

${tokenData.description}

Inspired by viral content from @${tokenData.metadata.twitterContext.authorUsername}
💫 Sentiment Score: ${(tokenData.metadata.sentimentScore * 100).toFixed(0)}%
🌟 Viral Potential: ${(tokenData.metadata.viralScore * 100).toFixed(0)}%

Token: ${result.tokenAddress?.substring(0, 8)}...

#MemeCoin #SolanaTokens #TokenLaunch`;

    return announcement;
  }

  /**
   * Get reply templates based on context
   */
  private getReplyTemplates(context: {
    sentiment?: number;
    viralScore?: number;
    shouldCreateToken?: boolean;
    aiPersonality?: string;
  }): string[] {
    const baseTemplates = [
      "This has some serious meme potential! 🎭✨",
      "I'm getting major viral vibes from this! 🚀",
      "The meme magic is strong with this one! ✨",
      "This could be the next big thing! 💎",
      "Now this is what I call content gold! 🔥"
    ];

    const tokenCreationTemplates = [
      "This is so good it deserves its own token! Should we make it happen? 🚀💎",
      "I'm sensing serious token potential here! This could go viral! ⚡🎭",
      "The vibes are immaculate! Time to immortalize this on the blockchain? ✨💫",
      "This energy needs to be captured in token form! Who's ready? 🔥🚀",
      "Peak meme content detected! Shall we tokenize this masterpiece? 🎨💎"
    ];

    const highSentimentTemplates = [
      "The positive energy is off the charts! Love to see it! ✨🌟",
      "This is giving me all the good vibes! Keep it up! 💫⚡",
      "Absolutely legendary content! The community needs more of this! 🔥💎",
      "Pure gold right here! This is what the timeline needed! 🏆✨"
    ];

    if (context.shouldCreateToken) {
      return tokenCreationTemplates;
    }

    if (context.sentiment && context.sentiment > 0.8) {
      return highSentimentTemplates;
    }

    return baseTemplates;
  }

  /**
   * Personalize reply with user context
   */
  private personalizeReply(
    template: string,
    message: TwitterMessage,
    context: any
  ): string {
    let personalized = template;

    // Add user-specific elements
    if (message.hashtags.length > 0) {
      const relevantHashtag = message.hashtags[0];
      personalized += ` Love the #${relevantHashtag} energy!`;
    }

    // Add metrics-based comments
    if (message.metrics.likes > 100) {
      personalized += " Already gaining traction - I can see why! 📈";
    }

    return personalized;
  }

  /**
   * Get reply statistics
   */
  getStats() {
    return {
      hourlyReplies: this.hourlyReplyCount,
      maxHourlyReplies: this.config.maxRepliesPerHour,
      recentInteractions: this.replyHistory.size,
      canReply: this.canReply()
    };
  }
}