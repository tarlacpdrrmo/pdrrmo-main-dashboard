function processDocumentsData(data) {
    let totalReq = 0, totalAction = 0, catered = 0, invAttended = 0;
    let notCatered = 0, others = 0, invNotAttended = 0, cancelled = 0, noAction = 0;

    let dynamicTotalReq = 0; // Added for Option A Dynamic Match

    globalLineData = []; 
    globalDocRecords = []; 
    let uniqueMonths = new Set();
    let totalsCaptured = false;

    data.forEach(row => {
        let rawOffice = row['Received From (OFFICE)'] || 
                        row['RECEIVED FROM (OFFICE)'] || 
                        row['Received From Office'] || 
                        row['RECEIVED FROM OFFICE'] || 
                        row['Column N'] || 
                        row['COLUMN N'] || '';
                        
        let keys = Object.keys(row);
        
        if (!totalsCaptured) {
            let colCValue = Number(row['TOTAL RECEIVED FROM OFFICE']) || Number(row['Column C']) || Number(row['COLUMN C']) || Number(row[keys[2]]) || 0;
            if (colCValue > totalReq) {
                totalReq = colCValue; 
            }

            if (row['TOTAL ACTION TAKEN (OVERALL)'] || row['TOTAL REQUEST CATERED']) {
                totalAction = Number(row['TOTAL ACTION TAKEN (OVERALL)']) || 0;
                catered = Number(row['TOTAL REQUEST CATERED']) || 0;
                invAttended = Number(row['TOTAL INVITATION ATTENDED']) || 0;
                notCatered = Number(row['TOTAL REQUEST NOT CATERED']) || 0;
                others = Number(row['OTHERS, SPECIFY:']) || Number(row['OTHERS']) || 0;
                invNotAttended = Number(row['TOTAL INVITATION NOT ATTENDED']) || 0;
                cancelled = Number(row['TOTAL CANCELLED']) || 0;
                noAction = Number(row['TOTAL NO ACTION']) || 0;
                totalsCaptured = true;
            }
        }

        let dateStr = row['Column M'] || row['COLUMN M'] || row['Date Received'] || row['DATE RECEIVED'] || row[keys[12]] || '';
        let rowCount = Number(row['Total Requests']) || Number(row['TOTAL REQUESTS']) || 1; 
        
        let monthYearKey = 'all';

        if (dateStr) {
            let parsedDate = parseCustomDate(dateStr);
            if (parsedDate) {
                globalLineData.push({ dateObj: parsedDate, count: rowCount, timestamp: parsedDate.getTime() });
                
                let m = parsedDate.getMonth() + 1;
                let y = parsedDate.getFullYear();
                monthYearKey = `${y}-${m.toString().padStart(2, '0')}`;
                uniqueMonths.add(monthYearKey);
            }
        }

        if (!rawOffice || String(rawOffice).trim() === '') {
            rawOffice = 'Unspecified Office';
        }

        let rawCategory = row['Category of Writing Party'] || 
                          row['CATEGORY OF WRITING PARTY'] || 
                          row['Column O'] || 
                          row['COLUMN O'] || '';
                          
        let parentCategory = rawCategory.trim() !== '' ? rawCategory.trim() : 'Uncategorized';

        let officeReqs = rowCount; 
        
        // --- START OPTION A LOGIC (FIXED) ---
        let actionVal = row['TOTAL ACTION TAKEN (OVERALL)'];
        let cateredVal = row['TOTAL REQUEST CATERED'];
        
        // Fix: Check if the cell actually has text in it, not just if the column exists
        let isSummaryRow = (actionVal && String(actionVal).trim() !== '') || 
                           (cateredVal && String(cateredVal).trim() !== '');
                           
        let isBlankRow = (!dateStr || String(dateStr).trim() === '') && 
                         (!rawCategory || String(rawCategory).trim() === '');

        if (officeReqs > 0 && !isSummaryRow && !isBlankRow) {
            globalDocRecords.push({
                dateKey: monthYearKey,
                parent: parentCategory,
                raw: rawOffice,
                count: officeReqs
            });
            dynamicTotalReq += officeReqs; // Dynamic matching count
        }
        // --- END OPTION A LOGIC (FIXED) ---
    });

    document.getElementById('doc-kpi-request').innerText = dynamicTotalReq; 
    document.getElementById('doc-kpi-action').innerText = totalAction;
    document.getElementById('doc-kpi-catered').innerText = catered;
    document.getElementById('doc-kpi-inv-att').innerText = invAttended;
    document.getElementById('doc-kpi-not-catered').innerText = notCatered;
    document.getElementById('doc-kpi-others').innerText = others;
    document.getElementById('doc-kpi-inv-not').innerText = invNotAttended;
    document.getElementById('doc-kpi-cancelled').innerText = cancelled;
    document.getElementById('doc-kpi-no-action').innerText = noAction;

    let monthSelect = document.getElementById('docPieMonthFilter');
    if (monthSelect) {
        monthSelect.innerHTML = '<option value="all">All Time</option>';
        let sortedMonths = Array.from(uniqueMonths).sort().reverse(); 
        sortedMonths.forEach(my => {
            if(my === 'all') return;
            let [y, m] = my.split('-');
            let dateObj = new Date(y, m - 1);
            let label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            let opt = document.createElement('option');
            opt.value = my;
            opt.innerText = label;
            monthSelect.appendChild(opt);
        });
    }

    renderDocPieChart('all');
    renderLineChartByTimeframe('daily');
}
