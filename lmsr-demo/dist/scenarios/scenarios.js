/**
 * Pre-configured teaching scenarios
 */
import { createMarket } from '../core/lmsr.js';
export const scenarios = [
    {
        id: 'weather',
        name: 'Weather Prediction',
        description: 'A simple binary-ish market to learn the basics',
        question: 'Will it rain tomorrow in San Francisco?',
        market: createMarket(['Yes (>0.1in)', 'No', 'Heavy (>1in)'], 10),
        initialCash: 100,
        guidance: [
            'Start by checking the current prices - they should all be around 33% since the market is new',
            'Try buying shares of "Yes" - watch how the price increases',
            'Experiment with the liquidity slider (b parameter) to see how it affects price impact',
            'Notice that all prices always sum to 100%'
        ],
        learningGoals: [
            'Understand how buying shares increases prices',
            'See the relationship between liquidity (b) and price sensitivity',
            'Recognize that prices form a probability distribution'
        ]
    },
    {
        id: 'election',
        name: 'Election Prediction',
        description: 'Three-way race with moderate liquidity',
        question: 'Who will win the election?',
        market: createMarket(['Candidate A', 'Candidate B', 'Candidate C'], 50, [20, 15, 10] // Start with some existing trades
        ),
        initialCash: 200,
        guidance: [
            'Notice the market already has some history - prices are not equal',
            'If you believe Candidate A has >60% chance, buying is profitable',
            'Try making a large trade - see how the cost is more than shares × price',
            'This demonstrates marginal vs average pricing'
        ],
        learningGoals: [
            'Understand marginal vs average cost',
            'Learn about price impact for large trades',
            'See how markets aggregate information'
        ]
    },
    {
        id: 'sports',
        name: 'Tournament Winner',
        description: 'Multi-outcome market with long tail',
        question: 'Which team will win the tournament?',
        market: createMarket(['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Other'], 20),
        initialCash: 150,
        guidance: [
            'Six outcomes make this more complex - observe the probability distribution',
            'Try concentrating your bets on one team vs spreading across multiple',
            'The "Other" outcome represents all remaining teams - a useful catch-all',
            'Watch how eliminating a team (price → 0) affects other prices'
        ],
        learningGoals: [
            'Handle multi-outcome markets',
            'Understand long-tail distributions',
            'See how outcome elimination redistributes probability'
        ]
    },
    {
        id: 'liquidity-comparison',
        name: 'Liquidity Comparison',
        description: 'Compare high vs low liquidity markets side-by-side',
        question: 'Will the coin flip be heads or tails?',
        market: createMarket(['Heads', 'Tails'], 5 // Low liquidity - very sensitive
        ),
        initialCash: 100,
        guidance: [
            'Start with b=5 (low liquidity) - make a small trade and watch prices jump',
            'Now increase b to 50 (high liquidity) and make the same trade',
            'Compare the price impact - high b means more stable prices',
            'Low b is like a small-stakes betting pool, high b is like a major exchange'
        ],
        learningGoals: [
            'Understand the liquidity-sensitivity tradeoff',
            'See how b parameter affects market behavior',
            'Learn when to use high vs low liquidity'
        ]
    },
    {
        id: 'arbitrage',
        name: 'Mispriced Market',
        description: 'Find and exploit arbitrage opportunities',
        question: 'What color is the sky?',
        market: createMarket(['Blue', 'Red', 'Green'], 15, [5, 15, 3] // Intentionally mispriced - Red is overvalued
        ),
        initialCash: 200,
        guidance: [
            'Look at the current prices - does something seem off?',
            'If you know the sky is blue with ~100% certainty, there\'s an arbitrage',
            'Buy Blue shares when they\'re underpriced',
            'As you trade, watch prices converge to the "true" probability',
            'This demonstrates how markets discover truth through trading'
        ],
        learningGoals: [
            'Identify mispriced markets',
            'Understand arbitrage opportunities',
            'See price discovery in action'
        ]
    },
    {
        id: 'bounded-loss',
        name: 'Market Maker\'s Bounded Loss',
        description: 'Understand the market maker\'s risk',
        question: 'Will the product launch succeed?',
        market: createMarket(['Success', 'Failure'], 25),
        initialCash: 300,
        guidance: [
            'The market maker\'s maximum loss is b × ln(n) = 25 × ln(2) ≈ $17.33',
            'No matter what trades occur, the MM can\'t lose more than this',
            'Try to maximize your profit - can you extract the full $17.33?',
            'This demonstrates why LMSR is safe for market makers'
        ],
        learningGoals: [
            'Understand bounded loss property',
            'See market maker\'s risk management',
            'Learn about worst-case scenarios'
        ]
    },
    {
        id: 'temperature',
        name: 'Softmax Temperature',
        description: 'Direct comparison to softmax in ML',
        question: 'Which class will the model predict?',
        market: createMarket(['Class A', 'Class B', 'Class C', 'Class D'], 10),
        initialCash: 150,
        guidance: [
            'LMSR pricing is literally softmax: p_i = exp(q_i/b) / Σ exp(q_j/b)',
            'The b parameter is exactly like temperature in softmax',
            'High b (temperature) = more uniform distribution',
            'Low b (temperature) = sharper, more peaked distribution',
            'Try different b values to see this in action'
        ],
        learningGoals: [
            'Connect LMSR to familiar ML concepts',
            'Understand temperature parameter intuitively',
            'See softmax as a pricing mechanism'
        ]
    }
];
export function getScenario(id) {
    return scenarios.find(s => s.id === id);
}
export function getAllScenarios() {
    return scenarios;
}
//# sourceMappingURL=scenarios.js.map