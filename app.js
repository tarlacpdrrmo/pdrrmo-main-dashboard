Chart.register(ChartDataLabels);

// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv", 
    documents: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4FYdO-pxACzJxrw7vEMLJKsxgEBQm_8Afh_hsKFxhxA3eiJz5kNZLkr3ArNmoEIVo5BtPBbNIz-oz/pub?gid=433918484&single=true&output=csv",   
    volunteers: ""
};

let docPieInstance = null;
let mainViewLabels = [];
let mainViewData = [];
let detailDataMap = {}; // Stores breakdown for each category

function scrollToSection(id) {
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 2. Load Data with Cache Buster
function loadAllData() {
    const t = new Date().getTime();
    if(sheetUrls.operations.includes("http")) {
        Papa.parse(sheetUrls.operations + "?t=" + t, { download: true, header: true, complete: res => processOps(res.data) });
    }
    if(sheetUrls.documents.includes("http")) {
        Papa.parse(sheetUrls.documents + "?t=" + t, { download: true, header: true, complete: res => processDocs(res.data) });
    }
}

// 3. Process Tracking Data (Smart Key Consolidation)
function processDocs(data) {
    let totalManual = 0;
    let mainMap = {};
    detailDataMap = {};

    data.forEach(row => {
        const office = row['Received From Office'] || "";
        const count = Number(row['Total Requests']) || 0;

        if (office && count > 0) {
            totalManual += count; // Calculating the 321 fix

            // Smart Grouping Logic
            let category = office;
            const upper = office.toUpperCase();

            if (upper.includes('PGT') || upper.includes('PROVINCIAL GOV')) category = 'PGT Offices (Consolidated)';
            else if (upper.includes('3RD MECH') || upper.includes('MECHANIZED INFANTRY')) category = '3rd Mechanized Infantry';
            else if (upper.includes('522ND')) category = '522nd Engineer Bn';
            else if (upper.includes('BFP')) category = 'BFP Tarlac';
            else if (upper === 'N/A') category = 'Private / NA';

            mainMap[category] = (mainMap[category] || 0) + count;
            
            if(!detailDataMap[category]) detailDataMap[category] = {};
            detailDataMap[category][office] = (detailDataMap[category][office] || 0) + count;
        }

        // Set KPIs from Summary Row
        if (row['TOTAL ACTION TAKEN (OVERALL)']) {
            document.getElementById('doc-kpi-action').innerText = row['TOTAL ACTION TAKEN (OVERALL)'];
            document.getElementById('doc-kpi-catered').innerText = row['TOTAL REQUEST CATERED'] || 0;
            document.getElementById('doc-kpi-inv-att').innerText = row['TOTAL INVITATION ATTENDED'] || 0;
            document.getElementById('doc-kpi-not-catered').innerText = row['TOTAL REQUEST NOT CATERED'] || 0;
            document.getElementById('doc-kpi-others').innerText = row['OTHERS, SPECIFY:'] || 0;
            document.getElementById('doc-kpi-inv-not').innerText = row['TOTAL INVITATION NOT ATTENDED'] || 0;
            document.getElementById('doc-kpi-cancelled').innerText = row['TOTAL CANCELLED'] || 0;
            document.getElementById('doc-kpi-no-action').innerText = row['TOTAL NO ACTION'] || 0;
        }
    });

    document.getElementById('doc-kpi-request').innerText = totalManual;

    // Sort Descending
    const sorted = Object.entries(mainMap).sort((a, b) => b[1] - a[1]);
    mainViewLabels = sorted.map(x => x[0]);
    mainViewData = sorted.map(x => x[1]);

    drawInteractivePie('docSourcePieChart', mainViewLabels, mainViewData);
    
    // Placeholder Line
    drawLine('docDateLineChart', ['Jan', 'Feb', 'Mar', 'Apr'], [10, 15, 8, 12]);
}

// 4. Interactive Drill-Down Pie Logic
function drawInteractivePie(id, labels, data) {
    const ctx = document.getElementById(id).getContext('2d');
    if(docPieInstance) docPieInstance.destroy();

    const colors = ['#2563eb', '#06b6d4', '#e11d48', '#ea580c', '#16a34a', '#9333ea', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

    docPieInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1, borderColor: '#fff' }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '55%',
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const cat = docPieInstance.data.labels[idx];
                    if (detailDataMap[cat] && Object.keys(detailDataMap[cat]).length > 1) {
                        const subData = Object.entries(detailDataMap[cat]).sort((a,b) => b[1]-a[1]);
                        docPieInstance.data.labels = subData.map(x => x[0]);
                        docPieInstance.data.datasets[0].data = subData.map(x => x[1]);
                        docPieInstance.update();
                        document.getElementById('pieBackButton').style.display = 'block';
                        document.getElementById('pieChartTitle').innerText = 'Breakdown: ' + cat;
                        updateLegend(subData.map(x => x[0]), subData.map(x => x[1]), colors);
                    }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff', font: { weight: '700', size: 10 },
                    formatter: (v, ctx) => {
                        let sum = ctx.chart.data.datasets[0].data.reduce((a,b) => a+b, 0);
                        return ((v*100)/sum).toFixed(1) + '%';
                    }
                }
            }
        }
    });

    updateLegend(labels, data, colors);
}

// Function to update the custom side-legend with animation
function updateLegend(labels, data, colors) {
    const legendEl = document.getElementById('customLegend');
    legendEl.innerHTML = '';
    labels.forEach((label, i) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background:${colors[i % colors.length]}"></div>
            <div class="legend-text">${label}</div>
            <div class="legend-val">${data[i]}</div>
        `;
        legendEl.appendChild(item);
    });
}

// Reset Drill-down
document.getElementById('pieBackButton').addEventListener('click', function() {
    docPieInstance.data.labels = mainViewLabels;
    docPieInstance.data.datasets[0].data = mainViewData;
    docPieInstance.update();
    this.style.display = 'none';
    document.getElementById('pieChartTitle').innerText = 'Received Request from PDRRM Office:';
    updateLegend(mainViewLabels, mainViewData, ['#2563eb', '#06b6d4', '#e11d48', '#ea580c', '#16a34a', '#9333ea', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']);
});

// Assets panel chart logic (Simplified for copy-paste)
function processOps(data) {
    let t1=0, t2=0, t3=0, to=0;
    const months = [], veh = [];
    data.forEach(r => {
        if(r['MONTH']) {
            months.push(r['MONTH']);
            veh.push(Number(r['VEHICULAR ACCIDENT']) || 0);
            t1 += Number(r['# 1ST DISTRICT (TOTAL NO.)']) || 0;
            t2 += Number(r['# 2ND DISTRICT (TOTAL NO.)']) || 0;
            t3 += Number(r['# 3RD DISTRICT (TOTAL NO.)']) || 0;
            to += Number(r['OUTSIDE TARLAC PROVINCE (TOTAL NO.)']) || 0;
        }
    });
    document.getElementById('kpi-1st').innerText = t1;
    document.getElementById('kpi-2nd').innerText = t2;
    document.getElementById('kpi-3rd').innerText = t3;
    document.getElementById('kpi-outside').innerText = to;
    
    drawBar('vehicularChart', months, 'Vehicular Accidents', veh);
    // Add other charts as needed...
}

function drawBar(id, labels, label, data) {
    const ctx = document.getElementById(id).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label, data, backgroundColor: '#2563eb', maxBarThickness: 15 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
    });
}

function drawLine(id, labels, data) {
    const ctx = document.getElementById(id).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data, borderColor: '#2563eb', tension: 0.3, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

window.onload = loadAllData;
