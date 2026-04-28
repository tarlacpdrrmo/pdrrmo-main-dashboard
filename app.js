Chart.register(ChartDataLabels);

// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv", // <-- RE-PASTE YOUR LINK HERE
    documents: "", 
    volunteers: ""
};

// 2. Navigation Logic (Smooth Scroll)
function scrollToSection(panelId) {
    const section = document.getElementById(panelId);
    if(section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 3. ScrollSpy Logic (Highlights sidebar as you scroll)
document.addEventListener("DOMContentLoaded", function() {
    const panels = document.querySelectorAll('.panel');
    const navLinks = document.querySelectorAll('.sidebar li:not(.section-title)');
    
    // Setup the observer to watch when sections enter the screen
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all links
                navLinks.forEach(link => link.classList.remove('active'));
                
                // Add active class to the link matching the visible section
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.sidebar li[onclick="scrollToSection('${id}')"]`);
                if(activeLink) activeLink.classList.add('active');
            }
        });
    }, { threshold: 0.3 }); // Triggers when 30% of a section is visible

    panels.forEach(panel => observer.observe(panel));
});

// 4. Fetch Data Logic
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

// 5. Process the Data and Draw the Charts/KPIs
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

// CHART GENERATION
const commonChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        datalabels: { display: false }, 
        legend: { 
            position: 'top', 
            labels: { boxWidth: 10, usePointStyle: true, font: { family: 'Inter', size: 10 } } 
        }
    },
    scales: {
        x: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter', size: 10 } } },
        y: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter', size: 10 } } }
    },
    elements: { bar: { borderRadius: 3 } } 
};

function drawDonutChart(canvasId, labels, dataArr) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataArr,
                backgroundColor: ['#2563eb', '#06b6d4', '#e11d48', '#ea580c', '#16a34a', '#9333ea'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            layout: { padding: 0 },
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#ffffff',
                    font: { weight: '600', family: 'Inter', size: 9 },
                    formatter: (value, context) => {
                        let sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        if (sum === 0) return '';
                        return ((value * 100) / sum).toFixed(1) + '%';
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
        data: { labels: labels, datasets: [{ label: labelText, data: dataArr, backgroundColor: color, maxBarThickness: 20 }] },
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
