import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { logger } from '../utils/logger';

import type { SolanaTokenParams, TokenCreationResult } from '../types';

/**
 * Manages Solana blockchain interactions for token creation and bonding curve operations
 */
export class SolanaManager {
  private connection: Connection;
  private payer?: Keypair;
  private programId: PublicKey;

  constructor(private config: {
    cluster: 'devnet' | 'mainnet-beta' | 'testnet';
    commitment: 'processed' | 'confirmed' | 'finalized';
    rpcUrl?: string;
    privateKey?: string;
    programId: string;
  }) {
    // Initialize connection
    const rpcUrl = config.rpcUrl || this.getDefaultRpcUrl();
    this.connection = new Connection(rpcUrl, config.commitment);
    this.programId = new PublicKey(config.programId);

    // Initialize payer if private key provided
    if (config.privateKey) {
      const secretKey = Buffer.from(config.privateKey, 'base64');
      this.payer = Keypair.fromSecretKey(secretKey);
    }

    logger.info(`SolanaManager initialized for ${config.cluster}`);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Solana connection...');

      // Test connection
      const version = await this.connection.getVersion();
      logger.info(`Connected to Solana cluster: ${version['solana-core']}`);

      // Check payer balance if available
      if (this.payer) {
        const balance = await this.connection.getBalance(this.payer.publicKey);
        logger.info(`Payer balance: ${balance / LAMPORTS_PER_SOL} SOL`);

        if (balance < 0.1 * LAMPORTS_PER_SOL) {
          logger.warn('Low payer balance - may affect token creation');
        }
      }

    } catch (error) {
      logger.error('Failed to initialize Solana connection:', error);
      throw error;
    }
  }

  /**
   * Create a new token using TokenLaunch Pro bonding curve
   */
  async createTokenWithBondingCurve(params: SolanaTokenParams): Promise<TokenCreationResult> {
    if (!this.payer) {
      throw new Error('No payer configured for token creation');
    }

    try {
      logger.info(`Creating token: ${params.name} (${params.symbol})`);

      // For now, create a standard SPL token
      // TODO: Integrate with actual bonding curve program
      const mint = await createMint(
        this.connection,
        this.payer,
        this.payer.publicKey,
        this.payer.publicKey,
        params.decimals,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      // Create associated token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.payer,
        mint,
        params.creator
      );

      // Mint initial supply
      await mintTo(
        this.connection,
        this.payer,
        mint,
        tokenAccount.address,
        this.payer,
        params.totalSupply * Math.pow(10, params.decimals)
      );

      // TODO: Initialize bonding curve with actual program
      const bondingCurveAddress = await this.initializeBondingCurve(mint, params);

      logger.info(`Token created successfully: ${mint.toString()}`);

      return {
        success: true,
        tokenAddress: mint.toString(),
        bondingCurveAddress,
        transactionId: 'pending' // Would be actual tx signature
      };

    } catch (error) {
      logger.error('Error creating token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initialize bonding curve for a token (placeholder for actual implementation)
   */
  private async initializeBondingCurve(mint: PublicKey, params: SolanaTokenParams): Promise<string> {
    // TODO: Implement actual bonding curve initialization
    // This would call the TokenLaunch Pro program instructions
    
    // For now, return a mock address
    const mockBondingCurve = new PublicKey('11111111111111111111111111111111');
    
    logger.info('Bonding curve initialized (mock)');
    return mockBondingCurve.toString();
  }

  /**
   * Get token account balance
   */
  async getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return balance.value.uiAmount || 0;
    } catch (error) {
      logger.error('Error getting token balance:', error);
      return 0;
    }
  }

  /**
   * Get SOL balance for a wallet
   */
  async getSOLBalance(wallet: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(wallet);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  /**
   * Create metadata for the token
   */
  async createTokenMetadata(params: {
    mint: PublicKey;
    name: string;
    symbol: string;
    uri: string;
  }): Promise<string> {
    // TODO: Implement Metaplex metadata creation
    logger.info(`Creating metadata for token: ${params.name}`);
    return 'metadata-created';
  }

  /**
   * Monitor token transactions
   */
  async monitorToken(tokenAddress: string, callback: (tx: any) => void): Promise<void> {
    const publicKey = new PublicKey(tokenAddress);
    
    this.connection.onAccountChange(
      publicKey,
      (accountInfo, context) => {
        callback({
          slot: context.slot,
          accountInfo
        });
      },
      'confirmed'
    );

    logger.info(`Monitoring token: ${tokenAddress}`);
  }

  /**
   * Get token supply information
   */
  async getTokenSupply(tokenAddress: string): Promise<{
    supply: number;
    decimals: number;
  }> {
    try {
      const mint = new PublicKey(tokenAddress);
      const supply = await this.connection.getTokenSupply(mint);
      
      return {
        supply: supply.value.uiAmount || 0,
        decimals: supply.value.decimals
      };
    } catch (error) {
      logger.error('Error getting token supply:', error);
      return { supply: 0, decimals: 9 };
    }
  }

  /**
   * Get program account data
   */
  async getProgramAccounts(filters?: any[]): Promise<any[]> {
    try {
      const accounts = await this.connection.getProgramAccounts(
        this.programId,
        { filters }
      );
      return accounts;
    } catch (error) {
      logger.error('Error getting program accounts:', error);
      return [];
    }
  }

  private getDefaultRpcUrl(): string {
    switch (this.config.cluster) {
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get payer keypair
   */
  getPayer(): Keypair | undefined {
    return this.payer;
  }

  /**
   * Set new payer
   */
  setPayer(keypair: Keypair): void {
    this.payer = keypair;
    logger.info('Payer updated');
  }
}