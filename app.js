// 請將此處替換為您的 Google Apps Script 部署網址
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
let autoRefreshInterval;

// 載入大盤資訊
async function loadMarketInfo() {
    try {
        const response = await fetch(`${API_URL}?action=getMarket`);
        const data = await response.json();
        
        if (data.error) {
            document.getElementById('marketInfo').innerHTML = `<div class="error">${data.error}</div>`;
            return;
        }
        
        const changeClass = parseFloat(data.change) >= 0 ? 'price-up' : 'price-down';
        const changeSymbol = parseFloat(data.change) >= 0 ? '▲' : '▼';
        
        document.getElementById('marketInfo').innerHTML = `
            <div class="info-item">
                <div class="label">加權指數</div>
                <div class="value">${data.index}</div>
            </div>
            <div class="info-item">
                <div class="label">漲跌</div>
                <div class="value ${changeClass}">${changeSymbol} ${data.change}</div>
            </div>
            <div class="info-item">
                <div class="label">成交量 (億)</div>
                <div class="value">${(parseFloat(data.volume) / 100000000).toFixed(0)}</div>
            </div>
        `;
    } catch (error) {
        document.getElementById('marketInfo').innerHTML = `<div class="error">載入失敗</div>`;
    }
}

// 載入國際指數
async function loadGlobalIndices() {
    try {
        const response = await fetch(`${API_URL}?action=getGlobalIndices`);
        const data = await response.json();
        
        if (data.indices) {
            document.getElementById('globalIndices').innerHTML = data.indices.map(idx => {
                const trendClass = idx.trend === 'up' ? 'price-up' : 'price-down';
                const trendSymbol = idx.trend === 'up' ? '▲' : '▼';
                return `
                    <div class="index-item">
                        <div class="index-name">${idx.name}</div>
                        <div class="index-value">${idx.value}</div>
                        <div class="${trendClass}">${trendSymbol} ${idx.change}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        document.getElementById('globalIndices').innerHTML = '<div class="error">載入失敗</div>';
    }
}

// 載入虛擬貨幣
async function loadCryptoData() {
    try {
        const response = await fetch(`${API_URL}?action=getCrypto`);
        const data = await response.json();
        
        if (data.crypto) {
            document.getElementById('cryptoData').innerHTML = data.crypto.map(coin => {
                const changeClass = parseFloat(coin.change) >= 0 ? 'price-up' : 'price-down';
                const changeSymbol = parseFloat(coin.change) >= 0 ? '▲' : '▼';
                return `
                    <div class="crypto-item">
                        <div class="crypto-name">${coin.name} (${coin.symbol})</div>
                        <div class="crypto-price">$${coin.price.toLocaleString()}</div>
                        <div class="${changeClass}">${changeSymbol} ${coin.change}%</div>
                    </div>
                `;
            }).join('');
        }
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
        const response = await fetch(`${API_URL}?action=getStock&symbol=${symbol}&market=${market}`);
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">${data.error}</div>`;
            return;
        }
        
        const changeNum = parseFloat(data.change);
        const changeClass = changeNum >= 0 ? 'price-up' : 'price-down';
        const changeSymbol = changeNum >= 0 ? '▲' : '▼';
        
        resultDiv.innerHTML = `
            <div class="stock-detail">
                <div class="stock-header">
                    <div>
                        <div class="stock-title">${data.name} (${data.symbol}) <span class="market-badge">${data.market}</span></div>
                        <div style="color: #666; font-size: 14px;">${data.date}</div>
                    </div>
                    <div>
                        <div class="stock-price ${changeClass}">${data.close}</div>
                        <div class="${changeClass}" style="text-align: right;">${changeSymbol} ${data.change}</div>
                    </div>
                </div>
                <div class="stock-stats">
                    <div class="stat-item">
                        <div class="stat-label">開盤</div>
                        <div class="stat-value">${data.open}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">最高</div>
                        <div class="stat-value">${data.high}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">最低</div>
                        <div class="stat-value">${data.low}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">成交量</div>
                        <div class="stat-value">${(parseFloat(data.volume.replace(/,/g, '')) / 1000).toFixed(0)}K</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">成交筆數</div>
                        <div class="stat-value">${data.transaction}</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = '<div class="error">查詢失敗，請稍後再試</div>';
    }
}

// 載入漲跌排行
async function loadTopMovers() {
    try {
        const response = await fetch(`${API_URL}?action=getTopMovers`);
        const data = await response.json();
        
        if (data.gainers && data.gainers.length > 0) {
            document.getElementById('gainers').innerHTML = data.gainers.map(stock => `
                <div class="mover-item">
                    <div class="mover-info">
                        <div class="mover-symbol">${stock.symbol}</div>
                        <div class="mover-name">${stock.name}</div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">${stock.close}</div>
                        <div class="mover-change price-up">▲ ${stock.change}</div>
                    </div>
                </div>
            `).join('');
        }
        
        if (data.losers && data.losers.length > 0) {
            document.getElementById('losers').innerHTML = data.losers.map(stock => `
                <div class="mover-item">
                    <div class="mover-info">
                        <div class="mover-symbol">${stock.symbol}</div>
                        <div class="mover-name">${stock.name}</div>
                    </div>
                    <div>
                        <div style="font-weight: bold;">${stock.close}</div>
                        <div class="mover-change price-down">▼ ${stock.change}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        document.getElementById('gainers').innerHTML = '<div class="error">載入失敗</div>';
        document.getElementById('losers').innerHTML = '<div class="error">載入失敗</div>';
    }
}

// AI 分析
async function analyzeStock() {
    const symbol = document.getElementById('stockInput').value.trim();
    const market = document.getElementById('marketSelect').value;
    const resultDiv = document.getElementById('analysisResult');
    
    if (!symbol) {
        resultDiv.innerHTML = '<div class="error">請輸入股票代號</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="loading">AI 分析中...</div>';
    
    try {
        const response = await fetch(`${API_URL}?action=getAnalysis&symbol=${symbol}&market=${market}`);
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">${data.error}</div>`;
            return;
        }
        
        resultDiv.innerHTML = `
            <div class="analysis-container">
                <div class="analysis-header">
                    <h3>🤖 AI 智能分析：${data.name} (${data.symbol})</h3>
                    <div class="current-price">現價：${data.currentPrice}</div>
                </div>
                
                <div class="indicators">
                    <h4>技術指標</h4>
                    <div class="indicator-grid">
                        <div class="indicator-item">
                            <span>5日均線</span>
                            <strong>${data.indicators.sma5}</strong>
                        </div>
                        <div class="indicator-item">
                            <span>20日均線</span>
                            <strong>${data.indicators.sma20}</strong>
                        </div>
                        <div class="indicator-item">
                            <span>RSI</span>
                            <strong>${data.indicators.rsi}</strong>
                        </div>
                        <div class="indicator-item">
                            <span>MACD</span>
                            <strong>${data.indicators.macd}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-sections">
                    <div class="analysis-box">
                        <h4>📉 短線分析 (${data.shortTerm.period})</h4>
                        <div class="signal-badge signal-${data.shortTerm.signal}">
                            ${data.shortTerm.signal === 'buy' ? '建議買入' : data.shortTerm.signal === 'sell' ? '建議賣出' : '觀望為主'}
                        </div>
                        <div class="confidence">信心指數：${data.shortTerm.confidence}</div>
                        <div class="price-targets">
                            <div class="target-item">
                                <span>建議買點</span>
                                <strong class="price-up">${data.shortTerm.buyPrice}</strong>
                            </div>
                            <div class="target-item">
                                <span>建議賣點</span>
                                <strong class="price-down">${data.shortTerm.sellPrice}</strong>
                            </div>
                            <div class="target-item">
                                <span>停損點</span>
                                <strong>${data.shortTerm.stopLoss}</strong>
                            </div>
                        </div>
                        <div class="reasons">
                            <strong>分析理由：</strong>
                            <ul>
                                ${data.shortTerm.reasons.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="analysis-box">
                        <h4>📊 長線分析 (${data.longTerm.period})</h4>
                        <div class="signal-badge signal-${data.longTerm.signal}">
                            ${data.longTerm.signal === 'buy' ? '建議佈局' : data.longTerm.signal === 'sell' ? '建議減碼' : '觀望為主'}
                        </div>
                        <div class="confidence">信心指數：${data.longTerm.confidence}</div>
                        <div class="trend-info">
                            <div>趨勢判斷：<strong>${data.longTerm.trend}</strong></div>
                            <div>目標價：<strong class="price-up">${data.longTerm.targetPrice}</strong></div>
                        </div>
                        <div class="reasons">
                            <strong>分析理由：</strong>
                            <ul>
                                ${data.longTerm.reasons.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="disclaimer">
                    ⚠️ 免責聲明：本分析僅供參考，不構成投資建議。投資有風險，請謹慎評估。
                </div>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = '<div class="error">分析失敗，請稍後再試</div>';
    }
}

// 自動更新儀表板
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadMarketInfo();
        loadGlobalIndices();
        loadCryptoData();
    }, 60000); // 每 60 秒更新
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

// Enter 鍵查詢
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
