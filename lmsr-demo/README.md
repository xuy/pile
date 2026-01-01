# LMSR Interactive Demo

An interactive, pedagogical demonstration of the **Logarithmic Market Scoring Rule (LMSR)** for prediction markets, designed for users with machine learning backgrounds.

## 🎯 Key Insight

**LMSR pricing is literally softmax:**

```
p_i = exp(q_i/b) / Σ_j exp(q_j/b)
```

The `b` parameter acts like temperature in softmax - high `b` means more uniform prices, low `b` means sharper prices.

## 🚀 Quick Start

1. Open `index.html` in a modern web browser
2. Select a scenario from the dropdown
3. Start trading and exploring!

No build step required - this is a standalone web application.

## 📚 What You'll Learn

- **Softmax Connection**: See how LMSR pricing relates to familiar ML concepts
- **Liquidity Parameter**: Understand how `b` affects market behavior
- **Market Dynamics**: Experience price discovery and arbitrage
- **Bounded Loss**: Learn why LMSR is safe for market makers
- **Prediction Markets**: Build intuition for market-based forecasting

## 🎓 Learning Scenarios

The demo includes 7 carefully designed scenarios:

1. **Weather Prediction** - Learn the basics with a simple 3-outcome market
2. **Election Prediction** - Explore marginal vs average pricing
3. **Tournament Winner** - Handle multi-outcome markets
4. **Liquidity Comparison** - Compare high vs low liquidity
5. **Mispriced Market** - Find arbitrage opportunities
6. **Bounded Loss** - Understand market maker risk
7. **Softmax Temperature** - Direct ML connection

## 🏗️ Architecture

```
lmsr-demo/
├── src/
│   ├── core/
│   │   ├── lmsr.ts          # Core LMSR mathematics
│   │   └── market.ts        # Market state management
│   ├── scenarios/
│   │   └── scenarios.ts     # Pre-configured teaching scenarios
│   └── app.ts               # Main application logic
├── docs/
│   └── theory.md            # Mathematical background
├── dist/                    # Compiled JavaScript (generated)
├── index.html               # Main application page
├── styles.css               # Styling
└── README.md
```

## 🔧 Development

### TypeScript Compilation

To compile TypeScript to JavaScript:

```bash
# Install TypeScript if needed
npm install -g typescript

# Compile TypeScript files
tsc src/core/lmsr.ts src/core/market.ts src/scenarios/scenarios.ts src/app.ts \
    --target ES2020 \
    --module ES2020 \
    --outDir dist \
    --declaration \
    --sourceMap
```

Or use the provided configuration:

```bash
tsc --project tsconfig.json
```

### File Watching

For development with auto-recompilation:

```bash
tsc --watch
```

## 🎨 Features

### Interactive Market Interface
- Real-time price updates
- Buy and sell shares
- Track your portfolio and P&L
- Visual feedback on all actions

### Dynamic Visualizations
- **Price History Chart**: See how prices evolve over time
- **Probability Distribution**: Current market probabilities as a bar chart
- Both charts update in real-time as you trade

### Educational Content
- Scenario-specific guidance
- Learning goals for each exercise
- Formula displays with explanations
- Hover tooltips throughout

### Liquidity Control
- Interactive slider to adjust `b` parameter
- Real-time feedback on price sensitivity
- Compare market behavior at different liquidity levels

## 📖 Core Concepts

### The Cost Function
```
C(q) = b · ln(Σ exp(q_i/b))
```

### Pricing Formula (Softmax!)
```
p_i = exp(q_i/b) / Σ exp(q_j/b)
```

### Trade Cost
```
Cost = C(q_new) - C(q_old)
```

### Bounded Loss
```
Max Loss = b · ln(n)
```

## 🔗 Resources

### Core Papers
- [Hanson's Original LMSR Paper (2003)](https://mason.gmu.edu/~rhanson/mktscore.pdf)
- [Abernethy et al. - Connection to No-Regret Learning](https://web.eecs.umich.edu/~jabernet/papers/ACV12.pdf)

### Tutorials
- [CultivateLabs LMSR Guide](https://www.cultivatelabs.com/crowdsourced-forecasting-guide/how-does-logarithmic-market-scoring-rule-lmsr-work)
- [Gnosis LMSR Primer](https://gnosis-pm-js.readthedocs.io/en/v1.3.0/lmsr-primer.html)

### Mathematical Background
- See [docs/theory.md](docs/theory.md) for detailed mathematical explanations

## 🎯 Use Cases

This demo is designed for:
- **ML Engineers** learning about prediction markets
- **Data Scientists** exploring market-based forecasting
- **Economists** teaching mechanism design
- **Researchers** prototyping market designs
- **Students** studying automated market makers

## 🛠️ Technologies Used

- **TypeScript** - Type-safe implementation
- **Chart.js** - Interactive visualizations
- **Vanilla HTML/CSS** - No framework overhead
- **ES Modules** - Modern JavaScript

## 📝 License

MIT License - feel free to use this for teaching, research, or commercial projects.

## 🙏 Acknowledgments

- **Robin Hanson** for inventing LMSR
- **David Pennock** and **Yiling Chen** for theoretical foundations
- The prediction markets research community

## 🚧 Future Enhancements

Potential additions:
- Multi-agent simulation mode
- Historical data replay
- Combinatorial markets
- Comparison with other market makers (Uniswap, order books)
- Export/share scenarios
- Trading bot API

## 📧 Feedback

Found a bug? Have a suggestion? Open an issue on GitHub!

---

**Built to teach LMSR fundamentals and build intuition for prediction markets.**
