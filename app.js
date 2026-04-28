// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv", // <-- Put your Operations CSV link here
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
    // Fetch Operations Data
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

// 4. Process the Data and Draw the Charts/KPIs (UPDATED: Smart KPI Extraction)
function processOperationsData(data) {
    const labels = [];
    const vehicular = [], roadside = [], patient = [], medical = [], standby = [];
    const others = [], clearing = [], firetruck = [], hauling = [], ledvan = [];
    
    // Variables to sum up the KPIs
    let total1st = 0, total2nd = 0, total3rd = 0, totalOutside = 0;

    data.forEach(row => {
        if(row['MONTH']) { 
            labels.push(row['MONTH']);
            
            // Chart Data
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

            // SMART KPI EXTRACTION: Search for keywords in the column headers
            for (let key in row) {
                let upperKey = key.toUpperCase();
                
                if (upperKey.includes("1ST DISTRICT")) {
                    total1st += Number(row[key]) || 0;
                }
                if (upperKey.includes("2ND DISTRICT")) {
                    total2nd += Number(row[key]) || 0;
                }
                if (upperKey.includes("3RD DISTRICT")) {
                    total3rd += Number(row[key]) || 0;
                }
                if (upperKey.includes("OUTSIDE")) {
                    totalOutside += Number(row[key]) || 0;
                }
            }
        }
    });

    // Update KPI Text on the page
    document.getElementById('kpi-1st').innerText = total1st;
    document.getElementById('kpi-2nd').innerText = total2nd;
    document.getElementById('kpi-3rd').innerText = total3rd;
    document.getElementById('kpi-outside').innerText = totalOutside;

    // Draw the 5 standard single-bar charts
    drawHorizontalBar('vehicularChart', labels, 'Vehicular Accident', vehicular, '#1a73e8');
    drawHorizontalBar('roadsideChart', labels, 'Roadside Assistance', roadside, '#1a73e8');
    drawHorizontalBar('patientChart', labels, 'Patient Transport', patient, '#1a73e8');
    drawHorizontalBar('medicalChart', labels, 'Medical', medical, '#1a73e8');
    drawHorizontalBar('standbyChart', labels, 'Standby Medic, Marshal & VIP', standby, '#1a73e8');

    // Draw the combined multi-bar chart
    drawCombinedBarChart('combinedChart', labels, others, clearing, firetruck, hauling, ledvan);
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
