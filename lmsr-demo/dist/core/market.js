/**
 * Market state management and trader logic
 */
import { executeTrade, calculatePrice, calculateTradeCost } from './lmsr.js';
/**
 * Create initial market state
 */
export function createMarketState(market, initialCash = 1000) {
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
export function executeMarketTrade(state, outcomeIndex, shares) {
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
    const trade = {
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
export function calculatePortfolioValue(portfolio, winningOutcome) {
    // If the outcome wins, each share is worth $1
    const sharesValue = portfolio.holdings[winningOutcome];
    return portfolio.cash + sharesValue;
}
/**
 * Calculate expected portfolio value based on current market prices
 */
export function calculateExpectedValue(state) {
    const prices = state.market.outcomes.map((_, i) => calculatePrice(state.market, i));
    const expectedShareValue = state.portfolio.holdings.reduce((sum, shares, i) => {
        return sum + shares * prices[i];
    }, 0);
    return state.portfolio.cash + expectedShareValue;
}
/**
 * Calculate profit/loss
 */
export function calculatePnL(state, winningOutcome) {
    if (winningOutcome !== undefined) {
        // Realized P&L
        const finalValue = calculatePortfolioValue(state.portfolio, winningOutcome);
        return finalValue - state.portfolio.initialCash;
    }
    else {
        // Mark-to-market P&L
        const currentValue = calculateExpectedValue(state);
        return currentValue - state.portfolio.initialCash;
    }
}
/**
 * Reset market to initial state
 */
export function resetMarket(state) {
    return createMarketState({
        ...state.market,
        quantities: new Array(state.market.outcomes.length).fill(0)
    }, state.portfolio.initialCash);
}
//# sourceMappingURL=market.js.map