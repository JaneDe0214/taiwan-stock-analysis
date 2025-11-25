// 全球市場配置
const MARKETS = [
    { id: 'twii', name: '台灣加權', symbol: '^TWII', icon: '🇹🇼', type: 'yahoo' },
    { id: 'dji', name: '道瓊指數', symbol: '^DJI', icon: '🇺🇸', type: 'yahoo' },
    { id: 'ixic', name: '那斯達克', symbol: '^IXIC', icon: '🇺🇸', type: 'yahoo' },
    { id: 'hsi', name: '恆生指數', symbol: '^HSI', icon: '🇭🇰', type: 'yahoo' },
    { id: 'n225', name: '日經指數', symbol: '^N225', icon: '🇯🇵', type: 'yahoo' },
    { id: 'btc', name: 'Bitcoin', symbol: 'bitcoin', icon: '₿', type: 'crypto' },
    { id: 'eth', name: 'Ethereum', symbol: 'ethereum', icon: '⟠', type: 'crypto' },
    { id: 'gold', name: '黃金', symbol: 'GC=F', icon: '🥇', type: 'yahoo' }
];

// 更新時間顯示
function updateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}
setInterval(updateTime, 1000);
updateTime();

// 初始化儀表板
async function initDashboard() {
    const dashboard = document.getElementById('marketDashboard');
    dashboard.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入全球市場數據...</div>';
    
    try {
        const marketData = await Promise.all(MARKETS.map(market => fetchMarketData(market)));
        renderDashboard(marketData);
        
        // 每30秒更新一次
        setInterval(async () => {
            const updatedData = await Promise.all(MARKETS.map(market => fetchMarketData(market)));
            renderDashboard(updatedData);
        }, 30000);
    } catch (error) {
        dashboard.innerHTML = '<div class="loading">⚠️ 載入失敗，請重新整理頁面</div>';
    }
}

// 獲取市場數據
async function fetchMarketData(market) {
    try {
        if (market.type === 'crypto') {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${market.symbol}&vs_currencies=usd&include_24hr_change=true`);
            const data = await response.json();
            const coinData = data[market.symbol];
            return {
                ...market,
                price: coinData.usd,
                change: coinData.usd_24h_change,
                currency: 'USD'
            };
        } else {
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${market.symbol}?interval=1d&range=1d`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            
            if (!data.chart || !data.chart.result || !data.chart.result[0]) {
                throw new Error('Invalid data');
            }
            
            const quote = data.chart.result[0];
            const meta = quote.meta;
            const currentPrice = meta.regularMarketPrice;
            const previousClose = meta.chartPreviousClose;
            const change = ((currentPrice - previousClose) / previousClose) * 100;
            
            return {
                ...market,
                price: currentPrice,
                change: change,
                currency: meta.currency,
                volume: meta.regularMarketVolume
            };
        }
    } catch (error) {
        console.error(`Error fetching ${market.name}:`, error);
        return { ...market, price: 0, change: 0, error: true };
    }
}

// 渲染儀表板
function renderDashboard(marketData) {
    const dashboard = document.getElementById('marketDashboard');
    dashboard.innerHTML = marketData.map(market => {
        if (market.error) return '';
        
        const isPositive = market.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div class="market-card">
                <div class="market-header">
                    <span class="market-name">${market.name}</span>
                    <span class="market-icon">${market.icon}</span>
                </div>
                <div class="market-price">${formatPrice(market.price, market.currency)}</div>
                <div class="market-change ${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    <span>${isPositive ? '+' : ''}${market.change.toFixed(2)}%</span>
                </div>
                ${market.volume ? `<div class="market-info">成交量: ${formatVolume(market.volume)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// 股票分析主函數
async function analyzeStock() {
    const input = document.getElementById('stockInput').value.trim().toUpperCase();
    if (!input) {
        alert('請輸入股票代號');
        return;
    }
    
    const resultDiv = document.getElementById('analysisResult');
    resultDiv.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> AI 分析中...</div>';
    
    try {
        let stockData;
        const lowerInput = input.toLowerCase();
        
        // 判斷是台股、美股還是加密貨幣
        if (/^\d{4}$/.test(input)) {
            // 台股
            stockData = await analyzeTWStock(input);
        } else if (['bitcoin', 'btc', 'ethereum', 'eth', 'bnb', 'solana', 'cardano', 'dogecoin', 'ripple', 'xrp'].includes(lowerInput)) {
            // 加密貨幣
            const cryptoMap = {
                'btc': 'bitcoin',
                'eth': 'ethereum',
                'xrp': 'ripple'
            };
            stockData = await analyzeCrypto(cryptoMap[lowerInput] || lowerInput);
        } else {
            // 美股
            stockData = await analyzeUSStock(input);
        }
        
        renderAnalysis(stockData);
    } catch (error) {
        console.error('Analysis error:', error);
        resultDiv.innerHTML = `
            <div class="loading">
                ⚠️ 查詢失敗<br>
                <small style="font-size: 0.9rem; margin-top: 0.5rem; display: block;">
                    請確認：<br>
                    • 台股請輸入4位數字（如：2330）<br>
                    • 美股請輸入代碼（如：AAPL）<br>
                    • 加密貨幣請輸入完整名稱（如：bitcoin）<br>
                    • 確認網路連線正常
                </small>
            </div>
        `;
    }
}

// 分析台股
async function analyzeTWStock(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.TW?interval=1d&range=3mo`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
        throw new Error('Invalid data');
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    
    return {
        symbol: symbol,
        name: meta.longName || symbol,
        price: meta.regularMarketPrice,
        change: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
        volume: meta.regularMarketVolume,
        currency: 'TWD',
        historicalData: {
            close: quotes.close.filter(v => v !== null),
            high: quotes.high.filter(v => v !== null),
            low: quotes.low.filter(v => v !== null),
            volume: quotes.volume.filter(v => v !== null)
        }
    };
}

// 分析美股
async function analyzeUSStock(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
        throw new Error('Invalid data');
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    
    return {
        symbol: symbol,
        name: meta.longName || symbol,
        price: meta.regularMarketPrice,
        change: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
        volume: meta.regularMarketVolume,
        currency: meta.currency,
        historicalData: {
            close: quotes.close.filter(v => v !== null),
            high: quotes.high.filter(v => v !== null),
            low: quotes.low.filter(v => v !== null),
            volume: quotes.volume.filter(v => v !== null)
        }
    };
}

// 分析加密貨幣
async function analyzeCrypto(symbol) {
    const coinId = symbol.toLowerCase();
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=90`);
    if (!response.ok) throw new Error('Failed to fetch crypto data');
    const data = await response.json();
    
    if (!data.prices || data.prices.length === 0) {
        throw new Error('No price data available');
    }
    
    const prices = data.prices.map(p => p[1]);
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - 2];
    
    return {
        symbol: symbol,
        name: symbol,
        price: currentPrice,
        change: ((currentPrice - previousPrice) / previousPrice) * 100,
        volume: 0,
        currency: 'USD',
        historicalData: {
            close: prices,
            high: prices,
            low: prices,
            volume: []
        }
    };
}

// 技術指標計算
function calculateIndicators(data) {
    const closes = data.close;
    const highs = data.high;
    const lows = data.low;
    
    // RSI (14天)
    const rsi = calculateRSI(closes, 14);
    
    // MACD
    const macd = calculateMACD(closes);
    
    // 布林通道
    const bb = calculateBollingerBands(closes, 20);
    
    // 移動平均線
    const ma5 = calculateMA(closes, 5);
    const ma20 = calculateMA(closes, 20);
    const ma60 = calculateMA(closes, 60);
    
    // KD指標
    const kd = calculateKD(highs, lows, closes, 9);
    
    return { rsi, macd, bb, ma5, ma20, ma60, kd };
}

// RSI計算
function calculateRSI(prices, period = 14) {
    let gains = 0, losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
}

// MACD計算
function calculateMACD(prices) {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = calculateEMA([...prices.slice(-9), macd], 9);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
}

// EMA計算
function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
}

// 移動平均線
function calculateMA(prices, period) {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

// 布林通道
function calculateBollingerBands(prices, period = 20) {
    const ma = calculateMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - ma, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    return {
        upper: ma + (std * 2),
        middle: ma,
        lower: ma - (std * 2)
    };
}

// KD指標
function calculateKD(highs, lows, closes, period = 9) {
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highest = Math.max(...recentHighs);
    const lowest = Math.min(...recentLows);
    
    const rsv = ((currentClose - lowest) / (highest - lowest)) * 100;
    const k = rsv; // 簡化計算
    const d = calculateMA([rsv], 3);
    
    return { k, d };
}

// AI評分系統
function calculateAIScore(stockData, indicators) {
    let score = 50; // 基準分
    let signals = [];
    
    // RSI評分 (30分)
    if (indicators.rsi < 30) {
        score += 15;
        signals.push({ type: 'buy', reason: 'RSI超賣 (<30)', weight: 15 });
    } else if (indicators.rsi > 70) {
        score -= 15;
        signals.push({ type: 'sell', reason: 'RSI超買 (>70)', weight: -15 });
    } else if (indicators.rsi >= 40 && indicators.rsi <= 60) {
        score += 5;
        signals.push({ type: 'neutral', reason: 'RSI中性', weight: 5 });
    }
    
    // MACD評分 (25分)
    if (indicators.macd.histogram > 0) {
        score += 12;
        signals.push({ type: 'buy', reason: 'MACD金叉', weight: 12 });
    } else {
        score -= 12;
        signals.push({ type: 'sell', reason: 'MACD死叉', weight: -12 });
    }
    
    // 布林通道評分 (20分)
    const currentPrice = stockData.price;
    if (currentPrice < indicators.bb.lower) {
        score += 10;
        signals.push({ type: 'buy', reason: '價格低於布林下軌', weight: 10 });
    } else if (currentPrice > indicators.bb.upper) {
        score -= 10;
        signals.push({ type: 'sell', reason: '價格高於布林上軌', weight: -10 });
    }
    
    // 均線評分 (25分)
    if (currentPrice > indicators.ma5 && indicators.ma5 > indicators.ma20 && indicators.ma20 > indicators.ma60) {
        score += 15;
        signals.push({ type: 'buy', reason: '多頭排列', weight: 15 });
    } else if (currentPrice < indicators.ma5 && indicators.ma5 < indicators.ma20 && indicators.ma20 < indicators.ma60) {
        score -= 15;
        signals.push({ type: 'sell', reason: '空頭排列', weight: -15 });
    }
    
    // KD評分 (額外加分)
    if (indicators.kd.k < 20 && indicators.kd.d < 20) {
        score += 8;
        signals.push({ type: 'buy', reason: 'KD超賣', weight: 8 });
    } else if (indicators.kd.k > 80 && indicators.kd.d > 80) {
        score -= 8;
        signals.push({ type: 'sell', reason: 'KD超買', weight: -8 });
    }
    
    // 限制分數範圍
    score = Math.max(0, Math.min(100, score));
    
    return { score, signals };
}

// 計算支撐壓力位
function calculateLevels(stockData, indicators) {
    const price = stockData.price;
    const historicalPrices = stockData.historicalData.close;
    
    // 支撐位：近期低點、布林下軌、MA60
    const support1 = Math.min(...historicalPrices.slice(-20));
    const support2 = indicators.bb.lower;
    const support3 = indicators.ma60;
    
    // 壓力位：近期高點、布林上軌
    const resistance1 = Math.max(...historicalPrices.slice(-20));
    const resistance2 = indicators.bb.upper;
    
    // 目標價位
    const targetBuy = (support1 + support2) / 2;
    const targetSell = (resistance1 + resistance2) / 2;
    
    return {
        support: [support1, support2, support3].sort((a, b) => b - a),
        resistance: [resistance1, resistance2].sort((a, b) => a - b),
        targetBuy,
        targetSell
    };
}

// 渲染分析結果
function renderAnalysis(stockData) {
    const indicators = calculateIndicators(stockData.historicalData);
    const aiScore = calculateAIScore(stockData, indicators);
    const levels = calculateLevels(stockData, indicators);
    
    const isPositive = stockData.change >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    
    let recommendation, scoreClass;
    if (aiScore.score >= 70) {
        recommendation = '強力買入';
        scoreClass = 'score-buy';
    } else if (aiScore.score >= 55) {
        recommendation = '買入';
        scoreClass = 'score-buy';
    } else if (aiScore.score >= 45) {
        recommendation = '持有觀望';
        scoreClass = 'score-hold';
    } else if (aiScore.score >= 30) {
        recommendation = '賣出';
        scoreClass = 'score-sell';
    } else {
        recommendation = '強力賣出';
        scoreClass = 'score-sell';
    }
    
    const resultDiv = document.getElementById('analysisResult');
    resultDiv.innerHTML = `
        <div class="analysis-card">
            <div class="stock-header">
                <div class="stock-title">
                    <h3>${stockData.name} (${stockData.symbol})</h3>
                    <span style="color: #666;">${stockData.currency}</span>
                </div>
                <div class="stock-price">
                    <div class="price-value">${formatPrice(stockData.price, stockData.currency)}</div>
                    <div class="price-change ${changeClass}">
                        ${isPositive ? '+' : ''}${stockData.change.toFixed(2)}%
                    </div>
                </div>
            </div>
            
            <div class="analysis-grid">
                <!-- AI評分 -->
                <div class="analysis-block">
                    <h4><i class="fas fa-robot"></i> AI 智能評分</h4>
                    <div class="score-display">
                        <div class="score-circle ${scoreClass}">
                            ${aiScore.score.toFixed(0)}
                        </div>
                        <div class="recommendation">${recommendation}</div>
                        <p style="color: #666; margin-top: 1rem;">綜合技術指標分析</p>
                    </div>
                </div>
                
                <!-- 技術指標 -->
                <div class="analysis-block">
                    <h4><i class="fas fa-chart-bar"></i> 技術指標</h4>
                    <ul class="indicator-list">
                        <li>
                            <span class="indicator-label">RSI (14)</span>
                            <span class="indicator-value" style="color: ${indicators.rsi < 30 ? 'var(--success)' : indicators.rsi > 70 ? 'var(--danger)' : 'var(--warning)'}">
                                ${indicators.rsi.toFixed(2)}
                            </span>
                        </li>
                        <li>
                            <span class="indicator-label">MACD</span>
                            <span class="indicator-value" style="color: ${indicators.macd.histogram > 0 ? 'var(--success)' : 'var(--danger)'}">
                                ${indicators.macd.macd.toFixed(2)}
                            </span>
                        </li>
                        <li>
                            <span class="indicator-label">MA5</span>
                            <span class="indicator-value">${indicators.ma5.toFixed(2)}</span>
                        </li>
                        <li>
                            <span class="indicator-label">MA20</span>
                            <span class="indicator-value">${indicators.ma20.toFixed(2)}</span>
                        </li>
                        <li>
                            <span class="indicator-label">MA60</span>
                            <span class="indicator-value">${indicators.ma60.toFixed(2)}</span>
                        </li>
                        <li>
                            <span class="indicator-label">K值</span>
                            <span class="indicator-value">${indicators.kd.k.toFixed(2)}</span>
                        </li>
                    </ul>
                </div>
                
                <!-- 價位建議 -->
                <div class="analysis-block">
                    <h4><i class="fas fa-bullseye"></i> 關鍵價位</h4>
                    <div class="price-levels">
                        <div class="price-level level-resistance">
                            <span>壓力位 1</span>
                            <strong>${levels.resistance[0].toFixed(2)}</strong>
                        </div>
                        <div class="price-level level-resistance">
                            <span>壓力位 2</span>
                            <strong>${levels.resistance[1].toFixed(2)}</strong>
                        </div>
                        <div class="price-level level-target">
                            <span>目標賣出價</span>
                            <strong>${levels.targetSell.toFixed(2)}</strong>
                        </div>
                        <div class="price-level level-target">
                            <span>目標買入價</span>
                            <strong>${levels.targetBuy.toFixed(2)}</strong>
                        </div>
                        <div class="price-level level-support">
                            <span>支撐位 1</span>
                            <strong>${levels.support[0].toFixed(2)}</strong>
                        </div>
                        <div class="price-level level-support">
                            <span>支撐位 2</span>
                            <strong>${levels.support[1].toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
                
                <!-- 交易信號 -->
                <div class="analysis-block">
                    <h4><i class="fas fa-signal"></i> 交易信號分析</h4>
                    <ul class="indicator-list">
                        ${aiScore.signals.map(signal => `
                            <li>
                                <span class="indicator-label">${signal.reason}</span>
                                <span class="indicator-value" style="color: ${signal.weight > 0 ? 'var(--success)' : signal.weight < 0 ? 'var(--danger)' : 'var(--warning)'}">
                                    ${signal.weight > 0 ? '+' : ''}${signal.weight}
                                </span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
            
            <div style="margin-top: 2rem; padding: 1rem; background: #fff3cd; border-radius: 8px; color: #856404;">
                <strong>⚠️ 風險提示：</strong> 本分析僅供參考，不構成投資建議。請根據自身風險承受能力謹慎決策。
            </div>
        </div>
    `;
}

// 載入推薦股票
async function loadRecommendations() {
    const recDiv = document.getElementById('recommendedStocks');
    
    // 推薦清單（可根據實際分析動態生成）
    const recommendations = [
        { symbol: '2330', name: '台積電', score: 85, reason: '技術面強勢，多頭排列', badge: 'strong-buy' },
        { symbol: 'AAPL', name: 'Apple', score: 78, reason: 'RSI回調至健康區間', badge: 'buy' },
        { symbol: 'NVDA', name: 'NVIDIA', score: 82, reason: 'AI題材持續發酵', badge: 'strong-buy' },
        { symbol: 'TSLA', name: 'Tesla', score: 65, reason: '突破關鍵壓力位', badge: 'buy' }
    ];
    
    recDiv.innerHTML = `
        <div class="rec-grid">
            ${recommendations.map(rec => `
                <div class="rec-card">
                    <div class="rec-header">
                        <h4>${rec.name} (${rec.symbol})</h4>
                        <span class="rec-badge badge-${rec.badge}">
                            ${rec.badge === 'strong-buy' ? '強力買入' : rec.badge === 'buy' ? '買入' : '持有'}
                        </span>
                    </div>
                    <div style="margin: 1rem 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>AI評分</span>
                            <strong style="color: var(--primary);">${rec.score}/100</strong>
                        </div>
                        <div style="background: #e8f0fe; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: var(--primary); height: 100%; width: ${rec.score}%;"></div>
                        </div>
                    </div>
                    <p style="color: #666; font-size: 0.9rem;">${rec.reason}</p>
                    <button onclick="document.getElementById('stockInput').value='${rec.symbol}'; analyzeStock();" 
                            style="width: 100%; margin-top: 1rem; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer;">
                        查看詳細分析
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// 格式化價格
function formatPrice(price, currency) {
    if (currency === 'TWD') {
        return `NT$ ${price.toFixed(2)}`;
    } else if (currency === 'USD') {
        return `$ ${price.toFixed(2)}`;
    }
    return price.toFixed(2);
}

// 格式化成交量
function formatVolume(volume) {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    loadRecommendations();
    
    // Enter鍵觸發搜尋
    document.getElementById('stockInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') analyzeStock();
    });
});
