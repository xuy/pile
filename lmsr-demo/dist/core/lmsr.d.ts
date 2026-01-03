/**
 * Core LMSR (Logarithmic Market Scoring Rule) implementation
 *
 * LMSR is an automated market maker that provides continuous liquidity.
 * Key insight: LMSR pricing is literally softmax!
 *
 * Price of outcome i: p_i = exp(q_i/b) / Σ_j exp(q_j/b)
 *
 * Where:
 * - q_i = quantity of shares outstanding for outcome i
 * - b = liquidity parameter (analogous to temperature in softmax)
 */
export interface LMSRMarket {
    outcomes: string[];
    quantities: number[];
    b: number;
}
/**
 * Calculate the cost function C(q) = b * ln(Σ exp(q_i/b))
 * This represents the total amount the market maker has received.
 */
export declare function calculateCost(market: LMSRMarket, quantities: number[]): number;
/**
 * Calculate the instantaneous price of an outcome
 * This is the marginal price: ∂C/∂q_i = exp(q_i/b) / Σ exp(q_j/b)
 *
 * Notice this is exactly the softmax function!
 */
export declare function calculatePrice(market: LMSRMarket, outcomeIndex: number): number;
/**
 * Calculate all prices at once (returns probability distribution)
 */
export declare function calculateAllPrices(market: LMSRMarket): number[];
/**
 * Calculate the cost to buy a specific number of shares of an outcome
 * Cost = C(q + Δq) - C(q)
 *
 * Positive shares = buying, negative shares = selling
 */
export declare function calculateTradeCost(market: LMSRMarket, outcomeIndex: number, shares: number): number;
/**
 * Calculate the average price per share for a trade
 */
export declare function calculateAveragePrice(market: LMSRMarket, outcomeIndex: number, shares: number): number;
/**
 * Execute a trade and return the updated market
 */
export declare function executeTrade(market: LMSRMarket, outcomeIndex: number, shares: number): {
    market: LMSRMarket;
    cost: number;
};
/**
 * Calculate the market maker's maximum possible loss
 * Max loss = b * ln(n) where n is the number of outcomes
 */
export declare function calculateMaxLoss(market: LMSRMarket): number;
/**
 * Calculate the spread (difference between buy and sell price) for a small trade
 */
export declare function calculateSpread(market: LMSRMarket, outcomeIndex: number, shares?: number): number;
/**
 * Create a new market with given outcomes and initial state
 */
export declare function createMarket(outcomes: string[], b: number, initialQuantities?: number[]): LMSRMarket;
/**
 * Calculate the price impact of a trade (how much the price changes)
 */
export declare function calculatePriceImpact(market: LMSRMarket, outcomeIndex: number, shares: number): number;
/**
 * Validate that market is in a valid state
 */
export declare function validateMarket(market: LMSRMarket): {
    valid: boolean;
    error?: string;
};
