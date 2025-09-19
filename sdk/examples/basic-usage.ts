/**
 * Basic usage example of the TokenLaunch Pro Eliza-Solana SDK
 * 
 * This example shows how to set up and use the SDK to:
 * 1. Monitor Twitter for viral content
 * 2. Analyze sentiment and create meme coins
 * 3. Reply to engaging tweets automatically
 */

import { ElizaSolanaSDK, defaultConfig } from '../src/index';
import { logger } from '../src/utils/logger';

// Environment configuration
const config = {
  ...defaultConfig,
  eliza: {
    modelProvider: 'openai' as const,
    temperature: 0.8,
    maxTokens: 300
  },
  solana: {
    cluster: 'devnet' as const,
    commitment: 'confirmed' as const,
    rpcUrl: 'https://api.devnet.solana.com',
    programId: '8DV5gyq2Dsy5DW5dMQtLZ5FGw657BUH2h9pZyBDcoSz3', // TokenLaunch Pro Bonding Curve
    privateKey: process.env.SOLANA_PRIVATE_KEY
  },
  twitter: {
    replyDelay: 3000, // 3 second delay between replies
    maxRepliesPerHour: 15, // Conservative rate limiting
    username: process.env.TWITTER_USERNAME!,
    password: process.env.TWITTER_PASSWORD!,
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET
  },
  memeCoin: {
    minSentimentScore: 0.7, // Only create tokens for positive content
    maxSupply: 1000000000, // 1B tokens max
    initialLiquidity: 0.5 // 0.5 SOL initial liquidity
  }
};

async function main() {
  try {
    logger.info('🚀 Starting TokenLaunch Pro Eliza-Solana SDK Example');

    // Initialize the SDK
    const sdk = new ElizaSolanaSDK(config);

    // Start the SDK (begins monitoring Twitter)
    await sdk.start();

    logger.info('✅ SDK Started Successfully!');
    logger.info('🔍 Now monitoring Twitter for viral content...');
    logger.info('🤖 AI agent ready to create meme coins and reply to tweets');

    // Example: Process a specific tweet manually
    const exampleTweet = {
      id: '1234567890',
      text: 'Diamond hands forever! 💎🙌 This community is unbreakable! #WAGMI #DeFi',
      authorId: 'user123',
      authorUsername: 'cryptoenthusiast',
      createdAt: new Date(),
      metrics: {
        likes: 150,
        retweets: 45,
        replies: 23,
        views: 2500
      },
      hashtags: ['WAGMI', 'DeFi'],
      mentions: [],
      isReply: false
    };

    // Analyze the tweet
    logger.info('📊 Analyzing example tweet...');
    const analysis = await sdk.processTwitterMessage(exampleTweet);

    logger.info('Analysis Results:', {
      shouldReply: analysis.shouldReply,
      shouldCreateToken: analysis.shouldCreateToken,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    });

    // Create token if recommended
    if (analysis.shouldCreateToken && analysis.tokenConcept) {
      logger.info('🪙 Creating meme coin based on analysis...');
      const tokenResult = await sdk.createMemeCoin(analysis);
      
      if (tokenResult.success) {
        logger.info('🎉 Token created successfully!', {
          symbol: analysis.tokenConcept.symbol,
          tokenAddress: tokenResult.tokenAddress
        });
      } else {
        logger.error('❌ Token creation failed:', tokenResult.error);
      }
    }

    // Reply to tweet if recommended
    if (analysis.shouldReply && analysis.replyContent) {
      logger.info('💬 Sending AI-generated reply...');
      const replyResult = await sdk.replyToTweet(exampleTweet, analysis.replyContent);
      
      if (replyResult.success) {
        logger.info('✅ Reply sent successfully!');
      } else {
        logger.error('❌ Reply failed:', replyResult.error);
      }
    }

    // Show SDK statistics
    setInterval(() => {
      const stats = sdk.getStats();
      logger.info('📈 SDK Statistics:', stats);
    }, 60000); // Every minute

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down SDK gracefully...');
      await sdk.stop();
      process.exit(0);
    });

    // Keep the process running
    logger.info('🔄 SDK is now running in background...');
    logger.info('Press Ctrl+C to stop');

  } catch (error) {
    logger.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Advanced example: Custom AI analysis
async function customAnalysisExample() {
  const sdk = new ElizaSolanaSDK(config);
  await sdk.start();

  // Get AI response for custom content
  const aiResponse = await sdk.getAIResponse(
    "The bull market is here! Time for diamond hands! 💎🚀", 
    {
      platform: 'custom',
      sentiment: 0.9,
      context: 'market_analysis'
    }
  );

  logger.info('🤖 AI Response:', {
    text: aiResponse.text,
    confidence: aiResponse.confidence,
    suggestedActions: aiResponse.actions
  });
}

// Example: Batch processing tweets
async function batchProcessingExample() {
  const sdk = new ElizaSolanaSDK(config);
  await sdk.start();

  // Simulate multiple tweets
  const tweets = [
    {
      id: '1',
      text: 'GM crypto fam! Today feels like a moon day! 🚀',
      authorUsername: 'cryptotrader1',
      // ... other fields
    },
    {
      id: '2', 
      text: 'Just discovered this amazing DeFi protocol! 💎',
      authorUsername: 'defi_explorer',
      // ... other fields
    }
    // Add more tweets...
  ];

  logger.info('🔄 Processing multiple tweets...');
  
  for (const tweet of tweets) {
    const analysis = await sdk.processTwitterMessage(tweet as any);
    
    logger.info(`Tweet ${tweet.id} Analysis:`, {
      shouldCreateToken: analysis.shouldCreateToken,
      confidence: analysis.confidence
    });

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run the main example
if (require.main === module) {
  // Check required environment variables
  const requiredVars = [
    'OPENAI_API_KEY',
    'TWITTER_USERNAME', 
    'TWITTER_PASSWORD'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these variables and try again.');
    process.exit(1);
  }

  main().catch(error => {
    logger.error('Example failed:', error);
    process.exit(1);
  });
}