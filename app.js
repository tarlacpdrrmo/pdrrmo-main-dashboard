Chart.register(ChartDataLabels);

// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv", 
    documents: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4FYdO-pxACzJxrw7vEMLJKsxgEBQm_8Afh_hsKFxhxA3eiJz5kNZLkr3ArNmoEIVo5BtPBbNIz-oz/pub?gid=433918484&single=true&output=csv",   
    volunteers: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQu11mhIuAL2jr_ZrMze5ZhXRk6puER_QUBVLlm6gfRq88sa1FrfFlRRjL3pvlyYfO4Mb3GwF_nZpA7/pub?gid=0&single=true&output=csv"  
};

let docPieChartInstance = null;
let docLineChartInstance = null;
let mainPieLabels = [];
let mainPieData = [];
let detailedPieData = {};
let globalLineData = []; 
let globalDocRecords = []; 

let toggleChartInstances = {};
let toggleChartData = {};

let masterServicePieInstance = null;
let operationsMonthlyCache = {}; 

// UPDATED SERVICE LABELS
const serviceCategoryLabels = [
    'TRAUMA (ROADCRASH)', 'Roadside Assistance', 'Patient Transport',
    'Medical', 'Standby Medic & VIP', 'SUPPORT SERVICES (manpower and service resources transportation Assistance)',
    'Clearing Operations', 'Firetruck', 'Hauling', 'Ledvan Truck'
];

const pieColorPalette = ['#e11d48', '#06b6d4', '#2563eb', '#ea580c', '#16a34a', '#9333ea', '#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#d946ef', '#f97316', '#14b8a6', '#6366f1'];

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
    borderWidth: 1
};

const singleBarOptions = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    layout: { padding: { top: 15, right: 25, bottom: 10, left: 10 } }, 
    plugins: { datalabels: { display: false }, legend: { display: false }, tooltip: sharedTooltipConfig },
    scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } }, y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } } }
};

function scrollToSection(panelId) {
    const section = document.getElementById(panelId);
    if(section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener("DOMContentLoaded", function() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('live-time').innerText = timeString;
        document.getElementById('live-date').innerText = dateString;
    }
    setInterval(updateClock, 1000); updateClock();

    document.getElementById('docPieMonthFilter').addEventListener('change', e => renderDocPieChart(e.target.value));
    document.getElementById('masterServiceMonthFilter').addEventListener('change', e => renderMasterServicePie(e.target.value));
    
    const masterToggle = document.getElementById('masterChartToggle');
    if (masterToggle) {
        masterToggle.addEventListener('change', function(e) {
            const type = e.target.checked ? 'pie' : 'bar';
            const chartIds = ['vehicularChart', 'roadsideChart', 'patientChart', 'medicalChart', 'standbyChart', 'othersChart', 'clearingChart', 'firetruckChart', 'haulingChart', 'ledvanChart'];
            chartIds.forEach(id => renderToggleableChart(id, type, false));
        });
    }
    loadAllData();
});

function loadAllData() {
    const cb = new Date().getTime();
    Object.keys(sheetUrls).forEach(key => {
        if(sheetUrls[key].includes("http")) {
            Papa.parse(sheetUrls[key] + (sheetUrls[key].includes("?") ? "&" : "?") + "t=" + cb, { 
                download: true, header: true, skipEmptyLines: true, 
                complete: function(res) { 
                    if(key === 'operations') processOperationsData(res.data);
                    if(key === 'documents') processDocumentsData(res.data);
                    if(key === 'volunteers') processVolunteersData(res.data);
                } 
            });
        }
    });
}

function processOperationsData(data) {
    const labels = [];
    const vehicular = [], roadside = [], patient = [], medical = [], standby = [];
    const others = [], clearing = [], firetruck = [], hauling = [], ledvan = [];
    let grandTotal = 0;
    operationsMonthlyCache['all'] = new Array(10).fill(0);
    let monthSet = new Set();

    data.forEach(row => {
        if(row['MONTH']) {
            let m = row['MONTH'].trim().toUpperCase();
            labels.push(row['MONTH']); monthSet.add(m);
            if(!operationsMonthlyCache[m]) operationsMonthlyCache[m] = new Array(10).fill(0);
            
            let vals = [
                Number(row['VEHICULAR ACCIDENT']) || Number(row['TRAUMA (ROADCRASH INCIDENT)']) || 0,
                Number(row['ROADSIDE ASSISTANCE']) || 0,
                Number(row['PATIENT TRANSPORT']) || 0,
                Number(row['MEDICAL']) || 0,
                Number(row['STANDBY MEDIC, MARSHAL & VIP']) || 0,
                Number(row['OTHERS']) || 0,
                Number(row['CLEARING OPERATIONS']) || 0,
                Number(row['FIRETRUCK']) || 0,
                Number(row['HAULING']) || 0,
                Number(row['LEDVAN TRUCK']) || 0
            ];

            vehicular.push(vals[0]); roadside.push(vals[1]); patient.push(vals[2]); medical.push(vals[3]);
            standby.push(vals[4]); others.push(vals[5]); clearing.push(vals[6]); firetruck.push(vals[7]);
            hauling.push(vals[8]); ledvan.push(vals[9]);

            vals.forEach((v, i) => {
                operationsMonthlyCache[m][i] += v;
                operationsMonthlyCache['all'][i] += v;
                grandTotal += v;
            });
        }
    });

    // Update KPI UI logic here (Simplified for space)
    document.getElementById('pie-grand-total').innerText = grandTotal.toLocaleString();

    // Mapping Data for Toggles
    toggleChartData['vehicularChart'] = { labels, labelText: 'TRAUMA (ROADCRASH)', data: vehicular, color: '#2563eb' };
    toggleChartData['roadsideChart'] = { labels, labelText: 'Roadside Assistance', data: roadside, color: '#2563eb' };
    toggleChartData['othersChart'] = { labels, labelText: 'SUPPORT SERVICES (manpower and service resources transportation Assistance)', data: others, color: '#6366f1' };
    // ... Repeat mapping for other 7 charts ...

    const isPie = document.getElementById('masterChartToggle').checked;
    Object.keys(toggleChartData).forEach(id => renderToggleableChart(id, isPie ? 'pie' : 'bar', true));

    const drop = document.getElementById('masterServiceMonthFilter');
    drop.innerHTML = '<option value="all">All Time</option>';
    monthSet.forEach(m => { let opt = document.createElement('option'); opt.value = m; opt.innerText = m; drop.appendChild(opt); });
    renderMasterServicePie('all');
}

function renderMasterServicePie(month) {
    const dataArr = operationsMonthlyCache[month] || new Array(10).fill(0);
    let filtered = [];
    dataArr.forEach((d, i) => { if(d > 0) filtered.push({ l: serviceCategoryLabels[i], d, c: pieColorPalette[i % pieColorPalette.length] }); });
    filtered.sort((a,b) => b.d - a.d);

    const ctx = document.getElementById('masterServicePieChart').getContext('2d');
    if(masterServicePieInstance) {
        masterServicePieInstance.data.labels = filtered.map(x => x.l);
        masterServicePieInstance.data.datasets[0].data = filtered.map(x => x.d);
        masterServicePieInstance.data.datasets[0].backgroundColor = filtered.map(x => x.c);
        masterServicePieInstance.update();
    } else {
        masterServicePieInstance = new Chart(ctx, {
            type: 'pie', data: { labels: filtered.map(x => x.l), datasets: [{ data: filtered.map(x => x.d), backgroundColor: filtered.map(x => x.c) }] },
            options: { responsive: true, maintainAspectRatio: false, animation: { animateRotate: true }, plugins: { legend: { display: false }, datalabels: { color: '#fff', formatter: v => v > 0 ? v : '' } } }
        });
    }

    const leg = document.getElementById('masterServiceLegend'); leg.innerHTML = '';
    filtered.forEach((item, i) => {
        let div = document.createElement('div'); div.className = 'legend-item';
        div.innerHTML = `<div class="legend-color" style="background-color:${item.c}"></div><div class="legend-text">${item.l}</div><div class="legend-val">${item.d}</div>`;
        div.onclick = () => { masterServicePieInstance.toggleDataVisibility(i); masterServicePieInstance.update(); div.classList.toggle('hidden-slice'); };
        leg.appendChild(div);
    });
}

function renderToggleableChart(id, type, init) {
    const canvas = document.getElementById(id); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(toggleChartInstances[id]) toggleChartInstances[id].destroy();
    const d = toggleChartData[id];

    toggleChartInstances[id] = new Chart(ctx, {
        type: type,
        data: { labels: d.labels, datasets: [{ label: d.labelText, data: d.data, backgroundColor: type === 'bar' ? d.color : d.data.map((_, i) => pieColorPalette[i % pieColorPalette.length]) }] },
        options: type === 'bar' ? singleBarOptions : { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// Remaining processDocumentsData and processVolunteersData functions from previous turns...
