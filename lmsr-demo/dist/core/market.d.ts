/**
 * Market state management and trader logic
 */
import { LMSRMarket } from './lmsr.js';
export interface Trade {
    timestamp: number;
    outcomeIndex: number;
    outcomeName: string;
    shares: number;
    cost: number;
    averagePrice: number;
    priceAfter: number;
}
export interface Portfolio {
    holdings: number[];
    cash: number;
    initialCash: number;
}
export interface MarketState {
    market: LMSRMarket;
    trades: Trade[];
    portfolio: Portfolio;
}
/**
 * Create initial market state
 */
export declare function createMarketState(market: LMSRMarket, initialCash?: number): MarketState;
/**
 * Execute a trade and update market state
 */
export declare function executeMarketTrade(state: MarketState, outcomeIndex: number, shares: number): MarketState;
/**
 * Calculate portfolio value if a specific outcome wins
 */
export declare function calculatePortfolioValue(portfolio: Portfolio, winningOutcome: number): number;
/**
 * Calculate expected portfolio value based on current market prices
 */
export declare function calculateExpectedValue(state: MarketState): number;
/**
 * Calculate profit/loss
 */
export declare function calculatePnL(state: MarketState, winningOutcome?: number): number;
/**
 * Reset market to initial state
 */
export declare function resetMarket(state: MarketState): MarketState;
