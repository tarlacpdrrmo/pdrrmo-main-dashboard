Chart.register(ChartDataLabels);

// 1. YOUR SECURE GOOGLE APPS SCRIPT WEB APP URL
const webAppUrl = "https://script.google.com/macros/s/AKfycbwYUt0YFQClUUXRGwrNdnC5INPXWzWyGUeN3J8E5tRKsO2ME-Y6zu5Fv0a56fCtxhwzTg/exec";
// OPENWEATHERMAP CREDENTIALS
const OWM_API_KEY = "3457c364d3f2840960216510c279837c"; 
let rainChartInstance = null; 

function toggleWeatherPanel() {
    const container = document.getElementById('weather-interactive-widget');
    if(container) container.classList.toggle('active');
}

function changeMunicipality() {
    const selectEl = document.getElementById('tarlac-muni-select');
    if(!selectEl) return;
    const selectedCityQuery = selectEl.value; 
    const selectedCityName = selectEl.options[selectEl.selectedIndex].text; 
    
    document.getElementById('weather-city-main').innerText = selectedCityName;
    document.getElementById('weather-temp-main').innerText = "...";
    
    fetchOpenWeather(selectedCityQuery);
}

async function fetchOpenWeather(cityQuery) {
    if (OWM_API_KEY === "PASTE_YOUR_OPENWEATHERMAP_API_KEY_HERE") return;

    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityQuery}&units=metric&appid=${OWM_API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityQuery}&units=metric&appid=${OWM_API_KEY}`;
        
        const [currentRes, forecastRes] = await Promise.all([
            fetch(currentUrl),
            fetch(forecastUrl)
        ]);

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        if (currentRes.ok && forecastRes.ok) {
            const temp = Math.round(currentData.main.temp); 
            const iconCode = currentData.weather[0].icon;
            
            document.getElementById('weather-temp-main').innerText = `${temp}°C`;
            const iconEl = document.getElementById('weather-icon-main');
            iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            iconEl.style.display = 'block';

            document.getElementById('weather-desc-detail').innerText = currentData.weather[0].description;
            document.getElementById('weather-humidity').innerText = `${currentData.main.humidity}%`;
            document.getElementById('weather-wind').innerText = `${currentData.wind.speed} m/s`;

            const rainLabels = [];
            const rainDataPoints = [];
            
            for(let i = 0; i < 5; i++) {
                const item = forecastData.list[i];
                const date = new Date(item.dt * 1000);
                let hour = date.getHours();
                let ampm = hour >= 12 ? 'PM' : 'AM';
                hour = hour % 12 || 12; 
                
                rainLabels.push(`${hour} ${ampm}`);
                rainDataPoints.push(Math.round(item.pop * 100)); 
            }
            updateRainChart(rainLabels, rainDataPoints);

            const daysProcessed = new Set();
            const forecastGrid = document.getElementById('forecast-grid');
            if(forecastGrid) forecastGrid.innerHTML = ''; 
            
            const todayStr = new Date().toLocaleDateString();

            for (let item of forecastData.list) {
                const d = new Date(item.dt * 1000);
                const dateStr = d.toLocaleDateString();
                
                if (dateStr !== todayStr && d.getHours() >= 11 && d.getHours() <= 15 && !daysProcessed.has(dateStr)) {
                    daysProcessed.add(dateStr);
                    
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); 
                    const dayTemp = Math.round(item.main.temp);
                    const dayIcon = item.weather[0].icon;
                    
                    if(forecastGrid) {
                        forecastGrid.innerHTML += `
                            <div class="forecast-day">
                                <span class="forecast-day-name">${dayName}</span>
                                <img src="https://openweathermap.org/img/wn/${dayIcon}.png" alt="icon">
                                <span class="forecast-day-temp">${dayTemp}°</span>
                            </div>
                        `;
                    }
                    if (daysProcessed.size === 3) break;
                }
            }
        }
    } catch (error) {
        console.error("Weather fetch failed:", error);
    }
}

function updateRainChart(labels, dataPoints) {
    const canvas = document.getElementById('rainChanceChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if(rainChartInstance) {
        rainChartInstance.destroy();
    }
    
    rainChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                backgroundColor: 'rgba(14, 165, 233, 0.7)', 
                borderWidth: 0, 
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }, 
                tooltip: { enabled: false }, 
                datalabels: { 
                    display: true, 
                    color: '#ffffff', 
                    anchor: 'end',
                    align: 'top',
                    font: { size: 10, weight: 'bold', family: 'Inter' }, 
                    formatter: (value) => value + '%' 
                } 
            },
            scales: {
                y: { display: false, min: 0, max: 100 }, 
                x: { 
                    ticks: { color: '#94a3b8', font: { size: 9, weight: 'bold', family: 'Inter' } }, 
                    grid: { display: false },
                    border: { display: false }
                }
            },
            layout: { padding: { top: 15 } } 
        }
    });
}

document.addEventListener('click', function(event) {
    const weatherWidget = document.getElementById('weather-interactive-widget');
    if (weatherWidget && !weatherWidget.contains(event.target)) {
        weatherWidget.classList.remove('active');
    }

    const orgDrop = document.getElementById('orgGenderDropdown');
    if (orgDrop && !orgDrop.contains(event.target)) {
        orgDrop.classList.remove('active');
    }
});

// Global Raw Data Vault
let rawOperationsData = [];
let rawDocumentsData = [];
let rawVolunteersData = [];
let rawTrainingsData = []; 

// Global Chart & State Trackers
let docPieChartInstance = null;
let docLineChartInstance = null;
let masterServicePieInstance = null;
let monthlyTotalPieInstance = null; 
let toggleChartInstances = {};
let expandedLineInstance = null; 

let trainStatusChartInst = null;
let trainTypesChartInst = null;
let trainNumbersChartInst = null;

let globalOrgGenderMap = {}; 

let globalLineData = []; 
let globalDocRecords = []; 
let originalKPITotals = {};
let operationsMonthlyCache = {}; 
let toggleChartData = {};

let globalTrainLineData = [];
let currentCalDate = new Date();
let currentCalView = 'monthly'; 
let currentCalCategory = 'all'; 
let calDataMap = {}; 

let globalTitleCounts = {};
let globalRemarksDetails = {};

let currentPieState = { 
    level: 1, filterKey: 'all', level1Target: null, level2Target: null 
};

const serviceCategoryLabels = [
    'TRAUMA (ROADCRASH)', 'Roadside Assistance', 'Patient Transport',
    'Medical Emergencies', 'Standby Medic & VIP', 'SUPPORT SERVICES (MANPOWER, TRANSPORTATION & OTHER RESOURCES)',
    'Clearing Operations', 'Firetruck', 'Hauling', 'Ledvan Truck'
];

const monthOrder = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

const pieColorPalette = [
    '#e11d48', '#06b6d4', '#2563eb', '#ea580c', '#16a34a', 
    '#9333ea', '#f43f5e', '#f59e0b', '#3b82f6', '#10b981', 
    '#8b5cf6', '#d946ef', '#f97316', '#14b8a6', '#6366f1'
];

const sharedTooltipConfig = {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    titleColor: '#ffffff',
    bodyColor: '#ffffff',
    titleFont: { family: 'Inter', size: 11, weight: '800' },
    bodyFont: { family: 'Inter', size: 11, weight: '600' },
    padding: 10,
    cornerRadius: 6,
    displayColors: false, 
    borderColor: 'rgba(255, 255, 255, 0.4)', 
    borderWidth: 1,
    caretSize: 6,
    caretPadding: 6
};

// --- MODAL CHART LOGIC FOR FULL YEAR BAR CHART ---
window.openExpandedLineChart = function(chartKey) {
    try {
        const dataObj = toggleChartData[chartKey];
        if(!dataObj) return;

        document.getElementById('expandedLineTitle').innerText = dataObj.labelText + " (12-Month View)";
        document.getElementById('expandedLineModal').classList.add('active');

        const canvas = document.getElementById('expandedLineCanvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if(expandedLineInstance) {
            expandedLineInstance.destroy();
        }

        const chartColor = Array.isArray(dataObj.color) ? dataObj.color[0] : dataObj.color;

        expandedLineInstance = new Chart(ctx, {
            type: 'bar', // Full 12 month vertical bar chart
            data: {
                labels: dataObj.labels, 
                datasets: [{
                    label: dataObj.labelText,
                    data: dataObj.data, 
                    backgroundColor: chartColor,
                    borderRadius: 4,
                    borderWidth: 0,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        display: true,
                        align: 'top',
                        anchor: 'end',
                        color: '#64748b',
                        font: { weight: 'bold', family: 'Inter', size: 11 }
                    },
                    tooltip: sharedTooltipConfig
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { family: 'Inter', size: 10, weight: '600' }, color: '#64748b' },
                        border: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' },
                        grace: '15%',
                        border: { display: false }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error opening expanded chart:", e);
    }
}

window.closeExpandedLineChart = function() {
    document.getElementById('expandedLineModal').classList.remove('active');
}

function scrollToSection(panelId) {
    const section = document.getElementById(panelId);
    if(section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

document.addEventListener("DOMContentLoaded", function() {
    fetchOpenWeather("Tarlac City,PH");
    setInterval(() => fetchOpenWeather(document.getElementById('tarlac-muni-select').value), 900000);
    
    const panels = document.querySelectorAll('.panel');
    const navLinks = document.querySelectorAll('.sidebar li:not(.section-title)');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => link.classList.remove('active'));
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.sidebar li[onclick="scrollToSection('${id}')"]`);
                if(activeLink) activeLink.classList.add('active');
                
                if (entry.target.classList.contains('iframe-panel')) {
                    entry.target.classList.add('map-in-view');
                }
            } else {
                if (entry.target.classList.contains('iframe-panel')) {
                    entry.target.classList.remove('map-in-view');
                }
            }
        });
    }, { threshold: 0.2 }); 

    panels.forEach(panel => observer.observe(panel));

    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        const timeString = hours + ':' + minutes + ':' + seconds + ' ' + ampm;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = now.toLocaleDateString('en-US', options);
        
        const timeEl = document.getElementById('live-time');
        const dateEl = document.getElementById('live-date');
        
        if(timeEl) timeEl.innerText = timeString;
        if(dateEl) dateEl.innerText = dateString;
    }
    setInterval(updateClock, 1000);
    updateClock(); 

    const resetMasterPieBtn = document.getElementById('resetMasterPieBtn');
    if (resetMasterPieBtn) {
        resetMasterPieBtn.addEventListener('click', function() {
            if (masterServicePieInstance) {
                let changed = false;
                masterServicePieInstance.data.labels.forEach((_, index) => {
                    if (!masterServicePieInstance.getDataVisibility(index)) {
                        masterServicePieInstance.toggleDataVisibility(index);
                        changed = true;
                    }
                });
                if (changed) masterServicePieInstance.update();

                const legendItems = document.querySelectorAll('#masterServiceLegend .legend-item');
                legendItems.forEach(item => item.classList.remove('hidden-slice'));
            }
        });
    }

    const yearSelect = document.getElementById('globalYearSelect');
    if(yearSelect) {
        yearSelect.addEventListener('change', function(e) {
            applyGlobalYearFilter(e.target.value);
        });
    }

    const docPieMonthFilter = document.getElementById('docPieMonthFilter');
    if(docPieMonthFilter) {
        docPieMonthFilter.addEventListener('change', function(e) {
            currentPieState.filterKey = e.target.value;
            renderDocPieChart();
        });
    }

    const pieBackBtn = document.getElementById('pieBackButton');
    if(pieBackBtn) {
        pieBackBtn.addEventListener('click', function() {
            if (currentPieState.level === 3) {
                currentPieState.level = 2;
                currentPieState.level2Target = null;
            } else if (currentPieState.level === 2) {
                currentPieState.level = 1;
                currentPieState.level1Target = null;
            }
            renderDocPieChart();
        });
    }

    const lineChartFilter = document.getElementById('lineChartFilter');
    if(lineChartFilter) {
        lineChartFilter.addEventListener('change', function(e) {
            renderLineChartByTimeframe(e.target.value);
        });
    }

    const trainTopMonthFilter = document.getElementById('trainTopMonthFilter');
    if (trainTopMonthFilter) {
        trainTopMonthFilter.addEventListener('change', function(e) {
            renderTrainingOverview(e.target.value);
        });
    }

    const masterServiceMonthFilter = document.getElementById('masterServiceMonthFilter');
    if(masterServiceMonthFilter) {
        masterServiceMonthFilter.addEventListener('change', function(e) {
            renderMasterServicePie(e.target.value);
        });
    }

    const expandBtn = document.getElementById('expandTitlesBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const modal = document.getElementById('titlesModal');

    if(expandBtn && modal && closeBtn) {
        expandBtn.addEventListener('click', () => {
            populateModalList(globalTitleCounts);
            modal.classList.add('active');
        });
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if(e.target === modal) modal.classList.remove('active'); 
        });
    }

    const expandRemarksBtn = document.getElementById('expandRemarksBtn');
    const closeRemarksModalBtn = document.getElementById('closeRemarksModalBtn');
    const remarksModal = document.getElementById('remarksModal');

    if(expandRemarksBtn && remarksModal && closeRemarksModalBtn) {
        expandRemarksBtn.addEventListener('click', () => {
            populateRemarksModal(globalRemarksDetails);
            remarksModal.classList.add('active');
        });
        closeRemarksModalBtn.addEventListener('click', () => {
            remarksModal.classList.remove('active');
        });
        remarksModal.addEventListener('click', (e) => {
            if(e.target === remarksModal) remarksModal.classList.remove('active'); 
        });
    }
});

function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    
    let parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
        let fallbackDate = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
        if (!isNaN(fallbackDate.getTime())) return fallbackDate;
    }
    return null;
}

function parseTrainingDate(dateStr) {
    if (!dateStr) return null;
    let str = String(dateStr).trim();
    let dashIndex = str.indexOf('-');
    if (dashIndex > -1) {
        let commaIndex = str.indexOf(',');
        if (commaIndex > dashIndex) {
            let beforeDash = str.substring(0, dashIndex);
            let afterComma = str.substring(commaIndex);
            let d = new Date(beforeDash + afterComma);
            if (!isNaN(d.getTime())) return d;
        }
    }
    let d2 = new Date(str);
    if (!isNaN(d2.getTime())) return d2;
    return null;
}

function extractYear(row, type) {
    if (type === 'doc') {
        let dStr = row['Column M'] || row['COLUMN M'] || row['Date Received'] || row['DATE RECEIVED'];
        if (dStr) {
            let d = parseCustomDate(dStr);
            if (d) return d.getFullYear().toString();
        }
    } else if (type === 'op') {
        let y = row['YEAR'] || row['Year'] || row['year'];
        if (y) return String(y).trim();
        
        let dStr = row['DATE'] || row['Date'] || row['date'];
        if (dStr) {
            let d = parseCustomDate(dStr);
            if (d) return d.getFullYear().toString();
        }
    }
    return null;
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.visibility = 'hidden';
            loader.style.display = 'none';
        }, 800); 
    }
}

async function loadAllData() {
    if (!webAppUrl || webAppUrl === "YOUR_NEW_WEB_APP_URL_HERE") {
        console.error("Please add your Web App URL to app.js");
        hideLoader();
        return;
    }

    try {
        const opRes = await fetch(`${webAppUrl}?type=operations`).catch(() => null);
        if (opRes && opRes.ok) {
            const opData = await opRes.json();
            if (!opData.error) rawOperationsData = opData;
        }

        const docRes = await fetch(`${webAppUrl}?type=documents`).catch(() => null);
        if (docRes && docRes.ok) {
            const docData = await docRes.json();
            if (!docData.error) rawDocumentsData = docData;
        }

        const volRes = await fetch(`${webAppUrl}?type=volunteers`).catch(() => null);
        if (volRes && volRes.ok) {
            const volData = await volRes.json();
            if (!volData.error) rawVolunteersData = volData;
        }

        const trainRes = await fetch(`${webAppUrl}?type=trainings`).catch(() => null);
        if (trainRes && trainRes.ok) {
            const trainData = await trainRes.json();
            if (!trainData.error) rawTrainingsData = trainData;
        }

        let yearsSet = new Set();
        
        rawOperationsData.forEach(r => {
            let y = extractYear(r, 'op');
            if (y && !isNaN(y)) yearsSet.add(y);
        });
        
        rawDocumentsData.forEach(r => {
            let y = extractYear(r, 'doc');
            if (y && !isNaN(y)) yearsSet.add(y);
        });

        const yearSelect = document.getElementById('globalYearSelect');
        if (yearSelect) {
            let sortedYears = Array.from(yearsSet).sort().reverse();
            sortedYears.forEach(y => {
                let opt = document.createElement('option');
                opt.value = y;
                opt.innerText = y;
                yearSelect.appendChild(opt);
            });
            
            const currentYear = new Date().getFullYear().toString();
            if (yearsSet.has(currentYear)) {
                yearSelect.value = currentYear;
            }
        }

        applyGlobalYearFilter(yearSelect ? yearSelect.value : 'all');
        
        if (rawVolunteersData.length > 0) processVolunteersData(rawVolunteersData);
        
        processTrainingsData(rawTrainingsData);
        
        hideLoader();

    } catch (error) {
        console.error("Error fetching secure data:", error);
        hideLoader();
    }
}

function applyGlobalYearFilter(targetYear) {
    let filteredOps = rawOperationsData;
    let filteredDocs = rawDocumentsData;

    if (targetYear !== 'all') {
        filteredOps = rawOperationsData.filter(r => extractYear(r, 'op') === targetYear);
        filteredDocs = rawDocumentsData.filter(r => extractYear(r, 'doc') === targetYear);
    }

    operationsMonthlyCache = {};
    globalLineData = [];
    globalDocRecords = [];
    originalKPITotals = {};
    
    currentPieState = { level: 1, filterKey: 'all', level1Target: null, level2Target: null };
    
    let docPieMonthFilter = document.getElementById('docPieMonthFilter');
    if(docPieMonthFilter) docPieMonthFilter.innerHTML = '<option value="all">All Time</option>';
    
    let masterServiceMonthFilter = document.getElementById('masterServiceMonthFilter');
    if(masterServiceMonthFilter) masterServiceMonthFilter.innerHTML = '<option value="all">All Time</option>';

    processOperationsData(filteredOps);
    processDocumentsData(filteredDocs);
}

const getRobustValue = (row, searchTerms, fallbackKeys) => {
    let keys = Object.keys(row);
    for (let term of searchTerms) {
        let exactKey = keys.find(k => k.trim().toUpperCase() === term.toUpperCase());
        if (exactKey && row[exactKey] !== undefined) return row[exactKey];
    }
    for (let term of searchTerms) {
        let partialKey = keys.find(k => k.toUpperCase().includes(term.toUpperCase()));
        if (partialKey && row[partialKey] !== undefined) return row[partialKey];
    }
    for (let fb of fallbackKeys) {
        if (row[fb] !== undefined) return row[fb];
    }
    return '';
};

// ==========================================
// RESTORED CHART HELPER FUNCTIONS
// ==========================================

function renderTrendFooter(elementId, dataArray, labelsArray, inverseColors = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let current = 0;
    let previous = 0;
    let currentLabel = 'Current Month';
    let prevLabel = 'Previous Month';

    if (dataArray.length >= 2 && labelsArray.length >= 2) {
        current = dataArray[dataArray.length - 1];
        previous = dataArray[dataArray.length - 2];
        currentLabel = labelsArray[labelsArray.length - 1];
        prevLabel = labelsArray[labelsArray.length - 2];
    } else if (dataArray.length === 1) {
        current = dataArray[0];
        currentLabel = labelsArray[0];
    }

    const diff = current - previous;
    let trendHtml = '';
    let bgColor = '#64748b'; 

    if (dataArray.length < 2) {
        trendHtml = `<span>No prior data</span>`;
        el.style.backgroundColor = bgColor;
        el.style.padding = '10px 16px'; 
        el.innerHTML = `<div style="font-weight:600; font-size:0.75rem; color:#fff;">${trendHtml}</div>`;
        return;
    }

    let symbol = '—';
    let sign = diff > 0 ? '+' : '';

    const arrowUp = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>`;
    const arrowDown = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"></path></svg>`;

    if (diff > 0) {
        symbol = arrowUp;
        bgColor = inverseColors ? '#ef4444' : '#10b981'; 
    } else if (diff < 0) {
        symbol = arrowDown;
        bgColor = inverseColors ? '#10b981' : '#ef4444'; 
        sign = '-'; 
    }

    let diffStr = diff > 0 ? `+${diff}` : diff;
    let pct = previous > 0 ? Math.round((Math.abs(diff) / previous) * 100) : (diff > 0 ? 100 : 0);

    let tooltipHtml = `
        <div class="custom-tooltip">
            <div style="color:#94a3b8; font-size:0.55rem; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">Monthly Comparison</div>
            <div style="display:flex; justify-content:space-between; gap:20px; margin-bottom:2px;"><span>${currentLabel}:</span> <strong>${current}</strong></div>
            <div style="display:flex; justify-content:space-between; gap:20px; margin-bottom:2px;"><span>${prevLabel}:</span> <strong>${previous}</strong></div>
            <div style="border-top:1px solid #334155; margin-top:6px; padding-top:6px; display:flex; justify-content:space-between; gap:20px;"><span>Difference:</span> <strong>${diffStr}</strong></div>
        </div>
    `;

    el.style.backgroundColor = bgColor;
    el.style.padding = '10px 16px'; 
    el.style.color = '#ffffff';

    el.innerHTML = `
        <div class="has-tooltip" style="display:flex; width:100%; justify-content:space-between; align-items:center; cursor:pointer;">
            <span style="font-weight:600; font-size:0.75rem;">${Math.abs(diff)} (${sign}${pct}%)</span>
            <span style="display:flex; align-items:center;">${symbol}</span>
            ${tooltipHtml}
        </div>
    `;
}

function renderLineChartByTimeframe(timeframe) {
    let groupedObj = {};
    let sortedData = [...globalLineData].sort((a, b) => a.timestamp - b.timestamp);

    sortedData.forEach(item => {
        let key = "";
        if (timeframe === 'monthly') {
            key = item.dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        } else if (timeframe === 'yearly') {
            key = item.dateObj.getFullYear().toString();
        } else { 
            key = item.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        groupedObj[key] = (groupedObj[key] || 0) + item.count;
    });

    const labels = Object.keys(groupedObj);
    const dataValues = Object.values(groupedObj);
    
    if(labels.length === 0) {
        drawLineChart('docDateLineChart', ['No Date Data Found'], [0]);
    } else {
        drawLineChart('docDateLineChart', labels, dataValues);
    }
}

function drawLineChart(canvasId, labels, dataArr) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if(docLineChartInstance) docLineChartInstance.destroy();

    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)'); 

    docLineChartInstance = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: labels, 
            datasets: [{ 
                label: 'Requests Received', 
                data: dataArr, 
                borderColor: '#2563eb', 
                backgroundColor: gradient, 
                borderWidth: 2, 
                pointRadius: 0, 
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2563eb',
                pointBorderWidth: 2,
                tension: 0.4, 
                fill: true
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { duration: 1000, easing: 'easeOutQuart' },
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                datalabels: { display: false }, 
                legend: { display: false }, 
                tooltip: sharedTooltipConfig 
            }, 
            scales: { 
                x: { 
                    grid: { display: false }, 
                    ticks: { font: { family: 'Inter', size: 9 }, color: '#64748b', maxTicksLimit: 12 } 
                }, 
                y: { 
                    title: {
                        display: true,
                        text: 'Received From (OFFICE)',
                        font: { family: 'Inter', size: 12, weight: '600', style: 'italic' },
                        color: '#475569'
                    },
                    grid: { color: '#f1f5f9', drawBorder: false }, 
                    beginAtZero: true, 
                    ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' } 
                } 
            } 
        }
    });
}

function drawDonutChart(canvasId, labels, dataArr, grandTotal) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (monthlyTotalPieInstance) {
        monthlyTotalPieInstance.destroy();
    }

    const vibrantColors = ['#2563eb', '#06b6d4', '#e11d48', '#ea580c', '#16a34a', '#9333ea'];
    const mappedVibrant = dataArr.map((_, i) => vibrantColors[i % vibrantColors.length]);
    
    const gtEl = document.getElementById('pie-grand-total');
    if(gtEl) gtEl.innerText = grandTotal.toLocaleString();

    monthlyTotalPieInstance = new Chart(ctx, {
        type: 'doughnut', 
        data: { 
            labels: labels, 
            datasets: [{ 
                data: dataArr, 
                backgroundColor: mappedVibrant, 
                borderWidth: 0, 
                borderRadius: 8, 
                spacing: 5,     
                hoverOffset: 15 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '55%', 
            layout: { padding: 15 }, 
            animation: { animateScale: true, animateRotate: true, duration: 800, easing: 'easeOutExpo' }, 
            hover: { mode: 'index', animationDuration: 300 }, 
            plugins: { 
                legend: { display: false }, 
                datalabels: { 
                    color: '#ffffff', 
                    font: { weight: '800', family: 'Inter', size: 9 }, 
                    anchor: 'center',
                    align: 'center',
                    formatter: (value, context) => { 
                        let sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); 
                        if (sum === 0) return ''; 
                        let pctStr = ((value * 100) / sum).toFixed(1);
                        let pctFloat = parseFloat(pctStr);
                        return pctFloat >= 8 ? pctStr + '%' : ''; 
                    } 
                },
                tooltip: {
                    ...sharedTooltipConfig, 
                    callbacks: {
                        label: function(context) {
                            let val = context.raw;
                            let pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : 0;
                            return [`${val} Services Catered`, `vs Grand Total: ${pct}%`];
                        }
                    }
                }
            } 
        }
    });
}

// ==========================================
// CORE PROCESSING FUNCTIONS
// ==========================================

function processOperationsData(data) {
    try {
        operationsMonthlyCache['all'] = new Array(10).fill(0);
        let monthSet = new Set();
        const monthlyAgg = {};
        
        data.forEach(row => {
            if(row['MONTH']) { 
                let m = String(row['MONTH']).trim().toUpperCase();
                if(!monthlyAgg[m]) {
                    monthlyAgg[m] = { vehicular:0, roadside:0, patient:0, medical:0, standby:0, others:0, clearing:0, firetruck:0, hauling:0, ledvan:0, grandTotal:0, total1st:0, total2nd:0, total3rd:0, totalOutside:0 };
                }
                
                monthlyAgg[m].vehicular += Number(row['VEHICULAR ACCIDENT']) || Number(row['TRAUMA (ROADCRASH INCIDENT)']) || 0;
                monthlyAgg[m].roadside += Number(row['ROADSIDE ASSISTANCE']) || 0;
                monthlyAgg[m].patient += Number(row['PATIENT TRANSPORT']) || 0;
                monthlyAgg[m].medical += Number(row['MEDICAL']) || 0;
                monthlyAgg[m].standby += Number(row['STANDBY MEDIC, MARSHAL & VIP']) || 0;
                monthlyAgg[m].others += Number(row['OTHERS']) || 0;
                monthlyAgg[m].clearing += Number(row['CLEARING OPERATIONS']) || 0;
                monthlyAgg[m].firetruck += Number(row['FIRETRUCK']) || 0;
                monthlyAgg[m].hauling += Number(row['HAULING']) || 0;
                monthlyAgg[m].ledvan += Number(row['LEDVAN TRUCK']) || 0;

                for (let key in row) {
                    let upperKey = key.toUpperCase();
                    if (upperKey.includes("1ST DISTRICT")) { monthlyAgg[m].total1st += Number(row[key]) || 0; }
                    if (upperKey.includes("2ND DISTRICT")) { monthlyAgg[m].total2nd += Number(row[key]) || 0; }
                    if (upperKey.includes("3RD DISTRICT")) { monthlyAgg[m].total3rd += Number(row[key]) || 0; }
                    if (upperKey.includes("OUTSIDE")) { monthlyAgg[m].totalOutside += Number(row[key]) || 0; }
                    if (upperKey === "GRAND TOTAL") { monthlyAgg[m].grandTotal += Number(row[key]) || 0; }
                }
            }
        });

        const labels = [];
        const vehicular = [], roadside = [], patient = [], medical = [], standby = [];
        const others = [], clearing = [], firetruck = [], hauling = [], ledvan = [];
        const monthlyTotalServices = [];

        let total1st = 0, total2nd = 0, total3rd = 0, totalOutside = 0;
        let overallGrandTotal = 0;

        monthOrder.forEach(m => {
            if(monthlyAgg[m]) {
                labels.push(m);
                monthSet.add(m);
                
                operationsMonthlyCache[m] = [
                    monthlyAgg[m].vehicular, monthlyAgg[m].roadside, monthlyAgg[m].patient,
                    monthlyAgg[m].medical, monthlyAgg[m].standby, monthlyAgg[m].others,
                    monthlyAgg[m].clearing, monthlyAgg[m].firetruck, monthlyAgg[m].hauling, monthlyAgg[m].ledvan
                ];

                vehicular.push(monthlyAgg[m].vehicular);
                roadside.push(monthlyAgg[m].roadside);
                patient.push(monthlyAgg[m].patient);
                medical.push(monthlyAgg[m].medical);
                standby.push(monthlyAgg[m].standby);
                others.push(monthlyAgg[m].others);
                clearing.push(monthlyAgg[m].clearing);
                firetruck.push(monthlyAgg[m].firetruck);
                hauling.push(monthlyAgg[m].hauling);
                ledvan.push(monthlyAgg[m].ledvan);

                monthlyTotalServices.push(monthlyAgg[m].grandTotal);
                overallGrandTotal += monthlyAgg[m].grandTotal;
                
                total1st += monthlyAgg[m].total1st;
                total2nd += monthlyAgg[m].total2nd;
                total3rd += monthlyAgg[m].total3rd;
                totalOutside += monthlyAgg[m].totalOutside;
                
                for(let i=0; i<10; i++) {
                    operationsMonthlyCache['all'][i] += operationsMonthlyCache[m][i];
                }
            }
        });

        let referenceTotal = overallGrandTotal > 0 ? overallGrandTotal : (total1st + total2nd + total3rd + totalOutside);

        const el1st = document.getElementById('kpi-1st');
        if(el1st) {
            el1st.innerText = total1st;
            document.getElementById('pct-1st').innerText = referenceTotal > 0 ? ((total1st / referenceTotal) * 100).toFixed(1) + '% of Grand Total' : '0%';
        }

        const el2nd = document.getElementById('kpi-2nd');
        if(el2nd) {
            el2nd.innerText = total2nd;
            document.getElementById('pct-2nd').innerText = referenceTotal > 0 ? ((total2nd / referenceTotal) * 100).toFixed(1) + '% of Grand Total' : '0%';
        }

        const el3rd = document.getElementById('kpi-3rd');
        if(el3rd) {
            el3rd.innerText = total3rd;
            document.getElementById('pct-3rd').innerText = referenceTotal > 0 ? ((total3rd / referenceTotal) * 100).toFixed(1) + '% of Grand Total' : '0%';
        }

        const elOutside = document.getElementById('kpi-outside');
        if(elOutside) {
            elOutside.innerText = totalOutside;
            document.getElementById('pct-outside').innerText = referenceTotal > 0 ? ((totalOutside / referenceTotal) * 100).toFixed(1) + '% of Grand Total' : '0%';
        }

        renderTrendFooter('trend-vehicular', vehicular, labels, true); 
        renderTrendFooter('trend-roadside', roadside, labels, false); 
        renderTrendFooter('trend-patient', patient, labels, true);     
        renderTrendFooter('trend-medical', medical, labels, true);                
        renderTrendFooter('trend-standby', standby, labels, false); 
        
        renderTrendFooter('trend-others', others, labels, false);
        renderTrendFooter('trend-clearing', clearing, labels, false);
        renderTrendFooter('trend-firetruck', firetruck, labels, false);
        renderTrendFooter('trend-hauling', hauling, labels, false);
        renderTrendFooter('trend-ledvan', ledvan, labels, false);

        drawDonutChart('monthlyPieChart', labels, monthlyTotalServices, overallGrandTotal);
        
        const barColors = pieColorPalette;

        toggleChartData['vehicularChart'] = { labels, labelText: 'TRAUMA (ROADCRASH INCIDENT)', data: vehicular, color: barColors[0] };
        toggleChartData['roadsideChart'] = { labels, labelText: 'Roadside Assistance', data: roadside, color: barColors[1] };
        toggleChartData['patientChart'] = { labels, labelText: 'Patient Transport', data: patient, color: barColors[2] };
        toggleChartData['medicalChart'] = { labels, labelText: 'MEDICAL EMERGENCIES', data: medical, color: barColors[3] };
        toggleChartData['standbyChart'] = { labels, labelText: 'Standby Medic & VIP', data: standby, color: barColors[4] };
        
        toggleChartData['othersChart'] = { labels, labelText: 'SUPPORT SERVICES', data: others, color: barColors[5] };
        toggleChartData['clearingChart'] = { labels, labelText: 'Clearing Operations', data: clearing, color: barColors[6] };
        toggleChartData['firetruckChart'] = { labels, labelText: 'Firetruck', data: firetruck, color: barColors[7] };
        toggleChartData['haulingChart'] = { labels, labelText: 'Hauling', data: hauling, color: barColors[8] };
        toggleChartData['ledvanChart'] = { labels, labelText: 'Ledvan Truck', data: ledvan, color: barColors[9] };

        ['vehicularChart', 'roadsideChart', 'patientChart', 'medicalChart', 'standbyChart', 'othersChart', 'clearingChart', 'firetruckChart', 'haulingChart', 'ledvanChart'].forEach(id => {
            renderToggleableChart(id, 'bar', true); 
        });

        const drop = document.getElementById('masterServiceMonthFilter');
        if(drop) {
            drop.innerHTML = '<option value="all">All Time</option>';
            Array.from(monthSet).forEach(m => {
                let opt = document.createElement('option');
                opt.value = m; opt.innerText = m;
                drop.appendChild(opt);
            });
        }
        renderMasterServicePie('all');

    } catch (e) {
        console.error("FATAL ERROR in processOperationsData:", e);
    }
}

function renderToggleableChart(canvasId, type, isInitialLoad = false) {
    try {
        const canvas = document.getElementById(canvasId);
        if(!canvas) return;
        const container = canvas.parentElement;

        if (!isInitialLoad) {
            container.classList.add('chart-fade-out');
        }

        setTimeout(() => {
            const ctx = canvas.getContext('2d');
            if (toggleChartInstances[canvasId]) {
                toggleChartInstances[canvasId].destroy();
            }

            const dataObj = toggleChartData[canvasId];
            if(!dataObj || !dataObj.labels) return;

            const wSize = 3;
            const recentLabels = dataObj.labels.slice(-wSize).map(l => String(l).substring(0, 3));
            const recentData = dataObj.data.slice(-wSize);

            let chartColor = dataObj.color;
            if (Array.isArray(chartColor)) chartColor = chartColor[0];

            toggleChartInstances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: recentLabels,
                    datasets: [{
                        label: dataObj.labelText,
                        data: recentData,
                        backgroundColor: chartColor,
                        maxBarThickness: 15,
                        borderRadius: 3, 
                        borderWidth: 0
                    }]
                },
                options: {
                    indexAxis: 'y', 
                    responsive: true, 
                    maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    layout: { padding: { top: 5, right: 35, bottom: 5, left: 10 } }, 
                    plugins: { 
                        datalabels: { 
                            display: true,
                            color: '#1e293b', 
                            align: 'right',
                            anchor: 'end',
                            font: { weight: '800', family: 'Inter', size: 10 }
                        }, 
                        legend: { display: false }, 
                        tooltip: sharedTooltipConfig 
                    },
                    scales: { 
                        x: { display: false, beginAtZero: true, grace: '20%' }, 
                        y: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter', size: 10, weight: '700' }, color: '#64748b' }, border: {display: false} } 
                    }
                }
            });

            if (!isInitialLoad) {
                setTimeout(() => {
                    container.classList.remove('chart-fade-out');
                }, 50); 
            }
        }, isInitialLoad ? 0 : 300); 
    } catch (e) {
        console.error("Chart Render Failed for", canvasId, e);
    }
}

function renderMasterServicePie(monthFilter) {
    try {
        const dataArr = operationsMonthlyCache[monthFilter] || new Array(10).fill(0);

        let filteredLabels = [];
        let filteredData = [];
        let mappedColors = [];

        for(let i=0; i<10; i++) {
            if(dataArr[i] > 0) {
                filteredLabels.push(serviceCategoryLabels[i]);
                filteredData.push(dataArr[i]);
                mappedColors.push(pieColorPalette[i % pieColorPalette.length]);
            }
        }

        if(filteredLabels.length === 0) {
            filteredLabels = ["No Data"];
            filteredData = [1];
            mappedColors = ["#e2e8f0"];
        } else {
            let combined = filteredLabels.map((l, i) => ({l, d: filteredData[i], c: mappedColors[i]}));
            combined.sort((a,b) => b.d - a.d);
            filteredLabels = combined.map(x => x.l);
            filteredData = combined.map(x => x.d);
            mappedColors = combined.map(x => x.c);
        }

        const canvas = document.getElementById('masterServicePieChart');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if(masterServicePieInstance) {
            masterServicePieInstance.data.labels = filteredLabels;
            masterServicePieInstance.data.datasets[0].data = filteredData;
            masterServicePieInstance.data.datasets[0].backgroundColor = mappedColors;
            masterServicePieInstance.update();
        } else {
            masterServicePieInstance = new Chart(ctx, {
                type: 'doughnut', 
                data: {
                    labels: filteredLabels,
                    datasets: [{
                        data: filteredData,
                        backgroundColor: mappedColors,
                        borderWidth: 0, 
                        borderRadius: 8, 
                        spacing: 5,     
                        hoverOffset: 15  
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '55%', 
                    layout: { padding: 15 }, 
                    animation: { animateScale: true, animateRotate: true, duration: 800, easing: 'easeOutExpo' }, 
                    hover: { mode: 'index', animationDuration: 300 }, 
                    plugins: {
                        legend: { display: false },
                        tooltip: sharedTooltipConfig,
                        datalabels: {
                            color: '#ffffff', font: { weight: '800', family: 'Inter', size: 10 },
                            formatter: (value, context) => {
                                if(context.chart.data.labels[0] === "No Data") return "";
                                let sum = context.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
                                let p = (value/sum*100);
                                return p >= 5 ? p.toFixed(1)+'%' : '';
                            }
                        }
                    }
                }
            });
        }

        const leg = document.getElementById('masterServiceLegend');
        if(leg) {
            leg.innerHTML = '';
            
            if(filteredLabels[0] !== "No Data") {
                filteredLabels.forEach((lbl, i) => {
                    let item = document.createElement('div');
                    item.className = 'legend-item interactive-legend-item';
                    item.style.padding = '8px 0';
                    item.style.animationDelay = `${i * 0.04}s`;
                    
                    item.innerHTML = `
                        <div class="legend-color" style="background-color: ${mappedColors[i]};"></div>
                        <div class="legend-text" title="${lbl}">${lbl}</div>
                        <div class="legend-val">${filteredData[i]}</div>
                    `;
                    
                    item.onclick = function() {
                        if (masterServicePieInstance) {
                            masterServicePieInstance.toggleDataVisibility(i);
                            masterServicePieInstance.update();
                            
                            if (masterServicePieInstance.getDataVisibility(i)) {
                                item.classList.remove('hidden-slice');
                            } else {
                                item.classList.add('hidden-slice');
                            }
                        }
                    };
                    
                    leg.appendChild(item);
                });
            } else {
                leg.innerHTML = `<div style="padding:20px; color:#94a3b8; font-size:0.8rem;">No Data Available</div>`;
            }
        }
    } catch (e) {
        console.error("Master Pie Chart Crash:", e);
    }
}

function processDocumentsData(data) {
    let uniqueMonths = new Set();
    
    let dynamicKPIs = {
        req: 0, action: 0, catered: 0, notCatered: 0, cancelled: 0, 
        invAttended: 0, invNotAttended: 0, others: 0, noAction: 0
    };

    let explicitNoAction = 0;
    if (rawDocumentsData && rawDocumentsData.length > 0) {
        for (let i = 0; i < Math.min(5, rawDocumentsData.length); i++) {
            let row = rawDocumentsData[i];
            let keys = Object.keys(row);
            let targetKey = keys.find(k => k.trim().toUpperCase() === 'TOTAL NO ACTION' || k.trim().toUpperCase() === 'COLUMN I');
            if (targetKey && row[targetKey] !== undefined && String(row[targetKey]).trim() !== '') {
                let parsedVal = parseInt(String(row[targetKey]).replace(/,/g, '').trim());
                if (!isNaN(parsedVal)) {
                    explicitNoAction = parsedVal;
                    break;
                }
            }
        }
    }
    
    dynamicKPIs.noAction = explicitNoAction;

    data.forEach(row => {
        let keys = Object.keys(row);

        let rawNature = row['Nature of Letter'] || row['NATURE OF LETTER'] || row['Column P'] || row['COLUMN P'] || '';
        let rawCategory = row['Category of Writing Party'] || row['CATEGORY OF WRITING PARTY'] || row['Column O'] || row['COLUMN O'] || '';
        let rawOffice = row['Received From (OFFICE)'] || row['RECEIVED FROM (OFFICE)'] || row['Received From Office'] || row['Column N'] || row['COLUMN N'] || '';
        let rawActionTaken = row['Actions Taken'] || row['ACTIONS TAKEN'] || row['Column Q'] || row['COLUMN Q'] || '';
        let dateStr = row['Column M'] || row['COLUMN M'] || row['Date Received'] || row['DATE RECEIVED'] || row[keys[12]] || '';
        
        let isSummaryRow = (row['TOTAL ACTION TAKEN (OVERALL)'] !== undefined && String(row['TOTAL ACTION TAKEN (OVERALL)']).trim() !== '') || 
                           (row['TOTAL REQUEST CATERED'] !== undefined && String(row['TOTAL REQUEST CATERED']).trim() !== '');
                           
        let isBlankRow = (!rawNature || String(rawNature).trim() === '') && 
                         (!rawCategory || String(rawCategory).trim() === '') &&
                         (!dateStr || String(dateStr).trim() === '');

        if (!isSummaryRow && !isBlankRow) {
            
            dynamicKPIs.req++;
            let actionTxt = (rawActionTaken || '').toString().trim().toLowerCase();
            let actionActuallyTaken = false;
            
            if (actionTxt.includes('no action')) {
                dynamicKPIs.noAction++;
            } 
            else if (actionTxt !== '' && actionTxt !== 'null') {
                actionActuallyTaken = true;
                dynamicKPIs.action++;
                
                if (actionTxt.includes('not catered')) {
                    dynamicKPIs.notCatered++;
                } else if (actionTxt.includes('catered') || actionTxt === 'catered') {
                    dynamicKPIs.catered++;
                } else if (actionTxt.includes('cancelled')) {
                    dynamicKPIs.cancelled++;
                } else if (actionTxt.includes('not attended')) {
                    dynamicKPIs.invNotAttended++;
                } else if (actionTxt.includes('attended')) {
                    dynamicKPIs.invAttended++;
                } else {
                    dynamicKPIs.others++;
                }
            } 

            let mappedNature = rawNature.trim();
            let upperNature = mappedNature.toUpperCase();
            
            if (upperNature.includes('OFFER') || upperNature.includes('PROPOSAL')) {
                mappedNature = 'Offer/Proposal';
            } else if (upperNature.includes('REQUEST')) {
                mappedNature = 'Request';
            } else if (upperNature.includes('INVITATION')) {
                mappedNature = 'Invitation';
            } else if (upperNature.includes('FYI') || upperNature.includes('INFORMATION')) {
                mappedNature = 'For Information';
            } else {
                mappedNature = 'Uncategorized';
            }
            
            let subCategory = rawCategory.trim() !== '' ? rawCategory.trim() : 'Uncategorized';
            let specificOffice = rawOffice.trim() !== '' ? rawOffice.trim() : 'Unspecified Office';
            
            let monthYearKey = 'all';
            
            if (dateStr && String(dateStr).trim() !== '') {
                let parsedDate = parseCustomDate(dateStr);
                if (parsedDate) {
                    globalLineData.push({ dateObj: parsedDate, count: 1, timestamp: parsedDate.getTime() });
                    let m = parsedDate.getMonth() + 1;
                    let y = parsedDate.getFullYear();
                    monthYearKey = `${y}-${m.toString().padStart(2, '0')}`;
                    uniqueMonths.add(monthYearKey);
                }
            }

            globalDocRecords.push({
                dateKey: monthYearKey,
                level1: mappedNature,     
                level2: subCategory,      
                level3: specificOffice,
                hasActionTaken: actionActuallyTaken,
                count: 1 
            });
        }
    });

    originalKPITotals = {
        req: dynamicKPIs.req, 
        action: dynamicKPIs.action, 
        catered: dynamicKPIs.catered,     
        notCatered: dynamicKPIs.notCatered, 
        cancelled: dynamicKPIs.cancelled,     
        invAttended: dynamicKPIs.invAttended, 
        invNotAttended: dynamicKPIs.invNotAttended, 
        others: dynamicKPIs.others,
        noAction: dynamicKPIs.noAction 
    };

    let monthSelect = document.getElementById('docPieMonthFilter');
    if (monthSelect) {
        monthSelect.innerHTML = '<option value="all">All Time</option>';
        let sortedMonths = Array.from(uniqueMonths).sort().reverse(); 
        sortedMonths.forEach(my => {
            if(my === 'all') return;
            let [y, m] = my.split('-');
            let dateObj = new Date(y, m - 1);
            let label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            let opt = document.createElement('option');
            opt.value = my;
            opt.innerText = label;
            monthSelect.appendChild(opt);
        });
    }

    renderDocPieChart();
    renderLineChartByTimeframe('daily');
}

function updateTrackingKPIDisplays() {
    const cardReqCount = document.getElementById('doc-kpi-request').parentElement; 
    const cardAction = document.getElementById('doc-kpi-action').parentElement; 
    const cardCatered = document.getElementById('doc-kpi-catered').parentElement; 
    const cardInvAtt = document.getElementById('doc-kpi-inv-att').parentElement; 
    const cardNotCatered = document.getElementById('doc-kpi-not-catered').parentElement; 
    const cardOthers = document.getElementById('doc-kpi-others').parentElement; 
    const cardInvNot = document.getElementById('doc-kpi-inv-not').parentElement; 
    const cardCancelled = document.getElementById('doc-kpi-cancelled').parentElement; 
    const cardNoAction = document.getElementById('doc-kpi-no-action').parentElement; 

    cardReqCount.style.display = '';

    if (currentPieState.level === 1) {
        [cardAction, cardCatered, cardInvAtt, cardNotCatered, cardOthers, cardInvNot, cardCancelled, cardNoAction].forEach(card => card.style.display = '');
        
        document.getElementById('doc-kpi-request').innerText = originalKPITotals.req;
        document.getElementById('doc-kpi-action').innerText = originalKPITotals.action;
        document.getElementById('doc-kpi-catered').innerText = originalKPITotals.catered;
        document.getElementById('doc-kpi-inv-att').innerText = originalKPITotals.invAttended;
        document.getElementById('doc-kpi-not-catered').innerText = originalKPITotals.notCatered;
        document.getElementById('doc-kpi-others').innerText = originalKPITotals.others;
        document.getElementById('doc-kpi-inv-not').innerText = originalKPITotals.invNotAttended;
        document.getElementById('doc-kpi-cancelled').innerText = originalKPITotals.cancelled;
        document.getElementById('doc-kpi-no-action').innerText = originalKPITotals.noAction;
    } else {
        let dynTotalRequestsMatched = 0;
        let dynActionsActuallyTakenMatched = 0;
        let targetCategory = currentPieState.level1Target;

        globalDocRecords.forEach(record => {
            if (currentPieState.filterKey === 'all' || record.dateKey === currentPieState.filterKey) {
                if (record.level1 === targetCategory) {
                    dynTotalRequestsMatched++;
                    if (record.hasActionTaken) {
                        dynActionsActuallyTakenMatched++;
                    }
                }
            }
        });

        document.getElementById('doc-kpi-request').innerText = dynTotalRequestsMatched;
        document.getElementById('doc-kpi-action').innerText = dynActionsActuallyTakenMatched;

        [cardAction, cardCatered, cardInvAtt, cardNotCatered, cardOthers, cardInvNot, cardCancelled, cardNoAction].forEach(card => card.style.display = 'none');
        
        if (targetCategory === 'Request') {
            cardCatered.style.display = '';
            cardNotCatered.style.display = '';
            cardCancelled.style.display = ''; 
        } else if (targetCategory === 'Invitation') {
            cardInvAtt.style.display = '';
            cardInvNot.style.display = '';
        } else if (targetCategory === 'Offer/Proposal' || targetCategory === 'For Information') {
            cardAction.style.display = ''; 
        } else {
            cardAction.style.display = '';
        }
    }
}

function renderDocPieChart() {
    let sourceMap = {};
    let hasData = false;

    globalDocRecords.forEach(record => {
        if (currentPieState.filterKey === 'all' || record.dateKey === currentPieState.filterKey) {
            if (currentPieState.level === 1) {
                sourceMap[record.level1] = (sourceMap[record.level1] || 0) + record.count;
                hasData = true;
            } 
            else if (currentPieState.level === 2 && record.level1 === currentPieState.level1Target) {
                sourceMap[record.level2] = (sourceMap[record.level2] || 0) + record.count;
                hasData = true;
            } 
            else if (currentPieState.level === 3 && record.level1 === currentPieState.level1Target && record.level2 === currentPieState.level2Target) {
                sourceMap[record.level3] = (sourceMap[record.level3] || 0) + record.count;
                hasData = true;
            }
        }
    });

    let sortedSources = [];
    if (!hasData) {
        sortedSources = [{ label: 'No Data Found', value: 1 }];
    } else {
        sortedSources = Object.keys(sourceMap).map(key => ({ label: key, value: sourceMap[key] }));
        sortedSources.sort((a, b) => b.value - a.value);
    }

    let labels = sortedSources.map(item => item.label);
    let dataValues = sortedSources.map(item => item.value);

    const titleEl = document.getElementById('pieChartTitle');
    const backBtn = document.getElementById('pieBackButton');

    if (currentPieState.level === 1) {
        titleEl.innerText = 'NATURE OF LETTER';
        if(backBtn) backBtn.style.display = 'none';
    } 
    else if (currentPieState.level === 2) {
        titleEl.innerHTML = `BREAKDOWN: ${currentPieState.level1Target.toUpperCase()} <span style="color: #64748b; font-weight: 600; font-size: 0.65rem; opacity: 0.7; letter-spacing: 0.5px;">(CATEGORY OF REQUESTING/ WRITING PARTY)</span>`;
        if(backBtn) backBtn.style.display = 'block';
    } 
    else if (currentPieState.level === 3) {
        titleEl.innerHTML = `BREAKDOWN: ${currentPieState.level2Target.toUpperCase()} <span style="color: #64748b; font-weight: 600; font-size: 0.65rem; opacity: 0.7; letter-spacing: 0.5px;">(SPECIFIC OFFICE / ENTITY)</span>`;
        if(backBtn) backBtn.style.display = 'block';
    }

    updateTrackingKPIDisplays();

    if (docPieChartInstance) {
        let mappedColors = labels.map((_, i) => pieColorPalette[i % pieColorPalette.length]);
        if (!hasData) mappedColors = ['#e2e8f0'];

        docPieChartInstance.data.labels = labels;
        docPieChartInstance.data.datasets[0].data = dataValues;
        docPieChartInstance.data.datasets[0].backgroundColor = mappedColors;
        
        docPieChartInstance.update();
        updateCustomLegend(labels, dataValues, !hasData);
    } else {
        drawInteractiveDonutChart('docSourcePieChart', labels, dataValues, !hasData);
    }
}

function drawInteractiveDonutChart(canvasId, labels, dataArr, isEmptyState = false) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if(docPieChartInstance) docPieChartInstance.destroy();
    
    let mappedColors = labels.map((_, i) => pieColorPalette[i % pieColorPalette.length]);
    if (isEmptyState) mappedColors = ['#e2e8f0']; 
    
    docPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: labels, 
            datasets: [{ 
                data: dataArr, 
                backgroundColor: mappedColors, 
                borderWidth: 0, 
                borderRadius: 8, 
                spacing: 5,     
                hoverOffset: isEmptyState ? 0 : 15 
            }] 
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            cutout: '55%', 
            layout: { padding: 15 }, 
            animation: { animateScale: true, animateRotate: true, duration: 800, easing: 'easeOutExpo' },
            hover: { mode: 'index', animationDuration: 300 }, 
            onClick: (event, elements, chart) => {
                if (chart.data.labels.length === 1 && chart.data.labels[0] === 'No Data Found') return;
                
                if (elements[0]) {
                    const index = elements[0].index;
                    const label = chart.data.labels[index];
                    
                    if (currentPieState.level === 1) {
                        currentPieState.level = 2;
                        currentPieState.level1Target = label;
                        renderDocPieChart();
                    } else if (currentPieState.level === 2) {
                        currentPieState.level = 3;
                        currentPieState.level2Target = label;
                        renderDocPieChart();
                    }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: (context) => (context.chart.data.labels.length === 1 && context.chart.data.labels[0] === 'No Data Found') ? '#94a3b8' : '#ffffff', 
                    font: (context) => ({ weight: '800', family: 'Inter', size: (context.chart.data.labels.length === 1 && context.chart.data.labels[0] === 'No Data Found') ? 12 : 9 }), 
                    anchor: 'center',
                    align: 'center',
                    formatter: (value, context) => { 
                        if (context.chart.data.labels.length === 1 && context.chart.data.labels[0] === 'No Data Found') return 'No Data';
                        
                        let sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); 
                        if (sum === 0) return ''; 
                        
                        let pctStr = ((value * 100) / sum).toFixed(1);
                        let pctFloat = parseFloat(pctStr);
                        
                        return pctFloat >= 8 ? pctStr + '%' : ''; 
                    } 
                },
                tooltip: {
                    filter: function(tooltipItem) { return tooltipItem.label !== 'No Data Found'; },
                    ...sharedTooltipConfig, 
                    callbacks: {
                        label: function(context) {
                            let suffix = '';
                            if (currentPieState.level < 3) {
                                suffix = ' (Click to zoom)';
                            }
                            
                            let activeNature = (currentPieState.level === 1) ? context.label : currentPieState.level1Target;
                            let unitStr = "Requests"; 
                            
                            if (activeNature === 'Invitation') unitStr = 'Invitations';
                            else if (activeNature === 'For Information') unitStr = 'Information';
                            else if (activeNature === 'Offer/Proposal') unitStr = 'Offers/Proposals';
                            
                            return `${context.raw} ${unitStr}${suffix}`;
                        }
                    }
                }
            }
        }
    });
    updateCustomLegend(labels, dataArr, isEmptyState);
}

function updateCustomLegend(labels, data, isEmptyState = false) {
    const legendContainer = document.getElementById('customLegend');
    if(!legendContainer) return;
    legendContainer.innerHTML = '';
    labels.forEach((label, index) => {
        let color = isEmptyState ? '#e2e8f0' : pieColorPalette[index % pieColorPalette.length];
        let val = isEmptyState ? '-' : data[index];
        legendContainer.innerHTML += `
            <div class="legend-item" style="animation-delay: ${index * 0.04}s;">
                <div class="legend-color" style="background-color: ${color}"></div>
                <div class="legend-text" title="${label}">${label}</div>
                <div class="legend-val">${val}</div>
            </div>
        `;
    });
}

function processTrainingsData(data) {
    let workingData = Array.isArray(data) ? data : [];
    
    globalTrainLineData = []; 
    calDataMap = {}; 
    let latestEventDateObj = null;
    let explicitTitleCounts = {};

    workingData.forEach(row => {
        let dates = getRobustValue(row, ['INCLUSIVE DATES', 'DATES', 'DATE'], ['Column A']);
        let cat = getRobustValue(row, ['CATEGORY'], ['Column B']);
        let title = getRobustValue(row, ['TRAINING/LECTURE'], ['Column C']); 
        let agency = getRobustValue(row, ['AGENCY/OFFICE', 'AGENCY', 'OFFICE'], ['Column D']);

        let participantsRaw = getRobustValue(row, ['PARTICIPANTS', 'PARTICIPANT'], ['Column E']);
        let participantsSafe = participantsRaw ? String(participantsRaw).trim() : 'N/A';

        let paxRaw = getRobustValue(row, ['NO. PAX', 'PAX', 'NO PAX'], ['Column F']);
        let pax = parseInt(paxRaw) || 0;
        let status = getRobustValue(row, ['REMARKS', 'REMARK'], ['Column G']);
        let colG_Facilitator = getRobustValue(row, ['FACILITATOR'], ['Column H']);

        let colI_Title = getRobustValue(row, ['TRAINING/LECTURES'], ['Column I']); 
        let colJ_Freq = getRobustValue(row, ['FREQ', 'FREQUENCY'], ['Column J']);

        let agencySafe = agency ? String(agency).trim() : 'N/A';
        let titleSafe = title ? String(title).trim() : 'Unspecified Event';
        let facSafe = colG_Facilitator ? String(colG_Facilitator).trim() : 'N/A';

        if (cat && String(cat).trim() !== "") {
            let c = String(cat).trim().toUpperCase();
            
            if (dates) {
                let parsedDate = parseTrainingDate(dates);
                if (parsedDate) {
                    if (!latestEventDateObj || parsedDate > latestEventDateObj) {
                        latestEventDateObj = parsedDate;
                    }
                    globalTrainLineData.push({
                        dateObj: parsedDate,
                        rawDates: dates, 
                        title: titleSafe,
                        agency: agencySafe,
                        pax: pax,
                        facilitator: facSafe,
                        category: c,
                        count: 1,
                        timestamp: parsedDate.getTime(),
                        participants: participantsSafe
                    });
                }
            }
        }

        if (colI_Title && String(colI_Title).trim() !== "") {
            let tName = String(colI_Title).trim();
            if (tName.toUpperCase() !== 'TRAINING/LECTURES') {
                let tFreq = parseInt(colJ_Freq) || 0;
                explicitTitleCounts[tName] = tFreq;
            }
        }
    });

    globalTitleCounts = explicitTitleCounts; 
    populateAllList('top-title-list', explicitTitleCounts);

    currentCalDate = latestEventDateObj ? new Date(latestEventDateObj) : new Date();
    initCalendarControls();
    renderCalendar();

    const trainTopMonthFilter = document.getElementById('trainTopMonthFilter');
    let initMonth = trainTopMonthFilter ? trainTopMonthFilter.value : 'all';
    renderTrainingOverview(initMonth);
}

function renderTrainingOverview(monthFilter) {
    let totalPax = 0;
    let categoryCounts = {};
    let statusCounts = {};
    let paxByCategory = {};
    
    globalRemarksDetails = {}; 

    rawTrainingsData.forEach(row => {
        let dates = getRobustValue(row, ['INCLUSIVE DATES', 'DATES', 'DATE'], ['Column A']);
        
        if (monthFilter !== 'all') {
            let parsedDate = parseTrainingDate(dates);
            if (!parsedDate || monthOrder[parsedDate.getMonth()] !== monthFilter.toUpperCase()) {
                return; 
            }
        }

        let cat = getRobustValue(row, ['CATEGORY'], ['Column B']);
        let paxRaw = getRobustValue(row, ['NO. PAX', 'PAX', 'NO PAX'], ['Column F']);
        let pax = parseInt(paxRaw) || 0;
        let status = getRobustValue(row, ['REMARKS', 'REMARK'], ['Column G']);
        let facilitatedBy = getRobustValue(row, ['FACILITATOR'], ['Column H']);

        if (cat && String(cat).trim() !== "") {
            totalPax += pax;
            let c = String(cat).trim().toUpperCase();
            categoryCounts[c] = (categoryCounts[c] || 0) + 1;
            paxByCategory[c] = (paxByCategory[c] || 0) + pax;

            if (status && String(status).trim() !== "") {
                let s = String(status).trim().toUpperCase();
                statusCounts[s] = (statusCounts[s] || 0) + 1;

                if (!globalRemarksDetails[s]) globalRemarksDetails[s] = [];
                globalRemarksDetails[s].push({
                    title: getRobustValue(row, ['TRAINING/LECTURE'], ['Column C']) || 'Unspecified Event',
                    agency: getRobustValue(row, ['AGENCY/OFFICE', 'AGENCY', 'OFFICE'], ['Column D']) || 'N/A',
                    dates: dates || 'N/A'
                });
            }
        }
    });

    const paxBox = document.getElementById('train-kpi-count');
    if (paxBox) {
        paxBox.innerText = totalPax.toLocaleString();
    }

    drawTrainBarChart('trainTypesChart', Object.keys(categoryCounts), Object.values(categoryCounts));
    drawTrainBarChart('trainNumbersChart', Object.keys(paxByCategory), Object.values(paxByCategory)); 
    
    let statusLabels = Object.keys(statusCounts);
    let statusData = Object.values(statusCounts);
    let statusColors = statusLabels.map(label => {
        if (label === 'WITH AAR') return '#10b981'; 
        if (label === 'NO AAR') return '#f43f5e';   
        return '#94a3b8'; 
    });
    drawTrainBarChart('trainStatusChart', statusLabels, statusData, statusColors); 
}

function initCalendarControls() {
    const timeFilter = document.getElementById('trainCalendarFilter');
    const catFilter = document.getElementById('trainCategoryFilter'); 
    const btnPrev = document.getElementById('calPrevBtn');
    const btnNext = document.getElementById('calNextBtn');
    
    if(timeFilter) {
        let newTimeFilter = timeFilter.cloneNode(true);
        timeFilter.parentNode.replaceChild(newTimeFilter, timeFilter);
        newTimeFilter.value = currentCalView;
        newTimeFilter.addEventListener('change', function(e) {
            currentCalView = e.target.value;
            renderCalendar();
        });
    }

    if(catFilter) {
        let newCatFilter = catFilter.cloneNode(true);
        catFilter.parentNode.replaceChild(newCatFilter, catFilter);
        newCatFilter.value = currentCalCategory;
        newCatFilter.addEventListener('change', function(e) {
            currentCalCategory = e.target.value;
            renderCalendar(); 
        });
    }

    if(btnPrev) {
        let newPrev = btnPrev.cloneNode(true);
        btnPrev.parentNode.replaceChild(newPrev, btnPrev);
        newPrev.addEventListener('click', function() {
            if(currentCalView === 'monthly') currentCalDate.setMonth(currentCalDate.getMonth() - 1);
            else if(currentCalView === 'quarterly') currentCalDate.setMonth(currentCalDate.getMonth() - 3);
            else if(currentCalView === 'yearly') currentCalDate.setFullYear(currentCalDate.getFullYear() - 1);
            renderCalendar();
        });
    }

    if(btnNext) {
        let newNext = btnNext.cloneNode(true);
        btnNext.parentNode.replaceChild(newNext, btnNext);
        newNext.addEventListener('click', function() {
            if(currentCalView === 'monthly') currentCalDate.setMonth(currentCalDate.getMonth() + 1);
            else if(currentCalView === 'quarterly') currentCalDate.setMonth(currentCalDate.getMonth() + 3);
            else if(currentCalView === 'yearly') currentCalDate.setFullYear(currentCalDate.getFullYear() + 1);
            renderCalendar();
        });
    }
}

function renderCalendar() {
    const container = document.getElementById('trainingCalendarContainer');
    const label = document.getElementById('calCurrentLabel');
    if(!container || !label) return;
    
    calDataMap = {};
    globalTrainLineData.forEach(item => {
        if (currentCalCategory !== 'all' && item.category !== currentCalCategory) return; 
        
        let yyyy = item.dateObj.getFullYear();
        let mm = String(item.dateObj.getMonth() + 1).padStart(2, '0');
        let dd = String(item.dateObj.getDate()).padStart(2, '0');
        let dateKey = `${yyyy}-${mm}-${dd}`;
        
        if(!calDataMap[dateKey]) calDataMap[dateKey] = [];
        calDataMap[dateKey].push(item);
    });

    container.classList.remove('cal-anim-active');
    container.classList.add('cal-anim-enter');
    
    setTimeout(() => {
        let html = '';
        let viewClass = `cal-view-${currentCalView}`;
        
        let targetYear = currentCalDate.getFullYear();
        let targetMonth = currentCalDate.getMonth();
        
        if (currentCalView === 'monthly') {
            label.innerText = `${monthOrder[targetMonth]} ${targetYear}`;
            html = `<div class="cal-grid-container ${viewClass}">${buildMonthHTML(targetYear, targetMonth, false)}</div>`;
        } else if (currentCalView === 'quarterly') {
            let q = Math.floor(targetMonth / 3);
            let qStartMonth = q * 3;
            label.innerText = `Q${q + 1} ${targetYear}`;
            let m1 = buildMonthHTML(targetYear, qStartMonth, true);
            let m2 = buildMonthHTML(targetYear, qStartMonth + 1, true);
            let m3 = buildMonthHTML(targetYear, qStartMonth + 2, true);
            html = `<div class="cal-grid-container ${viewClass}">${m1}${m2}${m3}</div>`;
        } else if (currentCalView === 'yearly') {
            label.innerText = `${targetYear}`;
            let monthsHtml = '';
            for(let i = 0; i < 12; i++) {
                monthsHtml += buildMonthHTML(targetYear, i, true);
            }
            html = `<div class="cal-grid-container ${viewClass}">${monthsHtml}</div>`;
        }
        
        container.innerHTML = html;
        
        void container.offsetWidth;
        container.classList.remove('cal-anim-enter');
        container.classList.add('cal-anim-active');
        
    }, 250); 
}

function buildMonthHTML(year, month, isSmallScale) {
    let daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay(); 
    
    let html = `<div class="cal-month">`;
    html += `<div class="cal-month-title">${monthOrder[month]}</div>`;
    html += `<div class="cal-weekdays"><div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div></div>`;
    html += `<div class="cal-days">`;
    
    for(let i=0; i<firstDay; i++) {
        html += `<div class="cal-day empty"></div>`;
    }
    
    for(let day=1; day<=daysInMonth; day++) {
        let padMonth = String(month + 1).padStart(2, '0');
        let padDay = String(day).padStart(2, '0');
        let dateKey = `${year}-${padMonth}-${padDay}`;
        let events = calDataMap[dateKey];
        
        if (events && events.length > 0) {
            let linesHtml = '';
            let maxLines = 3; 
            for(let j=0; j<Math.min(events.length, maxLines); j++) {
                let lineClass = events[j].category === 'IEC LECTURE/ DRILL' ? 'cal-line-activity' : '';
                linesHtml += `<div class="cal-line ${lineClass}"></div>`;
            }
            if(events.length > maxLines) linesHtml += `<span style="font-size:0.55rem; line-height:4px; color:#64748b; font-weight: 800; margin-left: 2px;">+</span>`;
            
            let tooltipListHtml = events.map((e, idx) => `
                <div style="margin-bottom:${idx === events.length-1 ? '0' : '8px'}; text-align:left;">
                    <div style="display:flex; align-items:flex-start; gap:6px; margin-bottom:4px;">
                        <div class="cal-line ${e.category === 'IEC LECTURE/ DRILL' ? 'cal-line-activity' : ''}" style="width: 12px; height: 4px; flex: none; margin-top: 4px;"></div>
                        <span style="font-size:0.7rem; font-weight:800; color:#ffffff; line-height: 1.2;">${e.title}</span>
                    </div>
                    <div style="padding-left: 18px; font-size: 0.6rem; color: #cbd5e1; line-height: 1.5;">
                        <div style="margin-bottom: 2px;"><span style="font-weight:700; color:#94a3b8;">Date:</span> ${e.rawDates}</div>
                        <div style="margin-bottom: 2px;"><span style="font-weight:700; color:#94a3b8;">Requesting Agency/Office:</span> ${e.agency}</div>
                        <div style="margin-bottom: 2px;"><span style="font-weight:700; color:#94a3b8;">Participants:</span> ${e.participants}</div>
                        <div style="margin-bottom: 2px;"><span style="font-weight:700; color:#94a3b8;">Total Pax:</span> ${e.pax}</div>
                        <div style="margin-bottom: 2px;"><span style="font-weight:700; color:#94a3b8;">Facilitator:</span> ${e.facilitator}</div>
                    </div>
                </div>
            `).join('');

            let tooltipHtml = `
                <div class="custom-tooltip cal-tooltip" style="z-index: 999; pointer-events: none; bottom: 110%; min-width: 220px; white-space: normal; padding: 12px;">
                    <div style="color:#94a3b8; font-size:0.55rem; text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px; border-bottom:1px solid #334155; padding-bottom:6px;">${monthOrder[month]} ${day}, ${year}</div>
                    ${tooltipListHtml}
                </div>
            `;
            
            html += `
                <div class="cal-day has-event has-tooltip">
                    ${day}
                    <div class="cal-event-indicator">${linesHtml}</div>
                    ${tooltipHtml}
                </div>
            `;
        } else {
            html += `<div class="cal-day">${day}</div>`;
        }
    }
    
    html += `</div></div>`;
    return html;
}

function drawTrainBarChart(canvasId, labels, dataArr, customColors = null) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (!labels || labels.length === 0) {
        labels = ["No Data"];
        dataArr = [0];
    }

    if (window[canvasId + 'Inst']) window[canvasId + 'Inst'].destroy();

    let colors = customColors || labels.map((_, i) => pieColorPalette[(i + 2) % pieColorPalette.length]);

    window[canvasId + 'Inst'] = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ data: dataArr, backgroundColor: colors, borderRadius: 4, borderWidth: 0, maxBarThickness: 30 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 25, left: 10, right: 10, bottom: 0 } }, 
            plugins: { legend: { display: false }, tooltip: sharedTooltipConfig, datalabels: { display: true, align: 'top', anchor: 'end', color: '#64748b', font: { weight: 'bold' } } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 9 }, color: '#64748b' }, border: {display: false} },
                y: { grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { family: 'Inter', size: 10 }, color: '#94a3b8' }, beginAtZero: true, grace: '20%', border: {display: false} } 
            }
        }
    });
}

function populateAllList(containerId, dataObj) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    let sorted = Object.keys(dataObj).map(k => ({name: k, count: dataObj[k]})).sort((a,b) => b.count - a.count);
    
    if (sorted.length === 0) {
        container.innerHTML = `<div style="color: #94a3b8; font-size: 0.7rem; padding: 10px;">No Data</div>`;
        return;
    }

    sorted.forEach((item, index) => {
        container.innerHTML += `
            <div class="legend-item" style="animation-delay: ${index * 0.04}s;">
                <div class="legend-text" title="${item.name}" style="flex: 1;">${index + 1}. ${item.name}</div>
                <div class="legend-val">${item.count}</div>
            </div>
        `;
    });
}

function populateModalList(dataObj) {
    const container = document.getElementById('modal-title-list');
    if (!container) return;
    container.innerHTML = '';
    
    let sorted = Object.keys(dataObj).map(k => ({name: k, count: dataObj[k]})).sort((a,b) => b.count - a.count);
    
    if (sorted.length === 0) {
        container.innerHTML = `<div style="color: #94a3b8; font-size: 0.9rem; padding: 20px; text-align:center;">No Data Available</div>`;
        return;
    }

    sorted.forEach((item, index) => {
        container.innerHTML += `
            <div class="legend-item" style="animation-delay: ${index * 0.02}s;">
                <div class="legend-text" style="font-size: 0.85rem; padding-right: 15px;">
                    <span style="color:#64748b; font-weight:800; margin-right:8px;">${index + 1}.</span> 
                    ${item.name}
                </div>
                <div class="legend-val">${item.count}</div>
            </div>
        `;
    });
}

function populateRemarksModal(detailsObj) {
    const container = document.getElementById('modal-remarks-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (!detailsObj || Object.keys(detailsObj).length === 0) {
        container.innerHTML = `<div style="color: #94a3b8; font-size: 0.9rem; padding: 20px; text-align:center;">No Data Available</div>`;
        return;
    }

    for (let status in detailsObj) {
        let items = detailsObj[status];
        if(!items || items.length === 0) continue;

        let color = status === 'WITH AAR' ? '#10b981' : (status === 'NO AAR' ? '#f43f5e' : '#64748b'); 

        let html = `<h3 style="font-size: 0.9rem; color: ${color}; margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">${status} (${items.length})</h3>`;
        
        items.forEach((item, index) => {
            html += `
                <div class="legend-item" style="padding: 12px 0; border-bottom: 1px solid #f8fafc; align-items: flex-start; animation-delay: ${index * 0.02}s;">
                    <div class="legend-text" style="font-size: 0.8rem; white-space: normal; line-height: 1.4;">
                        <span style="font-weight: 800; color: #1e293b;">${item.title}</span><br>
                        <span style="font-size: 0.7rem; color: #64748b;">${item.agency} &nbsp;|&nbsp; ${item.dates}</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML += html;
    }
}

// -------------------------------------------------------------
// NEW LOGIC: processVolunteersData & renderPictogram
// -------------------------------------------------------------
function processVolunteersData(data) {
    let totalOrgs = 0;
    let totalIndividualsInOrgs = 0;
    let standaloneIndividuals = 0;
    let orgList = []; 
    globalOrgGenderMap = {}; 

    const tbody = document.querySelector('#volunteerTable tbody');
    if(!tbody) return;
    tbody.innerHTML = ''; 

    // First Pass: Extract Summary Logic
    data.forEach(row => {
        let keys = Object.keys(row);
        if (keys.length < 6) return;

        let orgKey = keys.find(k => k.toUpperCase().includes('LIST OF ORGANIZATION')) || keys[5]; 
        let countKey = keys.find(k => k.toUpperCase().includes('TOTAL COUNT VOLUNTEER')) || keys[6]; 
        let individualKey = keys.find(k => k.toUpperCase().includes('INDIVIDUAL VOLUNTEER')) || keys[8]; 

        let orgName = row[orgKey] ? row[orgKey].trim() : '';
        let orgCount = Number(row[countKey]) || 0;
        let standaloneCount = Number(row[individualKey]) || 0;

        if (standaloneCount > 0) {
            standaloneIndividuals += standaloneCount;
        }

        if (orgName && orgCount > 0 && !orgName.toUpperCase().includes('TOTAL')) {
            totalOrgs++; 
            totalIndividualsInOrgs += orgCount; 
            orgList.push({ name: orgName, count: orgCount });
        }
    });

    orgList.sort((a, b) => b.count - a.count);
    const maxCount = orgList.length > 0 ? orgList[0].count : 1;

    // Initialize Gender Map from Official List
    orgList.forEach(org => {
        globalOrgGenderMap[org.name] = { Male: 0, Female: 0, TallyTotal: 0, OfficialTotal: org.count };
    });

    // Second Pass: Extract Gender Breakdown Logic
    data.forEach(row => {
        let keys = Object.keys(row);
        let indOrgKey = keys.find(k => k.trim().toUpperCase() === 'ORGANIZATION') || keys[3];
        let indGenderKey = keys.find(k => k.trim().toUpperCase() === 'GENDER') || keys[4];

        let indOrg = row[indOrgKey] ? String(row[indOrgKey]).trim() : '';
        let indGender = row[indGenderKey] ? String(row[indGenderKey]).trim() : '';

        if (indOrg && indGender) {
            let search = indOrg.toUpperCase();
            
            // Fuzzy Match
            let matchedOrgObj = orgList.find(o => o.name.toUpperCase() === search);
            if (!matchedOrgObj) {
                matchedOrgObj = orgList.find(o => o.name.toUpperCase().includes(search) || search.includes(o.name.toUpperCase()));
            }

            if (matchedOrgObj) {
                let finalOrgName = matchedOrgObj.name;
                let genderUpper = indGender.toUpperCase();
                if(genderUpper.includes('MALE') && !genderUpper.includes('FEMALE')) {
                    globalOrgGenderMap[finalOrgName].Male++;
                } else if(genderUpper.includes('FEMALE')) {
                    globalOrgGenderMap[finalOrgName].Female++;
                }
                globalOrgGenderMap[finalOrgName].TallyTotal++;
            }
        }
    });

    // Populate Data Table
    orgList.forEach((org, index) => {
        let tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 0.03}s`;
        
        let tdName = document.createElement('td');
        tdName.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="color:#94a3b8; font-weight:800; font-size:0.6rem;">${index + 1}</span>
                <span>${org.name}</span>
            </div>
        `;
        
        let tdCount = document.createElement('td');
        let percentage = (org.count / maxCount) * 100;
        tdCount.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; width:100%;">
                <span style="width: 30px; font-weight:800;">${org.count.toLocaleString()}</span>
                <div style="flex:1; height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:${percentage}%; background:linear-gradient(90deg, #06b6d4, #2563eb); border-radius:3px; transition: width 1s ease-in-out;"></div>
                </div>
            </div>
        `; 
        
        tr.appendChild(tdName);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
    });

    // Update the 3 Metric Boxes
    document.getElementById('vol-orgs').innerText = totalOrgs.toLocaleString(); 
    const orgMembersEl = document.getElementById('vol-org-members');
    if (orgMembersEl) orgMembersEl.innerText = totalIndividualsInOrgs.toLocaleString();
    document.getElementById('vol-ind').innerText = standaloneIndividuals.toLocaleString();

    // Populate Custom Dropdown Using ONLY Official orgList
    const dropdownContainer = document.getElementById('orgGenderDropdown');
    const selectedText = document.getElementById('orgGenderSelectedText');
    const optionsContainer = document.getElementById('orgGenderOptions');

    if (dropdownContainer && selectedText && optionsContainer) {
        optionsContainer.innerHTML = '';
        
        if (orgList.length > 0) {
            orgList.forEach((org, idx) => {
                let opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                if(idx === 0) opt.classList.add('selected');
                opt.innerText = org.name;
                opt.onclick = function() {
                    Array.from(optionsContainer.children).forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedText.innerText = org.name;
                    dropdownContainer.classList.remove('active');
                    renderPictogram(org.name);
                };
                optionsContainer.appendChild(opt);
            });
            
            selectedText.innerText = orgList[0].name;
            renderPictogram(orgList[0].name);
        } else {
            optionsContainer.innerHTML = '<div class="custom-dropdown-option">No Data</div>';
            selectedText.innerText = "No Data";
            renderPictogram('');
        }

        // re-bind click listener
        const selectedBox = document.getElementById('orgGenderSelected');
        let newBox = selectedBox.cloneNode(true);
        selectedBox.parentNode.replaceChild(newBox, selectedBox);
        
        newBox.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownContainer.classList.toggle('active');
        });
    }
}

function renderPictogram(orgName) {
    const container = document.getElementById('pictogramContainer');
    if(!container) return;

    let data = globalOrgGenderMap[orgName];
    if (!data || data.OfficialTotal === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; color:#94a3b8; font-weight:600;">No data available for this organization.</div>`;
        return;
    }

    let displayMale = 0;
    let displayFemale = 0;
    let pctMale = 0;
    let pctFemale = 0;

    if (data.TallyTotal > 0) {
        let ratioMale = data.Male / data.TallyTotal;
        displayMale = Math.round(data.OfficialTotal * ratioMale);
        displayFemale = data.OfficialTotal - displayMale;
        
        pctMale = Math.round(ratioMale * 100);
        pctFemale = 100 - pctMale;
    } else {
        // No gender breakdown available, but we have total count
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color:#94a3b8;">
                <div style="font-size: 2rem; font-weight: 800; color: #1e293b;">${data.OfficialTotal}</div>
                <div style="font-weight:600; text-transform: uppercase; font-size: 0.7rem; margin-top: 5px;">Total Volunteers</div>
                <div style="font-size: 0.65rem; margin-top: 10px;">Gender breakdown not specified in individual records.</div>
            </div>
        `;
        return;
    }

    let maleIcon = `<svg viewBox="0 0 320 512" width="14" height="14" fill="currentColor" style="margin:2px;"><path d="M112 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm40 304V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V256.9L59.4 304.5c-9.1 15.1-28.8 20-43.9 10.9s-20-28.8-10.9-43.9l58.3-97c17.4-28.9 48.6-46.6 82.3-46.6h29.7c33.7 0 64.9 17.7 82.3 46.6l58.3 97c9.1 15.1 4.2 34.8-10.9 43.9s-34.8 4.2-43.9-10.9L232 256.9V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V352H152z"/></svg>`;
    let femaleIcon = `<svg viewBox="0 0 320 512" width="14" height="14" fill="currentColor" style="margin:2px;"><path d="M160 48a48 48 0 1 1 0 96 48 48 0 1 1 0-96zM74.5 289.1c-7.6 13-24.5 17.3-37.5 9.8s-17.3-24.5-9.8-37.5L65.6 195C82.8 165.6 114 148 148.1 148h23.8c34.1 0 65.3 17.6 82.5 47l38.4 66.5c7.6 13 3.2 29.9-9.8 37.5s-29.9 3.2-37.5-9.8L207.2 222V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V352H176v128c0 17.7-14.3 32-32 32s-32-14.3-32-32V222L74.5 289.1z"/></svg>`;

    let maleIconsHtml = '';
    let renderMaleCount = displayMale > 300 ? 300 : displayMale;
    let renderFemaleCount = displayFemale > 300 ? 300 : displayFemale;
    let noteHtml = (displayMale > 300 || displayFemale > 300) ? `<div style="font-size: 0.6rem; color: #94a3b8; text-align: center; margin-top: 10px;">*Icons capped at 300 for browser performance.</div>` : '';

    for(let i=0; i<renderMaleCount; i++) maleIconsHtml += maleIcon;
    let femaleIconsHtml = '';
    for(let i=0; i<renderFemaleCount; i++) femaleIconsHtml += femaleIcon;

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px;">
            <div style="background:#eff6ff; border: 1px solid #bfdbfe; border-radius:8px; padding:10px 16px; flex:1; margin-right:8px; display:flex; flex-direction:column; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <span style="font-size:0.6rem; font-weight:800; color:#3b82f6; text-transform:uppercase; letter-spacing: 0.5px;">Male</span>
                <span style="font-size:1.4rem; font-weight:800; color:#1e40af; margin-top:2px;">${displayMale}</span>
                <span style="font-size:0.65rem; font-weight:700; color:#60a5fa; margin-top:2px;">${pctMale}%</span>
            </div>
            <div style="background:#fff1f2; border: 1px solid #fecdd3; border-radius:8px; padding:10px 16px; flex:1; margin-left:8px; display:flex; flex-direction:column; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <span style="font-size:0.6rem; font-weight:800; color:#f43f5e; text-transform:uppercase; letter-spacing: 0.5px;">Female</span>
                <span style="font-size:1.4rem; font-weight:800; color:#9f1239; margin-top:2px;">${displayFemale}</span>
                <span style="font-size:0.65rem; font-weight:700; color:#fb7185; margin-top:2px;">${pctFemale}%</span>
            </div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:16px;">
            ${displayMale > 0 ? `
            <div>
                <div style="font-size:0.65rem; font-weight:800; color:#3b82f6; margin-bottom:4px; text-transform:uppercase;">Male Volunteers</div>
                <div style="color:#60a5fa; display:flex; flex-wrap:wrap;">
                    ${maleIconsHtml}
                </div>
            </div>` : ''}
            
            ${displayFemale > 0 ? `
            <div>
                <div style="font-size:0.65rem; font-weight:800; color:#f43f5e; margin-bottom:4px; text-transform:uppercase;">Female Volunteers</div>
                <div style="color:#fb7185; display:flex; flex-wrap:wrap;">
                    ${femaleIconsHtml}
                </div>
            </div>` : ''}
        </div>
        ${noteHtml}
    `;
}

// -------------------------------------------------------------
// FIREBASE AUTHENTICATION
// -------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyDSCB9jQIzyn9WxGZ58sLkyJPHCj5oeEKQ", 
    authDomain: "pdrrmo-dashboard.firebaseapp.com",
    projectId: "pdrrmo-dashboard",
    storageBucket: "pdrrmo-dashboard.firebasestorage.app",
    messagingSenderId: "555106842078",
    appId: "1:555106842078:web:38f0275bc89499669ad94f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
    const loginOverlay = document.getElementById('login-overlay');
    const loader = document.getElementById('global-loader');
    
    if (user) {
        if(loginOverlay) loginOverlay.style.display = 'none';
        if(loader) {
            loader.style.display = 'flex';
            loader.style.visibility = 'visible';
            loader.style.opacity = '1';
        }
        loadAllData(); 
    } else {
        if(loginOverlay) loginOverlay.style.display = 'flex';
        if(loader) loader.style.display = 'none';
    }
});

window.handleLogin = function() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    if(!email || !pass) {
        if(errorEl) errorEl.innerText = "Please enter both email and password.";
        return;
    }

    if(btn) btn.innerText = "AUTHENTICATING...";
    if(errorEl) errorEl.innerText = "";

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            if(btn) btn.innerText = "SECURE LOGIN";
        })
        .catch(error => {
            if(btn) btn.innerText = "SECURE LOGIN";
            if(errorEl) errorEl.innerText = "Invalid credentials. Please try again.";
            console.error("Login failed:", error.message);
        });
}

window.handleLogout = function() {
    auth.signOut().then(() => {
        rawOperationsData = [];
        rawDocumentsData = [];
        rawTrainingsData = [];
        location.reload(); 
    });
}

window.openMapModal = function(url, title) {
    const modal = document.getElementById('mapModal');
    const titleEl = document.getElementById('mapModalTitle');
    const bodyEl = document.getElementById('mapModalBody');

    if(titleEl) titleEl.innerText = title;
    if(bodyEl) bodyEl.innerHTML = `<iframe src="${url}" allowfullscreen></iframe>`;
    if(modal) modal.classList.add('active');
}

window.closeMapModal = function() {
    const modal = document.getElementById('mapModal');
    const bodyEl = document.getElementById('mapModalBody');
    
    if(modal) modal.classList.remove('active');
    
    setTimeout(() => {
        if(bodyEl) bodyEl.innerHTML = '';
    }, 300);
}

const mapModalEl = document.getElementById('mapModal');
if(mapModalEl) {
    mapModalEl.addEventListener('click', function(e) {
        if(e.target === this) closeMapModal();
    });
}
