/**
 * Market state management and trader logic
 */

import { LMSRMarket, executeTrade, calculatePrice, calculateTradeCost } from './lmsr.js';

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
  holdings: number[];  // shares owned for each outcome
  cash: number;        // cash remaining
  initialCash: number; // starting cash
}

export interface MarketState {
  market: LMSRMarket;
  trades: Trade[];
  portfolio: Portfolio;
}

/**
 * Create initial market state
 */
export function createMarketState(
  market: LMSRMarket,
  initialCash: number = 1000
): MarketState {
  return {
    market,
    trades: [],
    portfolio: {
      holdings: new Array(market.outcomes.length).fill(0),
      cash: initialCash,
      initialCash
    }
  };
}

/**
 * Execute a trade and update market state
 */
export function executeMarketTrade(
  state: MarketState,
  outcomeIndex: number,
  shares: number
): MarketState {
  const cost = calculateTradeCost(state.market, outcomeIndex, shares);

  // Check if trader has enough cash
  if (shares > 0 && cost > state.portfolio.cash) {
    throw new Error(`Insufficient funds. Cost: $${cost.toFixed(2)}, Available: $${state.portfolio.cash.toFixed(2)}`);
  }

  // Check if trader has enough shares to sell
  if (shares < 0 && Math.abs(shares) > state.portfolio.holdings[outcomeIndex]) {
    throw new Error(`Insufficient shares. Trying to sell ${Math.abs(shares)}, but only have ${state.portfolio.holdings[outcomeIndex]}`);
  }

  const { market: newMarket } = executeTrade(state.market, outcomeIndex, shares);
  const priceAfter = calculatePrice(newMarket, outcomeIndex);

  const trade: Trade = {
    timestamp: Date.now(),
    outcomeIndex,
    outcomeName: state.market.outcomes[outcomeIndex],
    shares,
    cost,
    averagePrice: cost / shares,
    priceAfter
  };

  const newHoldings = [...state.portfolio.holdings];
  newHoldings[outcomeIndex] += shares;

  return {
    market: newMarket,
    trades: [...state.trades, trade],
    portfolio: {
      ...state.portfolio,
      holdings: newHoldings,
      cash: state.portfolio.cash - cost
    }
  };
}

/**
 * Calculate portfolio value if a specific outcome wins
 */
export function calculatePortfolioValue(
  portfolio: Portfolio,
  winningOutcome: number
): number {
  // If the outcome wins, each share is worth $1
  const sharesValue = portfolio.holdings[winningOutcome];
  return portfolio.cash + sharesValue;
}

/**
 * Calculate expected portfolio value based on current market prices
 */
export function calculateExpectedValue(
  state: MarketState
): number {
  const prices = state.market.outcomes.map((_, i) => calculatePrice(state.market, i));

  const expectedShareValue = state.portfolio.holdings.reduce((sum, shares, i) => {
    return sum + shares * prices[i];
  }, 0);

  return state.portfolio.cash + expectedShareValue;
}

/**
 * Calculate profit/loss
 */
export function calculatePnL(state: MarketState, winningOutcome?: number): number {
  if (winningOutcome !== undefined) {
    // Realized P&L
    const finalValue = calculatePortfolioValue(state.portfolio, winningOutcome);
    return finalValue - state.portfolio.initialCash;
  } else {
    // Mark-to-market P&L
    const currentValue = calculateExpectedValue(state);
    return currentValue - state.portfolio.initialCash;
  }
}

/**
 * Reset market to initial state
 */
export function resetMarket(state: MarketState): MarketState {
  return createMarketState(
    {
      ...state.market,
      quantities: new Array(state.market.outcomes.length).fill(0)
    },
    state.portfolio.initialCash
  );
}
