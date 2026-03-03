const ratedPower = 100;
const labels = [];
const powerHistory = [];
const stabilityHistory = [];
let chart;
let currentTheme = "space";
let currentPrediction = "Optimal Performance";

const metricEls = {
    voltage: document.getElementById("voltage"),
    current: document.getElementById("current"),
    power: document.getElementById("power"),
    temperature: document.getElementById("temperature"),
    expected: document.getElementById("expected"),
    efficiency: document.getElementById("efficiency")
};

const statusCard = document.getElementById("statusCard");
const statusText = document.getElementById("statusText");
const predictiveMessage = document.getElementById("predictiveMessage");
const ttfEstimate = document.getElementById("ttfEstimate");
const anomalyMessage = document.getElementById("anomalyMessage");
const warningIcon = document.getElementById("warningIcon");

const healthGauge = document.getElementById("healthGauge");
const healthScoreEl = document.getElementById("healthScore");
const predictionStateEl = document.getElementById("predictionState");
const predictionTransitionEl = document.getElementById("predictionTransition");
const aiScan = document.getElementById("aiScan");
const twinZone = document.querySelector(".zone-twin");
const energyBridge = document.getElementById("energyBridge");

const syncAccuracyEl = document.getElementById("syncAccuracy");
const aiConfidenceEl = document.getElementById("aiConfidence");
const predictionConfidenceEl = document.getElementById("predictionConfidence");

const sunlightInput = document.getElementById("sunlight");
const dustInput = document.getElementById("dust");
const tempInput = document.getElementById("manualTemp");

const sunlightVal = document.getElementById("sunlightVal");
const dustVal = document.getElementById("dustVal");
const tempVal = document.getElementById("tempVal");

const themeBtn = document.getElementById("themeBtn");
const presentationBtn = document.getElementById("presentationBtn");
const closeOverlayBtn = document.getElementById("closeOverlayBtn");
const overlay = document.getElementById("overlay");
const particlesHost = document.getElementById("particles");

const contactSupportBtn = document.getElementById("contactSupportBtn");
const generateReportBtn = document.getElementById("generateReportBtn");
const requestTechBtn = document.getElementById("requestTechBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const supportBadge = document.getElementById("supportBadge");
const supportChat = document.getElementById("supportChat");
const closeChatBtn = document.getElementById("closeChatBtn");
const chatBody = document.getElementById("chatBody");
const chatTyping = document.getElementById("chatTyping");

const predictionItems = {
    "Optimal Performance": document.getElementById("pred-optimal"),
    "Cleaning Recommended": document.getElementById("pred-cleaning"),
    "Performance Degradation Detected": document.getElementById("pred-degrading"),
    "Maintenance Required Within 72 Hours": document.getElementById("pred-maintenance"),
    "Critical Failure Risk": document.getElementById("pred-critical")
};

function animateNumber(element, targetValue, decimals = 2) {
    const startValue = parseFloat(element.dataset.value || "0");
    const delta = targetValue - startValue;
    const duration = 420;
    const start = performance.now();

    function frame(time) {
        const progress = Math.min((time - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = startValue + delta * eased;
        element.textContent = value.toFixed(decimals);
        if (progress < 1) {
            requestAnimationFrame(frame);
            return;
        }
        element.dataset.value = String(targetValue);
    }

    requestAnimationFrame(frame);
}

function animateRollingValue(element, targetValue, decimals = 2) {
    const steps = 8;
    const startValue = parseFloat(element.dataset.value || "0");
    const diff = targetValue - startValue;
    let step = 0;
    const timer = setInterval(() => {
        step += 1;
        const nextValue = startValue + diff * (step / steps);
        element.textContent = nextValue.toFixed(decimals);
        if (step >= steps) {
            element.textContent = targetValue.toFixed(decimals);
            element.dataset.value = String(targetValue);
            clearInterval(timer);
        }
    }, 36);
}

function animateRollingPercent(element, targetValue, decimals = 1) {
    const steps = 8;
    const rawStart = parseFloat(String(element.dataset.value || element.textContent).replace("%", "")) || 0;
    const diff = targetValue - rawStart;
    let step = 0;
    const timer = setInterval(() => {
        step += 1;
        const nextValue = rawStart + diff * (step / steps);
        element.textContent = `${nextValue.toFixed(decimals)}%`;
        if (step >= steps) {
            element.textContent = `${targetValue.toFixed(decimals)}%`;
            element.dataset.value = String(targetValue);
            clearInterval(timer);
        }
    }, 36);
}

function updateSliderLabels() {
    sunlightVal.textContent = Number(sunlightInput.value).toFixed(2);
    dustVal.textContent = Number(dustInput.value).toFixed(2);
    tempVal.textContent = `${Number(tempInput.value).toFixed(0)}°C`;
}

function setStatus(type, message) {
    statusCard.classList.remove("normal", "fault");
    statusCard.classList.add(type);
    statusText.textContent = message;
    warningIcon.style.display = type === "fault" ? "inline-block" : "none";
}

function createParticles() {
    particlesHost.innerHTML = "";
    for (let i = 0; i < 42; i += 1) {
        const particle = document.createElement("span");
        particle.className = "particle";
        const size = Math.random() * 2.6 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100 + 10}%`;
        particle.style.animationDuration = `${10 + Math.random() * 12}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.opacity = String(0.3 + Math.random() * 0.7);
        particlesHost.appendChild(particle);
    }
}

function getInstabilityFactor(actualPower) {
    stabilityHistory.push(actualPower);
    if (stabilityHistory.length > 8) {
        stabilityHistory.shift();
    }

    if (stabilityHistory.length < 3) {
        return 0;
    }

    let totalDelta = 0;
    for (let i = 1; i < stabilityHistory.length; i += 1) {
        totalDelta += Math.abs(stabilityHistory[i] - stabilityHistory[i - 1]);
    }
    const avgDelta = totalDelta / (stabilityHistory.length - 1);
    return Math.min(18, avgDelta * 2.4);
}

function computeHealthModel({ voltage, current, expectedVoltage, expectedCurrent, efficiency, temp, dust, sunlight, instability }) {
    const voltageDeviation = Math.min(1, Math.abs(voltage - expectedVoltage) / Math.max(1, expectedVoltage));
    const currentDeviation = Math.min(1, Math.abs(current - expectedCurrent) / Math.max(1, expectedCurrent));

    const voltageScore = (1 - voltageDeviation) * 100;
    const currentScore = (1 - currentDeviation) * 100;
    const efficiencyScore = Math.max(0, Math.min(100, efficiency));
    const sunlightScore = 70 + sunlight * 30;

    const weightedPerformance = (
        voltageScore * 0.24 +
        currentScore * 0.22 +
        efficiencyScore * 0.32 +
        sunlightScore * 0.22
    );

    const temperaturePenalty = Math.max(0, (temp - 45) * 1.35);
    const dustPenalty = dust * 42;
    const healthScore = Math.max(0, Math.min(100, weightedPerformance - temperaturePenalty - dustPenalty - instability));

    return {
        healthScore,
        temperaturePenalty,
        dustPenalty,
        instability
    };
}

function getPredictionState({ healthScore, temp, dust, efficiency }) {
    if (healthScore < 45 || temp > 63) {
        return {
            state: "Critical Failure Risk",
            detail: "Immediate intervention required by AI diagnostics core",
            ttf: "Time-to-failure: 12-24h"
        };
    }
    if (healthScore < 60 || temp > 58) {
        return {
            state: "Maintenance Required Within 72 Hours",
            detail: "Thermal stress profile exceeds nominal tolerance",
            ttf: "Time-to-failure: 48-72h"
        };
    }
    if (healthScore < 75 || efficiency < 84) {
        return {
            state: "Performance Degradation Detected",
            detail: "Efficiency trend indicates component aging pattern",
            ttf: "Time-to-failure: 120-168h"
        };
    }
    if (dust > 0.22 || healthScore < 82) {
        return {
            state: "Cleaning Recommended",
            detail: "Surface contamination is reducing conversion yield",
            ttf: "Time-to-failure: 168-220h"
        };
    }
    return {
        state: "Optimal Performance",
        detail: "AI model reports all systems within expected envelope",
        ttf: "Time-to-failure: >240h"
    };
}

function updatePredictionUI(prediction) {
    Object.values(predictionItems).forEach((item) => item.classList.remove("active"));
    const active = predictionItems[prediction.state];
    if (active) {
        active.classList.add("active");
    }

    if (currentPrediction !== prediction.state) {
        predictionStateEl.classList.add("switching");
        aiScan.classList.remove("active");
        void aiScan.offsetWidth;
        aiScan.classList.add("active");
        setTimeout(() => {
            predictionStateEl.textContent = prediction.state;
            predictionStateEl.classList.remove("switching");
            predictionTransitionEl.textContent = prediction.detail;
        }, 160);
        currentPrediction = prediction.state;
    } else {
        predictionTransitionEl.textContent = prediction.detail;
    }
}

function updateHealthGauge(score) {
    healthGauge.style.setProperty("--score", score.toFixed(2));
    healthGauge.classList.remove("healthy", "degrading", "critical");

    if (score >= 80) {
        healthGauge.classList.add("healthy");
    } else if (score >= 60) {
        healthGauge.classList.add("degrading");
    } else {
        healthGauge.classList.add("critical");
    }

    animateRollingValue(healthScoreEl, score, 0);
}

function addChatMessage(type, text) {
    const message = document.createElement("div");
    message.className = `chat-msg ${type}`;
    message.textContent = text;
    chatBody.appendChild(message);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function botRespond(state) {
    chatTyping.classList.add("show");
    const responses = {
        "Optimal Performance": "System healthy. Live model forecasts stable generation over next 24h.",
        "Cleaning Recommended": "Panel surface cleaning is recommended to restore peak output.",
        "Performance Degradation Detected": "Minor degradation detected. Monitoring and report generation advised.",
        "Maintenance Required Within 72 Hours": "Maintenance has been prioritized. Schedule service within 72 hours.",
        "Critical Failure Risk": "Overheating/failure risk is critical. Dispatch technician immediately."
    };

    setTimeout(() => {
        chatTyping.classList.remove("show");
        addChatMessage("bot", responses[state] || "Telemetry acknowledged.");
    }, 1100);
}

function triggerAnomaly(actualPower) {
    const previous = powerHistory.length > 0 ? powerHistory[powerHistory.length - 1] : actualPower;
    const suddenDrop = previous > 0 && actualPower < previous * 0.75;
    anomalyMessage.classList.toggle("show", suddenDrop);
}

function updateTwinVisualization({ healthScore, actualPower, expectedPower, instability, predictionState, efficiency, dust, temp }) {
    twinZone.classList.remove("healthy", "degrading", "critical");
    if (healthScore >= 80) {
        twinZone.classList.add("healthy");
    } else if (healthScore >= 60) {
        twinZone.classList.add("degrading");
    } else {
        twinZone.classList.add("critical");
    }

    twinZone.classList.toggle("flicker", healthScore < 70);
    twinZone.classList.toggle("glitch", predictionState === "Critical Failure Risk" || healthScore < 55);

    const powerRatio = Math.max(0.2, Math.min(1.4, actualPower / 95));
    const beamSpeed = (2.2 - powerRatio * 1.15).toFixed(2);
    energyBridge.style.setProperty("--beam-speed", `${beamSpeed}s`);

    const syncAccuracy = Math.max(52, Math.min(99.8, 100 - Math.abs(expectedPower - actualPower) * 0.35 - instability * 0.8));
    const aiConfidence = Math.max(45, Math.min(99.5, healthScore - dust * 18 + 8));
    const predictionConfidence = Math.max(40, Math.min(99.2, efficiency - Math.max(0, temp - 50) * 1.4 + 10));

    animateRollingPercent(syncAccuracyEl, syncAccuracy, 1);
    animateRollingPercent(aiConfidenceEl, aiConfidence, 1);
    animateRollingPercent(predictionConfidenceEl, predictionConfidence, 1);
}

function buildChart() {
    const ctx = document.getElementById("powerChart").getContext("2d");
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Power (W)",
                    data: powerHistory,
                    borderWidth: 3,
                    cubicInterpolationMode: "monotone",
                    tension: 0.35,
                    pointRadius: 0,
                    fill: true,
                    borderColor: "#5fe3ff",
                    backgroundColor: "rgba(95, 227, 255, 0.14)"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 550,
                easing: "easeOutQuart"
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#9bc4df"
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: "rgba(95, 227, 255, 0.1)"
                    },
                    ticks: {
                        color: "#9bc4df",
                        maxRotation: 0,
                        autoSkip: true
                    }
                },
                y: {
                    grid: {
                        color: "rgba(95, 227, 255, 0.1)"
                    },
                    ticks: {
                        color: "#9bc4df"
                    }
                }
            }
        }
    });
}

function applyChartTheme() {
    if (!chart) {
        return;
    }

    const neonLine = currentTheme === "space" ? "#5fe3ff" : "#ff52c9";
    const neonFill = currentTheme === "space" ? "rgba(95, 227, 255, 0.14)" : "rgba(255, 82, 201, 0.14)";
    const gridColor = currentTheme === "space" ? "rgba(95, 227, 255, 0.1)" : "rgba(255, 82, 201, 0.14)";
    const labelColor = currentTheme === "space" ? "#9bc4df" : "#ddb8f7";

    chart.data.datasets[0].borderColor = neonLine;
    chart.data.datasets[0].backgroundColor = neonFill;
    chart.options.plugins.legend.labels.color = labelColor;
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.x.ticks.color = labelColor;
    chart.options.scales.y.ticks.color = labelColor;
    chart.update();
}

function updateSystem(pushHistory = true) {
    const sunlight = parseFloat(sunlightInput.value);
    const dust = parseFloat(dustInput.value);
    const temp = parseFloat(tempInput.value);

    const tempCoeff = 0.004;
    const tempDelta = Math.max(0, temp - 25);
    const tempFactor = Math.max(0.7, 1 - tempDelta * tempCoeff);

    const expectedVoltage = 18 * sunlight;
    const expectedCurrent = 5 * sunlight;
    const voltage = 18 * sunlight * (1 - dust);
    const current = 5 * sunlight * (1 - dust);
    const actualPower = voltage * current * tempFactor;
    const expectedPower = ratedPower * sunlight * tempFactor;
    const efficiency = expectedPower > 0 ? (actualPower / expectedPower) * 100 : 0;
    const instability = getInstabilityFactor(actualPower);

    const model = computeHealthModel({
        voltage,
        current,
        expectedVoltage,
        expectedCurrent,
        efficiency,
        temp,
        dust,
        sunlight,
        instability
    });

    const prediction = getPredictionState({
        healthScore: model.healthScore,
        temp,
        dust,
        efficiency
    });

    animateRollingValue(metricEls.voltage, voltage);
    animateRollingValue(metricEls.current, current);
    animateRollingValue(metricEls.power, actualPower);
    animateRollingValue(metricEls.temperature, temp);
    animateRollingValue(metricEls.expected, expectedPower);
    animateRollingValue(metricEls.efficiency, efficiency);

    updateHealthGauge(model.healthScore);
    updatePredictionUI(prediction);
    updateTwinVisualization({
        healthScore: model.healthScore,
        actualPower,
        expectedPower,
        instability,
        predictionState: prediction.state,
        efficiency,
        dust,
        temp
    });

    if (temp > 55 || model.healthScore < 60) {
        const faultLabel = temp > 55 ? "Overheating" : "Performance Loss";
        setStatus("fault", faultLabel);
        predictiveMessage.textContent = prediction.state;
        ttfEstimate.textContent = prediction.ttf;
    } else {
        setStatus("normal", "Normal");
        predictiveMessage.textContent = prediction.detail;
        ttfEstimate.textContent = prediction.ttf;
    }

    triggerAnomaly(actualPower);
    supportBadge.classList.toggle("alert", model.healthScore < 70);

    if (pushHistory) {
        labels.push(new Date().toLocaleTimeString());
        powerHistory.push(Number(actualPower.toFixed(2)));
        if (labels.length > 20) {
            labels.shift();
            powerHistory.shift();
        }
        chart.update();
    }
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("theme-space")) {
        body.classList.remove("theme-space");
        body.classList.add("theme-cyber");
        currentTheme = "cyber";
        themeBtn.textContent = "Theme: Neon Cyber";
    } else {
        body.classList.remove("theme-cyber");
        body.classList.add("theme-space");
        currentTheme = "space";
        themeBtn.textContent = "Theme: Deep Space";
    }
    applyChartTheme();
}

function toggleOverlay() {
    overlay.classList.toggle("show");
}

buildChart();
createParticles();
updateSliderLabels();
updateSystem(true);

setInterval(() => {
    updateSystem(true);
}, 2000);

themeBtn.addEventListener("click", toggleTheme);
presentationBtn.addEventListener("click", toggleOverlay);
closeOverlayBtn.addEventListener("click", toggleOverlay);

contactSupportBtn.addEventListener("click", () => {
    supportChat.classList.add("show");
    addChatMessage("system", "Support channel opened. Pulling latest AI diagnostics...");
    botRespond(currentPrediction);
});

closeChatBtn.addEventListener("click", () => {
    supportChat.classList.remove("show");
});

generateReportBtn.addEventListener("click", () => {
    addChatMessage("system", "Maintenance report generated and queued for export.");
    botRespond("Performance Degradation Detected");
});

requestTechBtn.addEventListener("click", () => {
    addChatMessage("system", "Technician visit request submitted to regional dispatch.");
    botRespond("Maintenance Required Within 72 Hours");
});

downloadPdfBtn.addEventListener("click", () => {
    addChatMessage("system", "System Health PDF prepared for offline download.");
    botRespond(currentPrediction);
});

[sunlightInput, dustInput, tempInput].forEach((input) => {
    input.addEventListener("input", () => {
        updateSliderLabels();
        updateSystem(false);
    });
});
