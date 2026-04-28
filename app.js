// Register the DataLabels plugin for the Pie Chart
Chart.register(ChartDataLabels);

// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv", // <-- RE-PASTE YOUR LINK HERE
    documents: "", 
    volunteers: ""
};

// 2. Navigation Logic
function switchPanel(panelId) {
    document.querySelectorAll('.panel').forEach(panel => panel.style.display = 'none');
    document.getElementById(panelId).style.display = 'block';
    document.querySelectorAll('.sidebar li:not(.section-title)').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
}

// 3. Fetch Data Logic
function loadAllData() {
    if(sheetUrls.operations.includes("http")) {
        Papa.parse(sheetUrls.operations, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                processOperationsData(results.data);
            }
        });
    }
}

// 4. Process the Data and Draw the Charts/KPIs
function processOperationsData(data) {
    const labels = [];
    const vehicular = [], roadside = [], patient = [], medical = [], standby = [];
    const others = [], clearing = [], firetruck = [], hauling = [], ledvan = [];
    
    // Array for the Pie Chart using the GRAND TOTAL column
    const monthlyTotalServices = [];

    let total1st = 0, total2nd = 0, total3rd = 0, totalOutside = 0;

    data.forEach(row => {
        if(row['MONTH']) { 
            labels.push(row['MONTH']);
            
            // Bar Chart Data Extraction
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

            // PIE CHART FIX: Read the exact GRAND TOTAL column from your sheet
            monthlyTotalServices.push(Number(row['GRAND TOTAL']) || 0);

            // KPI Extraction
            for (let key in row) {
                let upperKey = key.toUpperCase();
                if (upperKey.includes("1ST DISTRICT")) { total1st += Number(row[key]) || 0; }
                if (upperKey.includes("2ND DISTRICT")) { total2nd += Number(row[key]) || 0; }
                if (upperKey.includes("3RD DISTRICT")) { total3rd += Number(row[key]) || 0; }
                if (upperKey.includes("OUTSIDE")) { totalOutside += Number(row[key]) || 0; }
            }
        }
    });

    // Update KPI Text on the page
    document.getElementById('kpi-1st').innerText = total1st;
    document.getElementById('kpi-2nd').innerText = total2nd;
    document.getElementById('kpi-3rd').innerText = total3rd;
    document.getElementById('kpi-outside').innerText = totalOutside;

    // 5. Draw the Charts
    drawDonutChart('monthlyPieChart', labels, monthlyTotalServices);

    drawHorizontalBar('vehicularChart', labels, 'Vehicular Accident', vehicular, '#1a73e8');
    drawHorizontalBar('roadsideChart', labels, 'Roadside Assistance', roadside, '#1a73e8');
    drawHorizontalBar('patientChart', labels, 'Patient Transport', patient, '#1a73e8');
    drawHorizontalBar('medicalChart', labels, 'Medical', medical, '#1a73e8');
    drawHorizontalBar('standbyChart', labels, 'Standby Medic, Marshal & VIP', standby, '#1a73e8');

    drawCombinedBarChart('combinedChart', labels, others, clearing, firetruck, hauling, ledvan);
}

// ----------------------------------------------------
// CHART GENERATION FUNCTIONS (Cleaned & Smoothed UI)
// ----------------------------------------------------

const commonChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        datalabels: { display: false }, // Turn off data labels for bar charts
        legend: { 
            position: 'top', 
            labels: { boxWidth: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } 
        }
    },
    scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter' } } },
        y: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter' } } }
    },
    elements: { bar: { borderRadius: 3 } } // Smooth rounded corners on bars
};

function drawDonutChart(canvasId, labels, dataArr) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataArr,
                backgroundColor: ['#1a73e8', '#00bcd4', '#e91e63', '#ff9800', '#4caf50', '#9c27b0'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#ffffff',
                    font: { weight: 'bold', family: 'Inter', size: 10 },
                    formatter: (value, context) => {
                        let sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        if (sum === 0) return '';
                        let percentage = ((value * 100) / sum).toFixed(1) + '%';
                        return percentage;
                    }
                }
            }
        }
    });
}

function drawHorizontalBar(canvasId, labels, labelText, dataArr, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: labelText, data: dataArr, backgroundColor: color }] },
        options: commonChartOptions
    });
}

function drawCombinedBarChart(canvasId, labels, others, clearing, firetruck, hauling, ledvan) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'OTHERS', data: others, backgroundColor: '#1a73e8' },
                { label: 'CLEARING OPE...', data: clearing, backgroundColor: '#00bcd4' },
                { label: 'FIRETRUCK', data: firetruck, backgroundColor: '#e91e63' },
                { label: 'HAULING', data: hauling, backgroundColor: '#ff9800' },
                { label: 'LEDVAN TRUCK', data: ledvan, backgroundColor: '#ffc107' }
            ]
        },
        options: commonChartOptions
    });
}

window.onload = loadAllData;
