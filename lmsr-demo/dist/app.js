/**
 * Main application entry point
 */

import {
  calculatePrice,
  calculateTradeCost,
  calculatePriceImpact,
  calculateMaxLoss,
  calculateAllPrices
} from './core/lmsr.js';
import {
  createMarketState,
  executeMarketTrade,
  calculatePnL,
  resetMarket,
  calculateExpectedValue
} from './core/market.js';
import { scenarios, getScenario } from './scenarios/scenarios.js';

// Global state
let currentState;
let priceChart;
let probabilityChart;
let priceHistory = [];

// Initialize the application
function init() {
  setupEventListeners();
  loadScenarios();
  initializeCharts();
}

// Setup event listeners
function setupEventListeners() {
  const scenarioSelect = document.getElementById('scenario-select');
  const outcomeSelect = document.getElementById('outcome-select');
  const sharesInput = document.getElementById('shares-input');
  const executeTrade = document.getElementById('execute-trade');
  const resetButton = document.getElementById('reset-market');
  const liquiditySlider = document.getElementById('liquidity-slider');

  scenarioSelect.addEventListener('change', handleScenarioChange);
  outcomeSelect.addEventListener('change', updateTradePreview);
  sharesInput.addEventListener('input', updateTradePreview);
  executeTrade.addEventListener('click', handleExecuteTrade);
  resetButton.addEventListener('click', handleReset);
  liquiditySlider.addEventListener('input', handleLiquidityChange);
}

// Load scenarios into dropdown
function loadScenarios() {
  const select = document.getElementById('scenario-select');

  scenarios.forEach(scenario => {
    const option = document.createElement('option');
    option.value = scenario.id;
    option.textContent = scenario.name;
    select.appendChild(option);
  });
}

// Handle scenario change
function handleScenarioChange(event) {
  const select = event.target;
  const scenarioId = select.value;

  if (!scenarioId) return;

  const scenario = getScenario(scenarioId);
  if (!scenario) return;

  loadScenario(scenario);
}

// Load a scenario
function loadScenario(scenario) {
  // Create market state
  currentState = createMarketState(scenario.market, scenario.initialCash);
  priceHistory = [scenario.market.outcomes.map((_, i) => calculatePrice(scenario.market, i))];

  // Update UI
  updateScenarioInfo(scenario);
  updateMarketDisplay();
  updatePortfolio();
  updateOutcomeSelect();
  updateCharts();
  updateGuidance(scenario);
  clearTradeHistory();

  // Set liquidity slider
  const slider = document.getElementById('liquidity-slider');
  slider.value = scenario.market.b.toString();
  updateLiquidityDisplay(scenario.market.b);
}

// Update scenario info display
function updateScenarioInfo(scenario) {
  const info = document.getElementById('scenario-info');
  const question = document.getElementById('market-question');

  question.textContent = scenario.question;

  info.innerHTML = `
    <h4>${scenario.name}</h4>
    <p>${scenario.description}</p>
  `;
  info.classList.add('active');
}

// Update market display (prices for all outcomes)
function updateMarketDisplay() {
  const container = document.getElementById('market-outcomes');
  const prices = calculateAllPrices(currentState.market);

  container.innerHTML = currentState.market.outcomes.map((outcome, i) => {
    const price = prices[i];
    return `
      <div class="outcome-item">
        <span class="outcome-name">${outcome}</span>
        <div class="outcome-price">
          <span class="price-percent">${(price * 100).toFixed(1)}%</span>
          <span class="price-dollar">$${price.toFixed(3)}</span>
        </div>
      </div>
    `;
  }).join('');

  // Update max loss
  const maxLoss = calculateMaxLoss(currentState.market);
  document.getElementById('max-loss').textContent = `$${maxLoss.toFixed(2)}`;
}

// Update portfolio display
function updatePortfolio() {
  const cashEl = document.getElementById('cash-value');
  const holdingsList = document.getElementById('holdings-list');
  const portfolioValue = document.getElementById('portfolio-value');
  const pnlEl = document.getElementById('pnl-value');

  cashEl.textContent = `$${currentState.portfolio.cash.toFixed(2)}`;

  // Holdings
  holdingsList.innerHTML = currentState.portfolio.holdings
    .map((shares, i) => {
      if (shares === 0) return '';
      const price = calculatePrice(currentState.market, i);
      return `
        <div class="holding-item">
          <span>${currentState.market.outcomes[i]}: ${shares} shares</span>
          <span>≈ $${(shares * price).toFixed(2)}</span>
        </div>
      `;
    })
    .join('') || '<p class="empty-state" style="margin: 10px 0;">No holdings</p>';

  // Total value and P&L
  const expectedValue = calculateExpectedValue(currentState);
  portfolioValue.textContent = `$${expectedValue.toFixed(2)}`;

  const pnl = calculatePnL(currentState);
  pnlEl.textContent = `$${pnl.toFixed(2)}`;
  pnlEl.className = pnl >= 0 ? 'value positive' : 'value negative';
}

// Update outcome select dropdown
function updateOutcomeSelect() {
  const select = document.getElementById('outcome-select');

  select.innerHTML = currentState.market.outcomes.map((outcome, i) => {
    return `<option value="${i}">${outcome}</option>`;
  }).join('');

  updateTradePreview();
}

// Update trade preview
function updateTradePreview() {
  const outcomeSelect = document.getElementById('outcome-select');
  const sharesInput = document.getElementById('shares-input');

  const outcomeIndex = parseInt(outcomeSelect.value);
  const shares = parseFloat(sharesInput.value) || 0;

  if (isNaN(outcomeIndex) || shares === 0) {
    document.getElementById('estimated-cost').textContent = '$0.00';
    document.getElementById('average-price').textContent = '$0.00';
    document.getElementById('price-after').textContent = '0.00%';
    return;
  }

  try {
    const cost = calculateTradeCost(currentState.market, outcomeIndex, shares);
    const avgPrice = cost / shares;
    const priceImpact = calculatePriceImpact(currentState.market, outcomeIndex, shares);
    const priceAfter = calculatePrice(currentState.market, outcomeIndex) + priceImpact;

    document.getElementById('estimated-cost').textContent = `$${cost.toFixed(2)}`;
    document.getElementById('average-price').textContent = `$${avgPrice.toFixed(3)}`;
    document.getElementById('price-after').textContent = `${(priceAfter * 100).toFixed(1)}%`;
  } catch (error) {
    console.error('Error calculating trade preview:', error);
  }
}

// Handle trade execution
function handleExecuteTrade() {
  const outcomeSelect = document.getElementById('outcome-select');
  const sharesInput = document.getElementById('shares-input');

  const outcomeIndex = parseInt(outcomeSelect.value);
  const shares = parseFloat(sharesInput.value) || 0;

  if (isNaN(outcomeIndex) || shares === 0) {
    alert('Please enter a valid number of shares');
    return;
  }

  try {
    currentState = executeMarketTrade(currentState, outcomeIndex, shares);

    // Record price history
    const prices = calculateAllPrices(currentState.market);
    priceHistory.push(prices);

    // Update UI
    updateMarketDisplay();
    updatePortfolio();
    updateCharts();
    addTradeToHistory(currentState.trades[currentState.trades.length - 1]);
    updateTradePreview();

  } catch (error) {
    alert(`Trade failed: ${error.message}`);
  }
}

// Handle market reset
function handleReset() {
  if (!confirm('Are you sure you want to reset the market? All trades will be cleared.')) {
    return;
  }

  currentState = resetMarket(currentState);
  priceHistory = [currentState.market.outcomes.map((_, i) => calculatePrice(currentState.market, i))];

  updateMarketDisplay();
  updatePortfolio();
  updateCharts();
  clearTradeHistory();
  updateTradePreview();
}

// Handle liquidity change
function handleLiquidityChange(event) {
  const slider = event.target;
  const newB = parseFloat(slider.value);

  // Update market
  currentState.market.b = newB;

  // Update display
  updateLiquidityDisplay(newB);
  updateMarketDisplay();
  updateTradePreview();
  updateCharts();
}

// Update liquidity display
function updateLiquidityDisplay(b) {
  const valueEl = document.getElementById('liquidity-value');
  const hintEl = document.getElementById('liquidity-hint');

  valueEl.textContent = b.toString();

  if (b < 10) {
    hintEl.textContent = 'Very low liquidity - highly sensitive';
  } else if (b < 30) {
    hintEl.textContent = 'Low liquidity - sensitive to trades';
  } else if (b < 60) {
    hintEl.textContent = 'Moderate liquidity';
  } else if (b < 80) {
    hintEl.textContent = 'High liquidity - stable prices';
  } else {
    hintEl.textContent = 'Very high liquidity - very stable';
  }
}

// Add trade to history
function addTradeToHistory(trade) {
  const container = document.getElementById('trade-history');

  if (container.querySelector('.empty-state')) {
    container.innerHTML = '';
  }

  const time = new Date(trade.timestamp).toLocaleTimeString();
  const tradeEl = document.createElement('div');
  tradeEl.className = `trade-item ${trade.shares < 0 ? 'sell' : 'buy'}`;
  tradeEl.innerHTML = `
    <div><strong>${trade.shares > 0 ? 'BOUGHT' : 'SOLD'} ${Math.abs(trade.shares)} shares</strong> of ${trade.outcomeName}</div>
    <div>Cost: $${trade.cost.toFixed(2)} • Avg Price: $${trade.averagePrice.toFixed(3)}</div>
    <div class="trade-time">${time}</div>
  `;

  container.insertBefore(tradeEl, container.firstChild);
}

// Clear trade history
function clearTradeHistory() {
  const container = document.getElementById('trade-history');
  container.innerHTML = '<p class="empty-state">No trades yet</p>';
}

// Update guidance
function updateGuidance(scenario) {
  const container = document.getElementById('guidance-content');

  container.innerHTML = `
    <h3>How to Learn from This Scenario</h3>
    <ul>
      ${scenario.guidance.map(g => `<li>${g}</li>`).join('')}
    </ul>
    <div class="learning-goals">
      <h4>Learning Goals:</h4>
      <ul>
        ${scenario.learningGoals.map(g => `<li>${g}</li>`).join('')}
      </ul>
    </div>
  `;
}

// Initialize charts
function initializeCharts() {
  const priceCtx = document.getElementById('price-chart').getContext('2d');
  const probabilityCtx = document.getElementById('probability-chart').getContext('2d');

  priceChart = new Chart(priceCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            callback: function(value) {
              return (Number(value) * 100).toFixed(0) + '%';
            }
          }
        }
      }
    }
  });

  probabilityChart = new Chart(probabilityCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Probability',
        data: [],
        backgroundColor: 'rgba(37, 99, 235, 0.7)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            callback: function(value) {
              return (Number(value) * 100).toFixed(0) + '%';
            }
          }
        }
      }
    }
  });
}

// Update charts
function updateCharts() {
  if (!currentState) return;

  // Update price history chart
  const colors = [
    'rgb(37, 99, 235)',
    'rgb(124, 58, 237)',
    'rgb(16, 185, 129)',
    'rgb(245, 158, 11)',
    'rgb(239, 68, 68)',
    'rgb(156, 163, 175)'
  ];

  priceChart.data.labels = priceHistory.map((_, i) => i.toString());
  priceChart.data.datasets = currentState.market.outcomes.map((outcome, i) => ({
    label: outcome,
    data: priceHistory.map(prices => prices[i]),
    borderColor: colors[i % colors.length],
    backgroundColor: colors[i % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
    tension: 0.1,
    borderWidth: 2
  }));
  priceChart.update();

  // Update probability distribution chart
  const currentPrices = calculateAllPrices(currentState.market);
  probabilityChart.data.labels = currentState.market.outcomes;
  probabilityChart.data.datasets[0].data = currentPrices;
  probabilityChart.data.datasets[0].backgroundColor = currentState.market.outcomes.map((_, i) =>
    colors[i % colors.length].replace('rgb', 'rgba').replace(')', ', 0.7)')
  );
  probabilityChart.data.datasets[0].borderColor = currentState.market.outcomes.map((_, i) =>
    colors[i % colors.length]
  );
  probabilityChart.update();
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
