Chart.register(ChartDataLabels);

const webAppUrl = "https://script.google.com/macros/s/AKfycbwdl6df9uXUtM0-ufyh10tNz1X_4WZi03fqXrRwtdysOjsblDwSOkeAlBriw3txXe2lXQ/exec";

// Data Vaults
let rawOperationsData = [];
let rawDocumentsData = [];
let rawVolunteersData = [];
let rawTrainingsData = []; // NEW

// Chart State Trackers
let docPieChartInstance = null;
let docLineChartInstance = null;
let masterServicePieInstance = null;
let monthlyTotalPieInstance = null; 
let toggleChartInstances = {};

// Training Charts State (NEW)
let trainStatusChart = null;
let trainTypesChart = null;
let trainNumbersChart = null;
let trainDurationChart = null;
let trainBudgetChart = null;
let trainMonthlyChart = null;

const pieColorPalette = ['#2563eb', '#06b6d4', '#e11d48', '#ea580c', '#16a34a', '#9333ea', '#f43f5e', '#f59e0b', '#3b82f6', '#10b981'];

const sharedTooltipConfig = {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    titleFont: { family: 'Inter', size: 11, weight: '800' },
    bodyFont: { family: 'Inter', size: 11, weight: '600' },
    padding: 10, cornerRadius: 6, displayColors: false
};

function scrollToSection(panelId) {
    const section = document.getElementById(panelId);
    if(section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener("DOMContentLoaded", function() {
    // Clock
    setInterval(() => {
        const now = new Date();
        document.getElementById('live-time').innerText = now.toLocaleTimeString();
        document.getElementById('live-date').innerText = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }, 1000);

    // Sidebar Observer
    const panels = document.querySelectorAll('.panel');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.sidebar li[onclick="scrollToSection('${id}')"]`);
                if(activeLink) activeLink.classList.add('active');
                if (entry.target.classList.contains('iframe-panel')) entry.target.classList.add('map-in-view');
            }
        });
    }, { threshold: 0.2 });
    panels.forEach(p => observer.observe(p));

    // Year Filter listener
    const yearSelect = document.getElementById('globalYearSelect');
    if(yearSelect) yearSelect.addEventListener('change', (e) => applyGlobalYearFilter(e.target.value));
});

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 800);
    }
}

async function loadAllData() {
    try {
        const opRes = await fetch(`${webAppUrl}?type=operations`);
        rawOperationsData = await opRes.json();
        const docRes = await fetch(`${webAppUrl}?type=documents`);
        rawDocumentsData = await docRes.json();
        const volRes = await fetch(`${webAppUrl}?type=volunteers`);
        rawVolunteersData = await volRes.json();

        // Populate Years
        const yearsSet = new Set();
        rawOperationsData.forEach(r => { if(r.YEAR) yearsSet.add(r.YEAR.toString()); });
        const yearSelect = document.getElementById('globalYearSelect');
        Array.from(yearsSet).sort().reverse().forEach(y => {
            let opt = document.createElement('option'); opt.value = y; opt.innerText = y;
            yearSelect.appendChild(opt);
        });

        // Initial Processing
        applyGlobalYearFilter(yearSelect.value || 'all');
        hideLoader();
    } catch (e) { console.error(e); hideLoader(); }
}

function applyGlobalYearFilter(year) {
    // Operations & Documents logic remains same as baseline
    // Trainings logic will be added once data format is confirmed
}

window.onload = loadAllData;
