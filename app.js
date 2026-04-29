Chart.register(ChartDataLabels);

// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv", // <-- MUST BE FILLED
    documents: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4FYdO-pxACzJxrw7vEMLJKsxgEBQm_8Afh_hsKFxhxA3eiJz5kNZLkr3ArNmoEIVo5BtPBbNIz-oz/pub?gid=433918484&single=true&output=csv",   // <-- MUST BE FILLED
    volunteers: ""
};

let docPieChartInstance = null;
let docLineChartInstance = null;
let mainPieLabels = [];
let mainPieData = [];
let detailedPieData = {};
let globalLineData = []; 

function scrollToSection(panelId) {
    const section = document.getElementById(panelId);
    if(section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const panels = document.querySelectorAll('.panel');
    const navLinks = document.querySelectorAll('.sidebar li:not(.section-title)');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => link.classList.remove('active'));
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.sidebar li[onclick="scrollToSection('${id}')"]`);
                if(activeLink) activeLink.classList.add('active');
            }
        });
    }, { threshold: 0.3 }); 

    panels.forEach(panel => observer.observe(panel));

    document.getElementById('pieBackButton').addEventListener('click', function() {
        if(docPieChartInstance) {
            docPieChartInstance.data.labels = mainPieLabels;
            docPieChartInstance.data.datasets[0].data = mainPieData;
            docPieChartInstance.update();
        }
        this.style.display = 'none';
        document.getElementById('pieChartTitle').innerText = 'Received Request from PDRRM Office:';
        updateCustomLegend(mainPieLabels, mainPieData);
    });

    document.getElementById('lineChartFilter').addEventListener('change', function(e) {
        renderLineChartByTimeframe(e.target.value);
    });
});

function loadAllData() {
    const cacheBuster = new Date().getTime(); 

    if(sheetUrls.operations.includes("http")) {
        const opSeparator = sheetUrls.operations.includes("?") ? "&" : "?";
        Papa.parse(sheetUrls.operations + opSeparator + "t=" + cacheBuster, { 
            download: true, header: true, skipEmptyLines: true, 
            complete: function(results) { processOperationsData(results.data); } 
        });
    }
    
    if(sheetUrls.documents.includes("http")) {
        const docSeparator = sheetUrls.documents.includes("?") ? "&" : "?";
        Papa.parse(sheetUrls.documents + docSeparator + "t=" + cacheBuster, { 
            download: true, header: true, skipEmptyLines: true, 
            complete: function(results) { processDocumentsData(results.data); } 
        });
    }
}

// 🟢 BULLETPROOF DATE PARSER (Fixes the Feb 26 Drop-off bug) 🟢
function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    
    // First, try standard JS parsing
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    
    // If standard fails (e.g., DD/MM/YYYY), force split and flip to MM/DD/YYYY
    let parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
        let fallbackDate = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
        if (!isNaN(fallbackDate.getTime())) return fallbackDate;
    }
    
    return null;
}

// 3. Process DOCUMENTS Data
function processDocumentsData(data) {
    let totalReq = 0, totalAction = 0, catered = 0, invAttended = 0;
    let notCatered = 0, others = 0, invNotAttended = 0, cancelled = 0, noAction = 0;

    let sourceMap = {};
    detailedPieData = {};
    globalLineData = []; 
    let totalsCaptured = false;

    data.forEach(row => {
        let rawOffice = row['Received From Office'] || row['RECEIVED FROM OFFICE'] || '';
        let dateStr = row['Date Received'] || row['DATE RECEIVED'] || row['Date'] || '';
        
        let keys = Object.keys(row);
        let reqs = 0;

        // 🔴 EXPLICIT COLUMN M OVERRIDE 🔴
        // Target index 12 (which is the 13th column: Column M)
        if (keys.length > 12 && Number(row[keys[12]]) > 0) {
            reqs = Number(row[keys[12]]);
        } else if (Number(row['Column M']) > 0) {
            reqs = Number(row['Column M']);
        } else if (Number(row['COLUMN M']) > 0) {
            reqs = Number(row['COLUMN M']);
        } else {
            reqs = Number(row['Total Requests']) || Number(row['TOTAL REQUESTS']) || 0;
        }

        // Add valid row count to the master total
        if (reqs > 0) {
            totalReq += reqs; 
        }

        // 🟢 APPLY BULLETPROOF DATE PARSER 🟢
        if (dateStr && reqs > 0) {
            let parsedDate = parseCustomDate(dateStr);
            if (parsedDate) {
                globalLineData.push({ dateObj: parsedDate, count: reqs, timestamp: parsedDate.getTime() });
            }
        }

        // PIE CHART LOGIC
        if (rawOffice && reqs > 0) {
            let upperOffice = rawOffice.toUpperCase();
            let parentCategory = rawOffice; 

            const scrubRules = [
                { category: 'PGT & PGO Offices', keywords: ['PGT', 'PROVINCIAL GOV', 'PGO', 'PGSO', 'BAC'] },
                { category: '3rd Mechanized Infantry', keywords: ['3RD MECH', 'MECHANIZED INFANTRY', '31ST MECH'] },
                { category: '522nd Engineer Battalion', keywords: ['522ND', 'ENGINEER'] },
                { category: 'BFP Tarlac', keywords: ['BFP', 'FIRE'] },
                { category: 'DSWD Facilities', keywords: ['DSWD', 'LINGAP'] },
                { category: 'DepEd / Schools', keywords: ['DEPED', 'SCHOOL', 'ACADEMIA'] },
                { category: 'Hospitals & Health', keywords: ['DOH', 'CLDH', 'HOSPITAL', 'HEALTH', 'TPH', 'CLCHD'] },
                { category: 'Local Government (LGUs/Brgys)', keywords: ['BRGY', 'BARANGAY', 'CITY GOV', 'MUNICIPAL'] },
                { category: 'National Gov Agencies', keywords: ['DOST', 'DICT', 'DILG', 'COA', 'OCD', 'RDRRMC', 'CDRRMO'] },
                { category: 'NGOs & Private Orgs', keywords: ['FOUNDATION', 'INC.', 'CHURCH', 'CLUB', 'SCOUT', 'COMPANY'] },
                { category: 'Private Individuals', keywords: ['N/A', 'PRIVATE', 'GENERAL PUBLIC'] }
            ];

            for (let rule of scrubRules) {
                if (rule.keywords.some(keyword => upperOffice.includes(keyword))) {
                    parentCategory = rule.category;
                    break; 
                }
            }

            sourceMap[parentCategory] = (sourceMap[parentCategory] || 0) + reqs;
            if (!detailedPieData[parentCategory]) detailedPieData[parentCategory] = {};
            detailedPieData[parentCategory][rawOffice] = (detailedPieData[parentCategory][rawOffice] || 0) + reqs;
        }

        // OTHER KPIs
        if (!totalsCaptured && (row['TOTAL ACTION TAKEN (OVERALL)'] || row['TOTAL REQUEST CATERED'])) {
            totalAction = Number(row['TOTAL ACTION TAKEN (OVERALL)']) || 0;
            catered = Number(row['TOTAL REQUEST CATERED']) || 0;
            invAttended = Number(row['TOTAL INVITATION ATTENDED']) || 0;
            notCatered = Number(row['TOTAL REQUEST NOT CATERED']) || 0;
            others = Number(row['OTHERS, SPECIFY:'] || row['OTHERS']) || 0;
            invNotAttended = Number(row['TOTAL INVITATION NOT ATTENDED']) || 0;
            cancelled = Number(row['TOTAL CANCELLED']) || 0;
            noAction = Number(row['TOTAL NO ACTION']) || 0;
            totalsCaptured = true;
        }
    });

    // Pushing the targeted Column M / Total Request value to the dashboard
    document.getElementById('doc-kpi-request').innerText = totalReq; 
    document.getElementById('doc-kpi-action').innerText = totalAction;
    document.getElementById('doc-kpi-catered').innerText = catered;
    document.getElementById('doc-kpi-inv-att').innerText = invAttended;
    document.getElementById('doc-kpi-not-catered').innerText = notCatered;
    document.getElementById('doc-kpi-others').innerText = others;
    document.getElementById('doc-kpi-inv-not').innerText = invNotAttended;
    document.getElementById('doc-kpi-cancelled').innerText = cancelled;
    document.getElementById('doc-kpi-no-action').innerText = noAction;

    let sortedSources = Object.keys(sourceMap).map(key => ({ label: key, value: sourceMap[key] }));
    sortedSources.sort((a, b) => b.value - a.value);

    mainPieLabels = sortedSources.map(item => item.label);
    mainPieData = sortedSources.map(item => item.value);

    drawInteractiveDonutChart('docSourcePieChart', mainPieLabels, mainPieData);

    // Initial Load defaults to Daily view (So you see the full curve)
    renderLineChartByTimeframe('daily');
}

function renderLineChartByTimeframe(timeframe) {
    let groupedObj = {};
    
    // Sort chronologically based on the true timestamp
    let sortedData = [...globalLineData].sort((a, b) => a.timestamp - b.timestamp);

    sortedData.forEach(item => {
        let key = "";
        if (timeframe === 'monthly') {
            key = item.dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        } else if (timeframe === 'yearly') {
            key = item.dateObj.getFullYear().toString();
        } else { // daily
            key = item.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        groupedObj[key] = (groupedObj[key] || 0) + item.count;
    });

    const labels = Object.keys(groupedObj);
    const dataValues = Object.values(groupedObj);
    
    if(labels.length === 0) {
        drawLineChart('docDateLineChart', ['No Date Data Detected'], [0]);
    } else {
        drawLineChart('docDateLineChart', labels, dataValues);
    }
}


function processOperationsData(data) {
    const labels = [];
    const vehicular = [], roadside = [], patient = [], medical = [], standby = [];
    const others = [], clearing = [], firetruck = [], hauling = [], ledvan = [];
    const monthlyTotalServices = [];

    let total1st = 0, total2nd = 0, total3rd = 0, totalOutside = 0;

    data.forEach(row => {
        if(row['MONTH']) { 
            labels.push(row['MONTH']);
            
            vehicular.push(Number(row['VEHICULAR ACCIDENT']) || 0);
            roadside.push(Number(row['ROADSIDE ASSISTANCE']) || 0);
            patient.push(Number(row['PATIENT TRANSPORT']) || 0);
            medical.push(Number(row['MEDICAL']) || 0);
            standby.push(Number(row['STANDBY MEDIC, MARSHAL & VIP']) || 0);
            
            others.push(Number(row['OTHERS']) || 0);
            clearing.push(Number(row['CLEARING OPERATIONS']) || 0);
            firetruck.push(Number(row['FIRETRUCK']) || 0);
            hauling.push(Number(row['HAULING']) || 0);
            ledvan.push(Number(row['LEDVAN TRUCK']) || 0);

            monthlyTotalServices.push(Number(row['GRAND TOTAL']) || 0);

            for (let key in row) {
                let upperKey = key.toUpperCase();
                if (upperKey.includes("1ST DISTRICT")) { total1st += Number(row[key]) || 0; }
                if (upperKey.includes("2ND DISTRICT")) { total2nd += Number(row[key]) || 0; }
                if (upperKey.includes("3RD DISTRICT")) { total3rd += Number(row[key]) || 0; }
                if (upperKey.includes("OUTSIDE")) { totalOutside += Number(row[key]) || 0; }
            }
        }
    });

    document.getElementById('kpi-1st').innerText = total1st;
    document.getElementById('kpi-2nd').innerText = total2nd;
    document.getElementById('kpi-3rd').innerText = total3rd;
    document.getElementById('kpi-outside').innerText = totalOutside;

    drawDonutChart('monthlyPieChart', labels, monthlyTotalServices);
    drawHorizontalBar('vehicularChart', labels, 'Vehicular Accident', vehicular, '#2563eb');
    drawHorizontalBar('roadsideChart', labels, 'Roadside Assistance', roadside, '#2563eb');
    drawHorizontalBar('patientChart', labels, 'Patient Transport', patient, '#2563eb');
    drawHorizontalBar('medicalChart', labels, 'Medical', medical, '#2563eb');
    drawHorizontalBar('standbyChart', labels, 'Standby Medic, Marshal & VIP', standby, '#2563eb');
    drawCombinedBarChart('combinedChart', labels, others, clearing, firetruck, hauling, ledvan);
}

// ----------------------------------------------------
// CHART GENERATORS
// ----------------------------------------------------
const pieColorPalette = ['#e11d48', '#06b6d4', '#2563eb', '#ea580c', '#16a34a', '#9333ea', '#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#d946ef', '#f97316', '#14b8a6', '#6366f1'];

function drawInteractiveDonutChart(canvasId, labels, dataArr) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if(docPieChartInstance) docPieChartInstance.destroy();
    
    docPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: dataArr, backgroundColor: pieColorPalette, borderWidth: 1, borderColor: '#ffffff', hoverOffset: 8 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '55%',
            onClick: (event, elements, chart) => {
                if (elements[0]) {
                    const index = elements[0].index;
                    const label = chart.data.labels[index];
                    
                    if (detailedPieData[label] && Object.keys(detailedPieData[label]).length > 1 && document.getElementById('pieBackButton').style.display !== 'block') {
                        let subData = detailedPieData[label];
                        let sortedSub = Object.keys(subData).map(key => ({ l: key, v: subData[key] })).sort((a, b) => b.v - a.v);
                        
                        chart.data.labels = sortedSub.map(i => i.l);
                        chart.data.datasets[0].data = sortedSub.map(i => i.v);
                        chart.update(); 

                        document.getElementById('pieChartTitle').innerText = 'Breakdown: ' + label;
                        document.getElementById('pieBackButton').style.display = 'block';
                        updateCustomLegend(chart.data.labels, chart.data.datasets[0].data);
                    }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#ffffff', font: { weight: '700', family: 'Inter', size: 10 },
                    formatter: (value, context) => {
                        let sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        let percent = ((value * 100) / sum).toFixed(1);
                        return percent > 4 ? percent + '%' : ''; 
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let suffix = '';
                            if (document.getElementById('pieBackButton').style.display !== 'block' && detailedPieData[context.label] && Object.keys(detailedPieData[context.label]).length > 1) {
                                suffix = ' (Click to zoom into breakdown)';
                            }
                            return ' ' + context.label + ': ' + context.raw + ' requests' + suffix;
                        }
                    }
                }
            }
        }
    });
    updateCustomLegend(labels, dataArr);
}

function updateCustomLegend(labels, data) {
    const legendContainer = document.getElementById('customLegend');
    legendContainer.innerHTML = '';
    labels.forEach((label, index) => {
        let color = pieColorPalette[index % pieColorPalette.length];
        legendContainer.innerHTML += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${color}"></div>
                <div class="legend-text" title="${label}">${label}</div>
                <div class="legend-val">${data[index]}</div>
            </div>
        `;
    });
}

function drawLineChart(canvasId, labels, dataArr) {
    const ctx = document.getElementById(canvasId).getContext('2d');
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
            plugins: { datalabels: { display: false }, legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { family: 'Inter', size: 12 }, bodyFont: { family: 'Inter', size: 12 }, padding: 10, displayColors: false } }, 
            scales: { 
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 9 }, color: '#64748b', maxTicksLimit: 12 } }, 
                y: { grid: { color: '#f1f5f9', drawBorder: false }, beginAtZero: true, ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' } } 
            } 
        }
    });
}

function drawDonutChart(canvasId, labels, dataArr) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: dataArr, backgroundColor: ['#2563eb', '#06b6d4', '#e11d48', '#ea580c', '#16a34a', '#9333ea'], borderWidth: 2, borderColor: '#ffffff' }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', layout: { padding: 0 }, plugins: { legend: { display: false }, datalabels: { color: '#ffffff', font: { weight: '600', family: 'Inter', size: 9 }, formatter: (value, context) => { let sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); if (sum === 0) return ''; return ((value * 100) / sum).toFixed(1) + '%'; } } } }
    });
}

const commonChartOptions = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { datalabels: { display: false }, legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true, font: { family: 'Inter', size: 10 } } } },
    scales: { x: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter', size: 10 } } }, y: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter', size: 10 } } } },
    elements: { bar: { borderRadius: 3 } } 
};

function drawHorizontalBar(canvasId, labels, labelText, dataArr, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: labelText, data: dataArr, backgroundColor: color, maxBarThickness: 20 }] }, options: commonChartOptions });
}

function drawCombinedBarChart(canvasId, labels, others, clearing, firetruck, hauling, ledvan) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'OTHERS', data: others, backgroundColor: '#2563eb', maxBarThickness: 20 },
                { label: 'CLEARING OPE...', data: clearing, backgroundColor: '#06b6d4', maxBarThickness: 20 },
                { label: 'FIRETRUCK', data: firetruck, backgroundColor: '#e11d48', maxBarThickness: 20 },
                { label: 'HAULING', data: hauling, backgroundColor: '#ea580c', maxBarThickness: 20 },
                { label: 'LEDVAN TRUCK', data: ledvan, backgroundColor: '#eab308', maxBarThickness: 20 }
            ]
        },
        options: commonChartOptions
    });
}

window.onload = loadAllData;
