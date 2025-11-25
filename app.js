// 純前端實作 - 無需後端
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
let autoRefreshInterval;

// 載入台股大盤
async function loadMarketInfo() {
    try {
        const today = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${today}&type=ALLBUT0999`;
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        const data = await response.json();
        
        if (data.stat === 'OK') {
            const changeClass = parseFloat(data.data1[0][2]) >= 0 ? 'price-up' : 'price-down';
            const changeSymbol = parseFloat(data.data1[0][2]) >= 0 ? '▲' : '▼';
            
            document.getElementById('marketInfo').innerHTML = `
                <div class="info-item">
                    <div class="label">加權指數</div>
                    <div class="value">${data.data1[0][1]}</div>
                </div>
                <div class="info-item">
                    <div class="label">漲跌</div>
                    <div class="value ${changeClass}">${changeSymbol} ${data.data1[0][2]}</div>
                </div>
                <div class="info-item">
                    <div class="label">成交量 (億)</div>
                    <div class="value">${(parseFloat(data.data1[0][4]) / 100000000).toFixed(0)}</div>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('marketInfo').innerHTML = '<div class="error">載入失敗</div>';
    }
}

// 載入國際指數（Yahoo Finance API）
async function loadGlobalIndices() {
    const indices = [
        { name: '道瓊指數', symbol: '^DJI' },
        { name: 'S&P 500', symbol: '^GSPC' },
        { name: '那斯達克', symbol: '^IXIC' },
        { name: '日經指數', symbol: '^N225' },
        { name: '恆生指數', symbol: '^HSI' }
    ];
    
    let html = '';
    for (const idx of indices) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${idx.symbol}?interval=1d&range=1d`;
            const response = await fetch(url);
            const data = await response.json();
            const quote = data.chart.result[0].meta;
            const change = ((quote.regularMarketPrice - quote.previousClose) / quote.previousClose * 100).toFixed(2);
            const trendClass = parseFloat(change) >= 0 ? 'price-up' : 'price-down';
            const trendSymbol = parseFloat(change) >= 0 ? '▲' : '▼';
            
            html += `
                <div class="index-item">
                    <div class="index-name">${idx.name}</div>
                    <div class="index-value">${quote.regularMarketPrice.toFixed(2)}</div>
                    <div class="${trendClass}">${trendSymbol} ${change}%</div>
                </div>
            `;
        } catch (e) {
            html += `<div class="index-item"><div class="index-name">${idx.name}</div><div>N/A</div></div>`;
        }
    }
    document.getElementById('globalIndices').innerHTML = html;
}

// 載入虛擬貨幣
async function loadCryptoData() {
    try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,ripple,cardano&vs_currencies=usd&include_24hr_change=true';
        const response = await fetch(url);
        const data = await response.json();
        
        const cryptos = [
            { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
            { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
            { id: 'binancecoin', name: 'BNB', symbol: 'BNB' },
            { id: 'ripple', name: 'XRP', symbol: 'XRP' },
            { id: 'cardano', name: 'Cardano', symbol: 'ADA' }
        ];
        
        document.getElementById('cryptoData').innerHTML = cryptos.map(coin => {
            const price = data[coin.id]?.usd || 0;
            const change = data[coin.id]?.usd_24h_change?.toFixed(2) || 0;
            const changeClass = parseFloat(change) >= 0 ? 'price-up' : 'price-down';
            const changeSymbol = parseFloat(change) >= 0 ? '▲' : '▼';
            
            return `
                <div class="crypto-item">
                    <div class="crypto-name">${coin.name} (${coin.symbol})</div>
                    <div class="crypto-price">$${price.toLocaleString()}</div>
                    <div class="${changeClass}">${changeSymbol} ${change}%</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        document.getElementById('cryptoData').innerHTML = '<div class="error">載入失敗</div>';
    }
}

// 查詢個股
async function searchStock() {
    const symbol = document.getElementById('stockInput').value.trim();
    const market = document.getElementById('marketSelect').value;
    const resultDiv = document.getElementById('stockResult');
    
    if (!symbol) {
        resultDiv.innerHTML = '<div class="error">請輸入股票代號</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="loading">查詢中...</div>';
    document.getElementById('analysisResult').innerHTML = '';
    
    try {
        const today = new Date().toISOString().slice(0,10).replace(/-/g, '');
        let url;
        
        if (market === 'otc') {
            url = `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=${today.substring(0,7)}&stkno=${symbol}`;
        } else {
            url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${today}&stockNo=${symbol}`;
        }
        
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        const data = await response.json();
        
        if (data.stat === 'OK' && data.data && data.data.length > 0) {
            const latest = data.data[data.data.length - 1];
            const changeNum = parseFloat(latest[7]);
            const changeClass = changeNum >= 0 ? 'price-up' : 'price-down';
            const changeSymbol = changeNum >= 0 ? '▲' : '▼';
            
            resultDiv.innerHTML = `
                <div class="stock-detail">
                    <div class="stock-header">
                        <div>
                            <div class="stock-title">${data.title?.split(' ')[0] || symbol} (${symbol}) <span class="market-badge">${market === 'otc' ? '上櫃' : '上市'}</span></div>
                            <div style="color: #666; font-size: 14px;">${latest[0]}</div>
                        </div>
                        <div>
                            <div class="stock-price ${changeClass}">${latest[6]}</div>
                            <div class="${changeClass}" style="text-align: right;">${changeSymbol} ${latest[7]}</div>
                        </div>
                    </div>
                    <div class="stock-stats">
                        <div class="stat-item">
                            <div class="stat-label">開盤</div>
                            <div class="stat-value">${latest[3]}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">最高</div>
                            <div class="stat-value">${latest[4]}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">最低</div>
                            <div class="stat-value">${latest[5]}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">成交量</div>
                            <div class="stat-value">${(parseFloat(latest[1].replace(/,/g, '')) / 1000).toFixed(0)}K</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">成交筆數</div>
                            <div class="stat-value">${latest[8]}</div>
                        </div>
                    </div>
                </div>
            `;
            
            window.currentStockData = data.data.map(d => ({
                date: d[0],
                open: parseFloat(d[3]),
                high: parseFloat(d[4]),
                low: parseFloat(d[5]),
                close: parseFloat(d[6]),
                volume: parseInt(d[1].replace(/,/g, ''))
            }));
        } else {
            resultDiv.innerHTML = '<div class="error">查無此股票代號</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="error">查詢失敗，請稍後再試</div>';
    }
}

// AI 分析
async function analyzeStock() {
    const symbol = document.getElementById('stockInput').value.trim();
    const resultDiv = document.getElementById('analysisResult');
    
    if (!symbol || !window.currentStockData) {
        resultDiv.innerHTML = '<div class="error">請先查詢股票</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="loading">AI 分析中...</div>';
    
    const history = window.currentStockData;
    const latest = history[history.length - 1];
    const prices = history.map(d => d.close);
    
    // 計算技術指標
    const sma5 = calculateSMA(prices, 5);
    const sma20 = calculateSMA(prices, 20);
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);
    
    // 短線分析
    const shortTerm = analyzeShortTerm(latest, sma5, sma20, rsi, macd);
    
    // 長線分析
    const longTerm = analyzeLongTerm(prices, sma20, rsi);
    
    resultDiv.innerHTML = `
        <div class="analysis-container">
            <div class="analysis-header">
                <h3>🤖 AI 智能分析：${symbol}</h3>
                <div class="current-price">現價：${latest.close}</div>
            </div>
            
            <div class="indicators">
                <h4>技術指標</h4>
                <div class="indicator-grid">
                    <div class="indicator-item">
                        <span>5日均線</span>
                        <strong>${sma5.toFixed(2)}</strong>
                    </div>
                    <div class="indicator-item">
                        <span>20日均線</span>
                        <strong>${sma20.toFixed(2)}</strong>
                    </div>
                    <div class="indicator-item">
                        <span>RSI</span>
                        <strong>${rsi.toFixed(2)}</strong>
                    </div>
                    <div class="indicator-item">
                        <span>MACD</span>
                        <strong>${macd.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
            
            <div class="analysis-sections">
                <div class="analysis-box">
                    <h4>📉 短線分析 (${shortTerm.period})</h4>
                    <div class="signal-badge signal-${shortTerm.signal}">
                        ${shortTerm.signal === 'buy' ? '建議買入' : shortTerm.signal === 'sell' ? '建議賣出' : '觀望為主'}
                    </div>
                    <div class="confidence">信心指數：${shortTerm.confidence}</div>
                    <div class="price-targets">
                        <div class="target-item">
                            <span>建議買點</span>
                            <strong class="price-up">${shortTerm.buyPrice}</strong>
                        </div>
                        <div class="target-item">
                            <span>建議賣點</span>
                            <strong class="price-down">${shortTerm.sellPrice}</strong>
                        </div>
                        <div class="target-item">
                            <span>停損點</span>
                            <strong>${shortTerm.stopLoss}</strong>
                        </div>
                    </div>
                    <div class="reasons">
                        <strong>分析理由：</strong>
                        <ul>
                            ${shortTerm.reasons.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="analysis-box">
                    <h4>📊 長線分析 (${longTerm.period})</h4>
                    <div class="signal-badge signal-${longTerm.signal}">
                        ${longTerm.signal === 'buy' ? '建議佈局' : longTerm.signal === 'sell' ? '建議減碼' : '觀望為主'}
                    </div>
                    <div class="confidence">信心指數：${longTerm.confidence}</div>
                    <div class="trend-info">
                        <div>趨勢判斷：<strong>${longTerm.trend}</strong></div>
                        <div>目標價：<strong class="price-up">${longTerm.targetPrice}</strong></div>
                    </div>
                    <div class="reasons">
                        <strong>分析理由：</strong>
                        <ul>
                            ${longTerm.reasons.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="disclaimer">
                ⚠️ 免責聲明：本分析僅供參考，不構成投資建議。投資有風險，請謹慎評估。
            </div>
        </div>
    `;
}

// 技術指標計算函數
function calculateSMA(prices, period) {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

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
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    return ema12 - ema26;
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
}

function analyzeShortTerm(latest, sma5, sma20, rsi, macd) {
    let signal = 'hold';
    let confidence = 50;
    let buyPrice = latest.close * 0.98;
    let sellPrice = latest.close * 1.02;
    let stopLoss = latest.close * 0.95;
    let reasons = [];
    
    if (latest.close > sma5 && sma5 > sma20) {
        signal = 'buy';
        confidence += 15;
        reasons.push('短均線上穿長均線，多頭排列');
    } else if (latest.close < sma5 && sma5 < sma20) {
        signal = 'sell';
        confidence += 15;
        reasons.push('短均線下穿長均線，空頭排列');
    }
    
    if (rsi < 30) {
        signal = 'buy';
        confidence += 20;
        reasons.push('RSI超賣，反彈機會大');
    } else if (rsi > 70) {
        signal = 'sell';
        confidence += 20;
        reasons.push('RSI超買，回調風險高');
    }
    
    if (macd > 0) {
        confidence += 10;
        reasons.push('MACD正值，動能向上');
    }
    
    return {
        signal: signal,
        confidence: Math.min(confidence, 95) + '%',
        buyPrice: buyPrice.toFixed(2),
        sellPrice: sellPrice.toFixed(2),
        stopLoss: stopLoss.toFixed(2),
        period: '1-5天',
        reasons: reasons
    };
}

function analyzeLongTerm(prices, sma20, rsi) {
    const trend = prices[prices.length - 1] > sma20 ? 'up' : 'down';
    let signal = 'hold';
    let confidence = 50;
    let targetPrice = prices[prices.length - 1] * 1.15;
    let reasons = [];
    
    if (trend === 'up' && rsi < 60) {
        signal = 'buy';
        confidence = 75;
        reasons.push('價格站穩月線，趨勢向上');
        reasons.push('RSI未過熱，仍有上漲空間');
    } else if (trend === 'down' && rsi > 50) {
        signal = 'sell';
        confidence = 70;
        reasons.push('價格跌破月線，趨勢轉弱');
    } else {
        reasons.push('盤整格局，建議觀望');
    }
    
    return {
        signal: signal,
        confidence: Math.min(confidence, 90) + '%',
        targetPrice: targetPrice.toFixed(2),
        period: '20-60天',
        trend: trend === 'up' ? '上升趨勢' : '下降趨勢',
        reasons: reasons
    };
}

// 載入漲跌排行
async function loadTopMovers() {
    try {
        const today = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${today}&type=MS`;
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        const data = await response.json();
        
        if (data.stat === 'OK' && data.data9) {
            document.getElementById('gainers').innerHTML = data.data9.slice(0, 10).map(stock => `
                <div class="mover-item">
                    <div class="mover-info">
                        <div class="mover-symbol">${stock[0]}</div>
                        <div class="mover-name">${stock[1]}</div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">${stock[2]}</div>
                        <div class="mover-change price-up">▲ ${stock[3]}</div>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('losers').innerHTML = data.data9.slice(-10).reverse().map(stock => `
                <div class="mover-item">
                    <div class="mover-info">
                        <div class="mover-symbol">${stock[0]}</div>
                        <div class="mover-name">${stock[1]}</div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">${stock[2]}</div>
                        <div class="mover-change price-down">▼ ${stock[3]}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        document.getElementById('gainers').innerHTML = '<div class="error">載入失敗</div>';
        document.getElementById('losers').innerHTML = '<div class="error">載入失敗</div>';
    }
}

// 自動更新
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadMarketInfo();
        loadGlobalIndices();
        loadCryptoData();
    }, 60000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('stockInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchStock();
    });
    
    loadMarketInfo();
    loadGlobalIndices();
    loadCryptoData();
    loadTopMovers();
    startAutoRefresh();
});

window.addEventListener('beforeunload', stopAutoRefresh);
