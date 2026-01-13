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
  quantities: number[];  // q_i for each outcome
  b: number;             // liquidity parameter
}

/**
 * Calculate the cost function C(q) = b * ln(Σ exp(q_i/b))
 * This represents the total amount the market maker has received.
 */
export function calculateCost(market: LMSRMarket, quantities: number[]): number {
  const { b } = market;

  // For numerical stability, use the log-sum-exp trick
  const maxQ = Math.max(...quantities);
  const expSum = quantities.reduce((sum, q) => {
    return sum + Math.exp((q - maxQ) / b);
  }, 0);

  return b * (maxQ / b + Math.log(expSum));
}

/**
 * Calculate the instantaneous price of an outcome
 * This is the marginal price: ∂C/∂q_i = exp(q_i/b) / Σ exp(q_j/b)
 *
 * Notice this is exactly the softmax function!
 */
export function calculatePrice(market: LMSRMarket, outcomeIndex: number): number {
  const { quantities, b } = market;

  // Log-sum-exp trick for numerical stability
  const maxQ = Math.max(...quantities);
  const expSum = quantities.reduce((sum, q) => {
    return sum + Math.exp((q - maxQ) / b);
  }, 0);

  const numerator = Math.exp((quantities[outcomeIndex] - maxQ) / b);
  return numerator / expSum;
}

/**
 * Calculate all prices at once (returns probability distribution)
 */
export function calculateAllPrices(market: LMSRMarket): number[] {
  return market.outcomes.map((_, i) => calculatePrice(market, i));
}

/**
 * Calculate the cost to buy a specific number of shares of an outcome
 * Cost = C(q + Δq) - C(q)
 *
 * Positive shares = buying, negative shares = selling
 */
export function calculateTradeCost(
  market: LMSRMarket,
  outcomeIndex: number,
  shares: number
): number {
  const currentCost = calculateCost(market, market.quantities);

  const newQuantities = [...market.quantities];
  newQuantities[outcomeIndex] += shares;

  const newCost = calculateCost(market, newQuantities);

  return newCost - currentCost;
}

/**
 * Calculate the average price per share for a trade
 */
export function calculateAveragePrice(
  market: LMSRMarket,
  outcomeIndex: number,
  shares: number
): number {
  if (shares === 0) return 0;
  const cost = calculateTradeCost(market, outcomeIndex, shares);
  return cost / shares;
}

/**
 * Execute a trade and return the updated market
 */
export function executeTrade(
  market: LMSRMarket,
  outcomeIndex: number,
  shares: number
): { market: LMSRMarket; cost: number } {
  const cost = calculateTradeCost(market, outcomeIndex, shares);

  const newQuantities = [...market.quantities];
  newQuantities[outcomeIndex] += shares;

  return {
    market: {
      ...market,
      quantities: newQuantities
    },
    cost
  };
}

/**
 * Calculate the market maker's maximum possible loss
 * Max loss = b * ln(n) where n is the number of outcomes
 */
export function calculateMaxLoss(market: LMSRMarket): number {
  return market.b * Math.log(market.outcomes.length);
}

/**
 * Calculate the spread (difference between buy and sell price) for a small trade
 */
export function calculateSpread(
  market: LMSRMarket,
  outcomeIndex: number,
  shares: number = 1
): number {
  const buyCost = calculateTradeCost(market, outcomeIndex, shares);
  const sellCost = calculateTradeCost(market, outcomeIndex, -shares);

  return (buyCost + sellCost) / shares;
}

/**
 * Create a new market with given outcomes and initial state
 */
export function createMarket(
  outcomes: string[],
  b: number,
  initialQuantities?: number[]
): LMSRMarket {
  return {
    outcomes,
    b,
    quantities: initialQuantities || new Array(outcomes.length).fill(0)
  };
}

/**
 * Calculate the price impact of a trade (how much the price changes)
 */
export function calculatePriceImpact(
  market: LMSRMarket,
  outcomeIndex: number,
  shares: number
): number {
  const priceBefore = calculatePrice(market, outcomeIndex);
  const { market: marketAfter } = executeTrade(market, outcomeIndex, shares);
  const priceAfter = calculatePrice(marketAfter, outcomeIndex);

  return priceAfter - priceBefore;
}

/**
 * Validate that market is in a valid state
 */
export function validateMarket(market: LMSRMarket): { valid: boolean; error?: string } {
  if (market.b <= 0) {
    return { valid: false, error: 'Liquidity parameter b must be positive' };
  }

  if (market.outcomes.length !== market.quantities.length) {
    return { valid: false, error: 'Outcomes and quantities must have same length' };
  }

  if (market.outcomes.length < 2) {
    return { valid: false, error: 'Market must have at least 2 outcomes' };
  }

  // Check that prices sum to approximately 1
  const prices = calculateAllPrices(market);
  const priceSum = prices.reduce((a, b) => a + b, 0);
  if (Math.abs(priceSum - 1) > 0.0001) {
    return { valid: false, error: `Prices sum to ${priceSum}, expected 1` };
  }

  return { valid: true };
}
