// 1. YOUR PUBLISHED GOOGLE SHEET CSV LINKS
const sheetUrls = {
    volunteers: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQu11mhIuAL2jr_ZrMze5ZhXRk6puER_QUBVLlm6gfRq88sa1FrfFlRRjL3pvlyYfO4Mb3GwF_nZpA7/pub?gid=0&single=true&output=csv",
    operations: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEOujzNEOrDEv0W2CMKNDjXKW8WUusQkXmrNFuaR_Vh171r7rDsKpcCdwxwhWPqpjTr0iYICMVK5lv/pub?output=csv",
    documents: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4FYdO-pxACzJxrw7vEMLJKsxgEBQm_8Afh_hsKFxhxA3eiJz5kNZLkr3ArNmoEIVo5BtPBbNIz-oz/pub?gid=433918484&single=true&output=csv"
};

// 2. Navigation Logic
function switchPanel(panelId) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
    });
    // Show selected panel
    document.getElementById(panelId).style.display = 'block';
    
    // Highlight active menu item
    document.querySelectorAll('.sidebar li:not(.section-title)').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
}

// 3. Fetch Data Logic
function loadAllData() {
    // Fetch Volunteer Data
    if(sheetUrls.volunteers.includes("http")) {
        Papa.parse(sheetUrls.volunteers, {
            download: true,
            header: true,
            complete: function(results) {
                populateVolunteerTable(results.data);
            }
        });
    }

    // Initialize an empty chart as a placeholder for Operations
    const ctxVehicular = document.getElementById('vehicularChart').getContext('2d');
    new Chart(ctxVehicular, {
        type: 'bar',
        data: {
            labels: ['January', 'February', 'March', 'April'],
            datasets: [{ label: 'Vehicular Accident', data: [22, 16, 13, 6], backgroundColor: '#1a73e8' }]
        },
        options: { indexAxis: 'y', responsive: true } 
    });
}

// 4. Populate the Table
function populateVolunteerTable(data) {
    const tbody = document.querySelector('#volunteerTable tbody');
    tbody.innerHTML = ''; 
    
    data.forEach(row => {
        // UPDATE THESE to exactly match your Google Sheet column headers
        let orgName = row['Organization']; 
        let orgCount = row['Count'];

        if(orgName && orgCount) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${orgName}</td><td>${orgCount}</td>`;
            tbody.appendChild(tr);
        }
    });
}

// Start loading when page opens
window.onload = loadAllData;
