# LMSR Mathematical Background

## Overview

The Logarithmic Market Scoring Rule (LMSR) is an automated market maker mechanism designed by Robin Hanson in 2003. It provides continuous liquidity in prediction markets without requiring matching buyers and sellers.

## Core Mathematics

### The Cost Function

The fundamental equation of LMSR is the cost function:

```
C(q) = b · ln(Σᵢ exp(qᵢ/b))
```

Where:
- `C(q)` = total cost function (how much the market maker has received)
- `qᵢ` = quantity of shares outstanding for outcome i
- `b` = liquidity parameter
- `n` = number of outcomes

### Pricing Formula

The instantaneous price (marginal price) of an outcome is the partial derivative of the cost function:

```
pᵢ = ∂C/∂qᵢ = exp(qᵢ/b) / Σⱼ exp(qⱼ/b)
```

**This is exactly the softmax function from machine learning!**

### The Softmax Connection

For ML practitioners, this connection is immediate:

```python
# LMSR pricing
def lmsr_price(quantities, b, outcome):
    return softmax(quantities / b)[outcome]

# Where softmax(x) = exp(x) / sum(exp(x))
```

The `b` parameter plays the same role as temperature in softmax:
- High `b` (high temperature) → more uniform distribution
- Low `b` (low temperature) → sharper, more peaked distribution

## Key Properties

### 1. Prices Sum to 1

Since LMSR prices follow softmax, they always form a valid probability distribution:

```
Σᵢ pᵢ = 1
```

This makes them interpretable as market-implied probabilities.

### 2. Bounded Loss

The market maker's maximum possible loss is bounded:

```
Max Loss = b · ln(n)
```

Where `n` is the number of outcomes. This makes LMSR safe for providing continuous liquidity.

**Example:** For a binary market (n=2) with b=100:
```
Max Loss = 100 · ln(2) ≈ $69.31
```

No matter how much trading occurs, the market maker cannot lose more than this.

### 3. Proper Scoring Rule

LMSR is a proper scoring rule, meaning it incentivizes traders to report their true beliefs. If you believe outcome i has probability pᵢᵗʳᵘᵉ, your expected profit is maximized by trading until the market price equals pᵢᵗʳᵘᵉ.

### 4. Path Independence

The final payout depends only on the final quantities, not the path taken to get there. This means:
- Order of trades doesn't matter for final settlement
- No gaming the system through strategic timing

## Trading Mechanics

### Cost of a Trade

To buy Δq shares of outcome i:

```
Cost = C(q₀, q₁, ..., qᵢ + Δq, ..., qₙ) - C(q₀, q₁, ..., qᵢ, ..., qₙ)
```

This is NOT simply `price × shares` because the price changes as you buy.

### Marginal vs Average Price

- **Marginal price**: The price of an infinitesimally small trade (what we show as "current price")
- **Average price**: Total cost divided by number of shares

For a buy order, average price > marginal price (you move the price against yourself).

### Example Calculation

Binary market with b=10, q₀=5, q₁=3:

1. **Calculate current prices:**
   ```
   p₀ = exp(5/10) / (exp(5/10) + exp(3/10))
      = exp(0.5) / (exp(0.5) + exp(0.3))
      = 1.649 / (1.649 + 1.350)
      = 0.550 (55.0%)

   p₁ = exp(3/10) / (exp(5/10) + exp(3/10))
      = 1.350 / 2.999
      = 0.450 (45.0%)
   ```

2. **Cost to buy 10 shares of outcome 0:**
   ```
   C_before = 10 · ln(exp(0.5) + exp(0.3))
            = 10 · ln(2.999)
            = 10.986

   C_after = 10 · ln(exp(1.5) + exp(0.3))
           = 10 · ln(4.481 + 1.350)
           = 10 · ln(5.831)
           = 17.641

   Cost = 17.641 - 10.986 = $6.655
   ```

3. **Average price:**
   ```
   Avg = 6.655 / 10 = $0.666 per share
   ```

   Note this is higher than the initial marginal price of $0.550.

## The Liquidity Parameter (b)

The choice of `b` involves a fundamental tradeoff:

### High b (e.g., b=100)
**Advantages:**
- Very stable prices
- Large trades have small price impact
- Good for high-volume markets
- More liquidity for traders

**Disadvantages:**
- Higher maximum loss for market maker
- Slower price discovery
- Requires more capital

### Low b (e.g., b=5)
**Advantages:**
- Low risk for market maker
- Fast price discovery
- Efficient with capital

**Disadvantages:**
- Prices very sensitive to trades
- High slippage on large orders
- May deter traders

### Choosing b

A common heuristic is to set `b` based on expected trading volume:

```
b ≈ expected_total_trading_volume / 4
```

Alternatively, set it based on acceptable maximum loss:

```
b = max_acceptable_loss / ln(n)
```

## Connection to Other Concepts

### Information Theory

The cost function is related to the log-partition function in statistical mechanics and the cross-entropy in information theory.

### Exponential Families

LMSR belongs to the exponential family of distributions, sharing structure with:
- Logistic regression
- Multinomial logit models
- Maximum entropy distributions

### No-Regret Learning

There's a deep connection between LMSR and no-regret learning algorithms (see Abernethy et al. 2012). The market maker essentially runs a multiplicative weights update algorithm.

## Advanced Topics

### Liquidity-Sensitive LMSR (LS-LMSR)

An extension where `b` adapts based on trading activity:

```
b(t) = α · (current_trading_volume)
```

This provides more liquidity when needed and less when not.

### Combinatorial Markets

LMSR can be extended to handle combinatorial outcomes (e.g., "Team A wins AND over 200 points"). This requires solving the cost function over all possible combinations.

### Market Maker Profit/Loss

After the market resolves with outcome k winning:

```
MM_Profit = Σᵢ (revenue_from_selling_i) - cost_to_buy_winners
          = C(q_final) - q_k
```

Where q_k is the quantity of winning shares outstanding.

## References

1. **Hanson, R. (2003).** "Combinatorial Information Market Design"
   - Original LMSR paper
   - https://mason.gmu.edu/~rhanson/mktscore.pdf

2. **Chen, Y., & Pennock, D. M. (2007).** "A Utility Framework for Bounded-Loss Market Makers"
   - Theoretical foundations
   - https://arxiv.org/abs/1206.5252

3. **Abernethy, J., Chen, Y., & Vaughan, J. W. (2013).** "Efficient Market Making via Convex Optimization"
   - Connection to online learning
   - https://web.eecs.umich.edu/~jabernet/papers/ACV12.pdf

## Exercises

1. Prove that LMSR prices always sum to 1.

2. Derive the maximum loss formula by finding the worst-case scenario.

3. Show that the LMSR pricing formula is the gradient of the cost function.

4. Calculate the price impact of buying 5 shares in a 3-outcome market with b=15 and q=[10, 8, 6].

5. Prove that LMSR is path-independent.
