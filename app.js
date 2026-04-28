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
    
    // Array to hold the total sum of all services per month for the pie chart
    const monthlyTotalServices = [];

    let total1st = 0, total2nd = 0, total3rd = 0, totalOutside = 0;

    data.forEach(row => {
        if(row['MONTH']) { 
            labels.push(row['MONTH']);
            
            // Extract individual services
            let v = Number(row['VEHICULAR ACCIDENT']) || 0;
            let r = Number(row['ROADSIDE ASSISTANCE']) || 0;
            let p = Number(row['PATIENT TRANSPORT']) || 0;
            let m = Number(row['MEDICAL']) || 0;
            let s = Number(row['STANDBY MEDIC, MARSHAL & VIP']) || 0;
            let o = Number(row['OTHERS']) || 0;
            let c = Number(row['CLEARING OPERATIONS']) || 0;
            let f = Number(row['FIRETRUCK']) || 0;
            let h = Number(row['HAULING']) || 0;
            let l = Number(row['LEDVAN TRUCK']) || 0;

            // Push to arrays for bar charts
            vehicular.push(v); roadside.push(r); patient.push(p); medical.push(m); standby.push(s);
            others.push(o); clearing.push(c); firetruck.push(f); hauling.push(h); ledvan.push(l);

            // Calculate Grand Total for this specific month and save it for the pie chart
            let monthTotal = v + r + p + m + s + o + c + f + h + l;
            monthlyTotalServices.push(monthTotal);

            // SMART KPI EXTRACTION
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

    // Draw the Monthly Pie Chart
    drawDonutChart('monthlyPieChart', labels, monthlyTotalServices);

    // Draw the 5 standard single-bar charts
    drawHorizontalBar('vehicularChart', labels, 'Vehicular Accident', vehicular, '#1a73e8');
    drawHorizontalBar('roadsideChart', labels, 'Roadside Assistance', roadside, '#1a73e8');
    drawHorizontalBar('patientChart', labels, 'Patient Transport', patient, '#1a73e8');
    drawHorizontalBar('medicalChart', labels, 'Medical', medical, '#1a73e8');
    drawHorizontalBar('standbyChart', labels, 'Standby Medic, Marshal & VIP', standby, '#1a73e8');

    // Draw the combined multi-bar chart
    drawCombinedBarChart('combinedChart', labels, others, clearing, firetruck, hauling, ledvan);
}

// Helper function: Donut/Pie Chart
function drawDonutChart(canvasId, labels, dataArr) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataArr,
                // Looker Studio Colors: Blue, Cyan, Pink, Orange
                backgroundColor: ['#1a73e8', '#00bcd4', '#e91e63', '#ff9800', '#4caf50', '#9c27b0'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%', // Creates the empty center (donut effect)
            plugins: {
                legend: { display: false }, // Hidden to match your Looker image style
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            let total = context.chart._metasets[context.datasetIndex].total;
                            let value = context.parsed;
                            let percentage = ((value / total) * 100).toFixed(1) + '%';
                            return label + percentage + ' (' + value + ' total)';
                        }
                    }
                }
            }
        }
    });
}

// Helper function: Single Horizontal Bar Chart
function drawHorizontalBar(canvasId, labels, labelText, dataArr, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: labelText, data: dataArr, backgroundColor: color }]
        },
        options: { 
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 20 } } }
        }
    });
}

// Helper function: Multi-Dataset Horizontal Bar Chart
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
        options: { 
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } }
        }
    });
}

// Start loading when page opens
window.onload = loadAllData;
