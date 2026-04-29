Chart.register(ChartDataLabels);

// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv", // <-- MUST BE FILLED
    documents: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4FYdO-pxACzJxrw7vEMLJKsxgEBQm_8Afh_hsKFxhxA3eiJz5kNZLkr3ArNmoEIVo5BtPBbNIz-oz/pub?gid=433918484&single=true&output=csv",   // <-- MUST BE FILLED
    volunteers: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQu11mhIuAL2jr_ZrMze5ZhXRk6puER_QUBVLlm6gfRq88sa1FrfFlRRjL3pvlyYfO4Mb3GwF_nZpA7/pub?gid=0&single=true&output=csv"
};

let docPieChartInstance = null;
let mainPieLabels = [];
let mainPieData = [];
let detailedPieData = {};

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

    // Back Button Logic
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
});

// 2. Data Fetch with BULLETPROOF Cache Buster
function loadAllData() {
    const cacheBuster = new Date().getTime(); 

    // FIX: Safely appends the cache buster without breaking Google's URL parameters
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

// 3. Process DOCUMENTS Data
function processDocumentsData(data) {
    let totalReq = 0, totalAction = 0, catered = 0, invAttended = 0;
    let notCatered = 0, others = 0, invNotAttended = 0, cancelled = 0, noAction = 0;

    let sourceMap = {};
    detailedPieData = {};
    let totalsCaptured = false;

    data.forEach(row => {
        let rawOffice = row['Received From Office'] || row['RECEIVED FROM OFFICE'];
        let reqs = Number(row['Total Requests'] || row['TOTAL REQUESTS']) || 0;

        if (rawOffice && reqs > 0) {
            let upperOffice = rawOffice.toUpperCase();
            let parentCategory = rawOffice;

            if (upperOffice.includes('PGT') || upperOffice.includes('PROVINCIAL GOV')) {
                parentCategory = 'PGT Offices (Consolidated)';
            } else if (upperOffice.includes('3RD MECH') || upperOffice.includes('MECHANIZED INFANTRY')) {
                parentCategory = '3rd Mechanized Infantry (Consolidated)';
            } else if (upperOffice.includes('522ND')) {
                parentCategory = '522nd Engineer Battalion (Consolidated)';
            } else if (upperOffice.includes('BFP')) {
                parentCategory = 'BFP Tarlac (Consolidated)';
            } else if (upperOffice === 'N/A' || upperOffice.includes('PRIVATE')) {
                parentCategory = 'N/A (Private Individuals)';
            }

            sourceMap[parentCategory] = (sourceMap[parentCategory] || 0) + reqs;
            if (!detailedPieData[parentCategory]) detailedPieData[parentCategory] = {};
            detailedPieData[parentCategory][rawOffice] = (detailedPieData[parentCategory][rawOffice] || 0) + reqs;
        }

        if (!totalsCaptured && (row['TOTAL RECEIVED FROM OFFICE'] || row['TOTAL ACTION TAKEN (OVERALL)'] || row['TOTAL REQUEST CATERED'])) {
            totalReq = Number(row['TOTAL RECEIVED FROM OFFICE'] || row['TOTAL RECEIVED']) || 0;
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

    const dummyDates = ['Jan 12', 'Jan 23', 'Feb 3', 'Feb 14', 'Feb 25', 'Mar 8', 'Mar 19', 'Mar 30', 'Apr 10', 'Apr 21'];
    const dummyLineData = [2, 5, 1, 9, 3, 12, 2, 6, 1, 5];
    drawLineChart('docDateLineChart', dummyDates, dummyLineData);
}

// 4. Process OPERATIONS Data
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
    new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Received (OFFICE)', data: dataArr, borderColor: '#2563eb', backgroundColor: '#2563eb', borderWidth: 2, pointRadius: 3, tension: 0.1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: false }, legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } }, y: { grid: { color: '#e2e8f0' }, border: { dash: [4, 4] }, ticks: { font: { family: 'Inter', size: 10 } } } } }
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
