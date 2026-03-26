// ----------------------------
// Breaker Monitoring Dashboard JS - Large Font Version
// ----------------------------

// Data storage for graphs (stores last 20 readings)
let tempHistory = [];
let currentHistory = [];
const MAX_HISTORY = 20;

// Get canvas elements
let tempCanvas, currentCanvas;
let tempCtx, currentCtx;

// Initialize graphs
function initGraphs() {
  tempCanvas = document.getElementById("tempGraph");
  currentCanvas = document.getElementById("currentGraph");
  
  if (tempCanvas && currentCanvas) {
    tempCtx = tempCanvas.getContext("2d");
    currentCtx = currentCanvas.getContext("2d");
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      const tempContainer = tempCanvas.parentElement;
      const currentContainer = currentCanvas.parentElement;
      const width = tempContainer.clientWidth;
      tempCanvas.width = width;
      tempCanvas.height = 50;
      currentCanvas.width = width;
      currentCanvas.height = 50;
      drawGraphs();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
}

// Draw minimal line graph (just the line, no background)
function drawMinimalGraph(ctx, data, color, maxValue) {
  if (!ctx || data.length === 0) return;
  
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  // Clear canvas completely
  ctx.clearRect(0, 0, width, height);
  
  // Draw the line only
  if (data.length >= 2) {
    const step = width / (data.length - 1);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let firstPoint = true;
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      // Map data value to y coordinate (0 = bottom, maxValue = top)
      const y = height - (data[i] / maxValue) * height;
      const clampedY = Math.max(0, Math.min(height, y));
      
      if (firstPoint) {
        ctx.moveTo(x, clampedY);
        firstPoint = false;
      } else {
        ctx.lineTo(x, clampedY);
      }
    }
    ctx.stroke();
  }
}

// Update both graphs
function drawGraphs() {
  if (tempCtx) {
    drawMinimalGraph(tempCtx, tempHistory, "#0ea5e9", 100);
  }
  if (currentCtx) {
    drawMinimalGraph(currentCtx, currentHistory, "#facc15", 30);
  }
}

// Helper: formatted full date and time
function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper: formatted date only for notes
function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: formatted time only
function getFormattedTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Generate realistic sensor data
function getRandomSensorData() {
  let temp = 25 + Math.random() * 58;
  let current = 3 + Math.random() * 19;
  
  if (Math.random() < 0.12) {
    temp = 72 + Math.random() * 18;
    current = 17 + Math.random() * 9;
  } else if (Math.random() < 0.18) {
    temp = 52 + Math.random() * 18;
    current = 13 + Math.random() * 7;
  }
  
  temp = Math.min(95, parseFloat(temp.toFixed(1)));
  current = Math.min(30, parseFloat(current.toFixed(1)));
  
  let breakerState = "Normal";
  if (temp > 72 || current > 21) breakerState = "Overheating";
  else if (temp > 62 || current > 17) breakerState = "Overload";
  else if (temp > 48 || current > 13) breakerState = "Potential Overload";
  else breakerState = "Normal";
  
  if (temp > 78) breakerState = "Overheating";
  if (current > 23) breakerState = "Overheating";
  
  return {
    temperature: temp,
    current: current,
    breakerState: breakerState,
    systemStatus: "Online",
    timestamp: getFormattedDateTime(),
    date: getFormattedDate(),
    time: getFormattedTime()
  };
}

// MITIGATION & SUGGESTION ENGINE
function generateMitigation(temp, current, breakerState) {
  let suggestion = "";
  let action = "";
  let riskLevel = "normal";
  let riskLabel = "✅ NORMAL";
  
  if (breakerState === "Overheating" || temp > 75 || current > 22) {
    riskLevel = "critical";
    riskLabel = "⚠️ CRITICAL";
    suggestion = `🔥 CRITICAL: ${temp}°C / ${current}A - Immediate intervention required!`;
    action = `🚨 EMERGENCY: Isolate circuit immediately!`;
  } 
  else if (breakerState === "Overload" || temp > 62 || current > 17) {
    riskLevel = "caution";
    riskLabel = "⚠️ CAUTION";
    suggestion = `⚠️ WARNING: ${temp}°C / ${current}A - Approaching limits. Reduce load now.`;
    action = `⚙️ Shed non-critical loads immediately`;
  } 
  else if (breakerState === "Potential Overload") {
    riskLevel = "caution";
    riskLabel = "🟡 WATCH";
    suggestion = `📈 TREND: ${temp}°C / ${current}A - Potential overload developing.`;
    action = `🛠️ Reduce load by 15-20% proactively`;
  }
  else {
    riskLevel = "normal";
    riskLabel = "🟢 NORMAL";
    if (temp > 45 || current > 11) {
      suggestion = `✅ SAFE: ${temp}°C, ${current}A - Operating within normal range.`;
      action = `📊 Continue monitoring`;
    } else {
      suggestion = `🌿 OPTIMAL: ${temp}°C, ${current}A - All systems nominal.`;
      action = `🔍 Routine inspection recommended`;
    }
  }
  
  return { suggestion, action, riskLevel, riskLabel };
}

// Update mitigation UI
function updateMitigationUI(temp, current, breakerState) {
  const { suggestion, action, riskLevel, riskLabel } = generateMitigation(temp, current, breakerState);
  const suggestionDiv = document.getElementById("suggestion-main");
  const actionSpan = document.getElementById("action-text");
  const riskContainer = document.getElementById("risk-badge-container");
  const mitiCard = document.getElementById("mitigationCard");
  
  if (suggestionDiv) suggestionDiv.innerHTML = `💡 ${suggestion}`;
  if (actionSpan) actionSpan.innerText = action;
  
  let badgeHtml = `<span class="risk-badge-compact ${riskLevel === 'critical' ? 'risk-high' : (riskLevel === 'caution' ? 'risk-mid' : 'risk-normal')}">${riskLabel}</span>`;
  if (riskContainer) riskContainer.innerHTML = badgeHtml;
  
  if (mitiCard) {
    if (riskLevel === 'critical') mitiCard.style.borderLeftColor = "#ef4444";
    else if (riskLevel === 'caution') mitiCard.style.borderLeftColor = "#f97316";
    else mitiCard.style.borderLeftColor = "#22c55e";
  }
}

// Dashboard update
let historyData = [];

function updateDashboard(data) {
  // Update history arrays for graphs
  tempHistory.push(data.temperature);
  currentHistory.push(data.current);
  
  // Keep only last MAX_HISTORY readings
  if (tempHistory.length > MAX_HISTORY) tempHistory.shift();
  if (currentHistory.length > MAX_HISTORY) currentHistory.shift();
  
  // Redraw graphs
  drawGraphs();
  
  // Temperature display with full date and time
  document.getElementById("temperature-value").textContent = data.temperature;
  document.getElementById("temperature-note").textContent = `${data.date} ${data.time}`;
  
  // Current display with full date and time
  document.getElementById("current-value").textContent = data.current;
  document.getElementById("current-note").textContent = `${data.date} ${data.time}`;
  
  // Breaker State with full date and time
  const breakerEl = document.getElementById("breaker-state");
  breakerEl.textContent = data.breakerState;
  breakerEl.className = `kpi__value state ${data.breakerState.replace(/ /g, '\\ ')}`;
  
  const indicator = document.getElementById("breaker-indicator");
  if (indicator) {
    indicator.className = "breaker-status-indicator";
    if (data.breakerState === "Normal") indicator.classList.add("normal-bg");
    else if (data.breakerState === "Overload") indicator.classList.add("overload-bg");
    else if (data.breakerState === "Potential Overload") indicator.classList.add("potential-bg");
    else if (data.breakerState === "Overheating") indicator.classList.add("overheating-bg");
  }
  
  document.getElementById("state-note").textContent = `${data.date} ${data.time}`;
  
  // System Status in Header
  const statusHeader = document.getElementById("system-status-header");
  if (statusHeader) {
    statusHeader.textContent = data.systemStatus;
  }
  
  // Update Mitigation
  updateMitigationUI(data.temperature, data.current, data.breakerState);
  
  // Add to history
  addHistoryRow(data);
  saveToFullHistory(data);
}

function addHistoryRow(data) {
  historyData.unshift(data);
  if (historyData.length > 10) historyData.pop();
  const logBody = document.getElementById("log-body");
  if (!logBody) return;
  logBody.innerHTML = "";
  historyData.forEach(entry => {
    const row = document.createElement("tr");
    let stateDisplay = entry.breakerState;
    if (entry.breakerState === "Overheating") {
      stateDisplay = "🔥 Overheating";
    } else if (entry.breakerState === "Overload") {
      stateDisplay = "⚠️ Overload";
    } else if (entry.breakerState === "Potential Overload") {
      stateDisplay = "⚡ Potential Overload";
    } else {
      stateDisplay = "✅ Normal";
    }
    
    row.innerHTML = `
      <td>${entry.timestamp}</td>
      <td><strong>${entry.temperature}</strong></td>
      <td><strong>${entry.current}</strong></td>
      <td style="font-weight: 700;">${stateDisplay}</td>
      <td>${entry.systemStatus}</td>
    `;
    logBody.appendChild(row);
  });
}

function saveToFullHistory(data) {
  const fullHistory = JSON.parse(localStorage.getItem('breakerFullHistory')) || [];
  fullHistory.push(data);
  if (fullHistory.length > 500) fullHistory.shift();
  localStorage.setItem('breakerFullHistory', JSON.stringify(fullHistory));
}

function refreshDashboard() {
  const sensorData = getRandomSensorData();
  updateDashboard(sensorData);
}

// Initialize graphs when page loads
window.addEventListener('load', () => {
  initGraphs();
  refreshDashboard();
});

// Auto-refresh every 2 seconds
let intervalId = setInterval(refreshDashboard, 2000);

// Manual refresh
const refreshBtn = document.getElementById("refresh-btn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    refreshDashboard();
    const btn = refreshBtn;
    btn.style.transform = "scale(0.97)";
    setTimeout(() => { btn.style.transform = ""; }, 120);
  });
}

// Cleanup
window.addEventListener("beforeunload", () => {
  if (intervalId) clearInterval(intervalId);
});

// Add at the top of your dashboard.js file
const BACKEND_URL = 'http://localhost:5000';  // Change to your Flask server URL

// Alert tracking to prevent spam
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 300000; // 5 minutes between alerts

// Function to send alert to backend
async function sendAlertToBackend(temperature, current, breakerState) {
    const currentTime = Date.now();
    
    // Only send alerts for critical conditions
    const shouldAlert = breakerState === "Overheating" || 
                        temperature > 75 || 
                        current > 23 ||
                        (breakerState === "Overload" && (temperature > 62 || current > 17));
    
    if (!shouldAlert) {
        return;
    }
    
    // Check cooldown
    if (currentTime - lastAlertTime < ALERT_COOLDOWN_MS) {
        console.log("Alert cooldown active, skipping...");
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/check-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                temperature: temperature,
                current: current,
                ambient_temp_c: 25.0,  // You can make this dynamic
                thermal_slope: 0.0,     // You can calculate this from history
                current_slope: 0.0      // You can calculate this from history
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.alert_sent) {
            lastAlertTime = currentTime;
            console.log("Alert sent:", result.messages);
            
            // Show a toast notification on the dashboard
            showAlertNotification(result.messages.join(", "));
        } else if (result.success && !result.alert_sent) {
            console.log("No alert needed:", result.messages);
        } else {
            console.error("Alert API error:", result.error);
        }
        
    } catch (error) {
        console.error("Failed to send alert to backend:", error);
    }
}

// Toast notification function
function showAlertNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'alert-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            min-width: 300px;
            border-left: 4px solid #ffd700;
        ">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">⚠️</span>
                <div>
                    <div style="font-size: 16px; margin-bottom: 4px;">Email Alert Sent!</div>
                    <div style="font-size: 14px; opacity: 0.9;">${message}</div>
                </div>
            </div>
        </div>
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Modify your existing updateDashboard function to include alert sending
// Replace your current updateDashboard function with this enhanced version
function updateDashboard(data) {
    // Update history arrays for graphs
    tempHistory.push(data.temperature);
    currentHistory.push(data.current);
    
    // Keep only last MAX_HISTORY readings
    if (tempHistory.length > MAX_HISTORY) tempHistory.shift();
    if (currentHistory.length > MAX_HISTORY) currentHistory.shift();
    
    // Redraw graphs
    drawGraphs();
    
    // Temperature display with full date and time
    document.getElementById("temperature-value").textContent = data.temperature;
    document.getElementById("temperature-note").textContent = `${data.date} ${data.time}`;
    
    // Current display with full date and time
    document.getElementById("current-value").textContent = data.current;
    document.getElementById("current-note").textContent = `${data.date} ${data.time}`;
    
    // Breaker State with full date and time
    const breakerEl = document.getElementById("breaker-state");
    breakerEl.textContent = data.breakerState;
    breakerEl.className = `kpi__value state ${data.breakerState.replace(/ /g, '\\ ')}`;
    
    const indicator = document.getElementById("breaker-indicator");
    if (indicator) {
        indicator.className = "breaker-status-indicator";
        if (data.breakerState === "Normal") indicator.classList.add("normal-bg");
        else if (data.breakerState === "Overload") indicator.classList.add("overload-bg");
        else if (data.breakerState === "Potential Overload") indicator.classList.add("potential-bg");
        else if (data.breakerState === "Overheating") indicator.classList.add("overheating-bg");
    }
    
    document.getElementById("state-note").textContent = `${data.date} ${data.time}`;
    
    // System Status in Header
    const statusHeader = document.getElementById("system-status-header");
    if (statusHeader) {
        statusHeader.textContent = data.systemStatus;
    }
    
    // Update Mitigation
    updateMitigationUI(data.temperature, data.current, data.breakerState);
    
    // NEW: Send alert to backend for critical conditions
    sendAlertToBackend(data.temperature, data.current, data.breakerState);
    
    // Add to history
    addHistoryRow(data);
    saveToFullHistory(data);
}