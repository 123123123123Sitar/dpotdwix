const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRPyEM0A2oP_zU9GTq_tPintK4rU1e16IvGLgCV-P1G4-dsghsw7B_kkgAuPII56X0/exec';
const ADMIN_PASSWORD = 'SitarsTheGOAT!';

let cachedSubmissions = [];
let isAuthenticated = false;

// Password Protection Functions
function checkPassword() {
    const password = document.getElementById('passwordInput').value;
    const loginError = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadQuestions();
    } else {
        loginError.textContent = 'Incorrect password';
        loginError.style.display = 'block';
        document.getElementById('passwordInput').value = '';
    }
}

function handlePasswordKeyPress(event) {
    if (event.key === 'Enter') {
        checkPassword();
    }
}

// Status Display
function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = 'status ' + type;
    el.style.display = 'block';
}

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'questions') loadQuestions();
    if (tabName === 'schedule') loadSchedule();
    if (tabName === 'settings') loadSettings();
    if (tabName === 'submissions') loadSubmissions();
}

// Questions Management
async function loadQuestions() {
    if (!isAuthenticated) return;
    
    const day = document.getElementById('questionDay').value;
    
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
        showStatus('questionStatus', 'Error: Script URL not configured', 'error');
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getQuestions&day=${day}`);
        const data = await response.json();
        
        if (data.error) {
            document.getElementById('q1Text').value = '';
            document.getElementById('q1Answer').value = '';
            document.getElementById('q2Text').value = '';
            document.getElementById('q2Answer').value = '';
            document.getElementById('q3Text').value = '';
            document.getElementById('q3Answer').value = '';
        } else {
            document.getElementById('q1Text').value = data.q1_text || '';
            document.getElementById('q1Answer').value = data.q1_answer || '';
            document.getElementById('q2Text').value = data.q2_text || '';
            document.getElementById('q2Answer').value = data.q2_answer || '';
            document.getElementById('q3Text').value = data.q3_text || '';
            document.getElementById('q3Answer').value = data.q3_answer || '';
        }
    } catch (error) {
        showStatus('questionStatus', 'Error loading questions: ' + error.message, 'error');
    }
}

async function saveQuestions() {
    if (!isAuthenticated) return;
    
    const day = document.getElementById('questionDay').value;
    const data = {
        day: day,
        q1_text: document.getElementById('q1Text').value,
        q1_answer: document.getElementById('q1Answer').value,
        q2_text: document.getElementById('q2Text').value,
        q2_answer: document.getElementById('q2Answer').value,
        q3_text: document.getElementById('q3Text').value,
        q3_answer: document.getElementById('q3Answer').value
    };

    showStatus('questionStatus', 'Saving...', 'info');

    try {
        const response = await fetch(`${SCRIPT_URL}?action=saveQuestions`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('questionStatus', '✅ Questions saved successfully!', 'success');
        } else {
            showStatus('questionStatus', 'Error: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showStatus('questionStatus', 'Error saving: ' + error.message, 'error');
    }
}

// Schedule Management
async function loadSchedule() {
    if (!isAuthenticated) return;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getSchedule`);
        const data = await response.json();
        
        for (let i = 1; i <= 5; i++) {
            const value = data[`day${i}`];
            if (value) {
                const date = new Date(value);
                const formatted = date.toISOString().slice(0, 16);
                document.getElementById(`day${i}`).value = formatted;
            }
        }
    } catch (error) {
        showStatus('scheduleStatus', 'Error loading schedule: ' + error.message, 'error');
    }
}

async function saveSchedule() {
    if (!isAuthenticated) return;
    
    const data = {};
    
    for (let i = 1; i <= 5; i++) {
        const value = document.getElementById(`day${i}`).value;
        if (value) {
            const date = new Date(value);
            data[`day${i}`] = date.toISOString().replace('T', ' ').slice(0, 19);
        }
    }

    showStatus('scheduleStatus', 'Saving...', 'info');

    try {
        const response = await fetch(`${SCRIPT_URL}?action=saveSchedule`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('scheduleStatus', '✅ Schedule saved successfully!', 'success');
        } else {
            showStatus('scheduleStatus', 'Error: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showStatus('scheduleStatus', 'Error saving: ' + error.message, 'error');
    }
}

// Settings Management
async function loadSettings() {
    if (!isAuthenticated) return;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getSettings`);
        const data = await response.json();
        
        document.getElementById('adminEmail').value = data['Admin Email'] || '';
        document.getElementById('testDuration').value = data['Test Duration'] || 120;
        document.getElementById('uploadTime').value = data['Upload Time'] || 30;
    } catch (error) {
        showStatus('settingsStatus', 'Error loading settings: ' + error.message, 'error');
    }
}

async function saveSettings() {
    if (!isAuthenticated) return;
    
    const data = {
        'Admin Email': document.getElementById('adminEmail').value,
        'Test Duration': document.getElementById('testDuration').value,
        'Upload Time': document.getElementById('uploadTime').value
    };

    showStatus('settingsStatus', 'Saving...', 'info');

    try {
        const response = await fetch(`${SCRIPT_URL}?action=saveSettings`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('settingsStatus', '✅ Settings saved successfully!', 'success');
        } else {
            showStatus('settingsStatus', 'Error: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showStatus('settingsStatus', 'Error saving: ' + error.message, 'error');
    }
}

// Submissions Management
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

async function loadSubmissions() {
    if (!isAuthenticated) return;
    
    const container = document.getElementById('submissionsContainer');
    container.innerHTML = '<p style="color: #666;">Loading submissions...</p>';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getSubmissions`);
        const submissions = await response.json();
        
        cachedSubmissions = submissions;
        
        if (submissions.error) {
            showStatus('submissionsStatus', 'Error: ' + submissions.error, 'error');
            return;
        }

        if (submissions.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No submissions yet.</p>';
            return;
        }

        container.innerHTML = '';
        
        submissions.reverse().forEach(sub => {
            const card = document.createElement('div');
            card.className = 'submission-card';
            
            const timestamp = new Date(sub.timestamp).toLocaleString();
            
            let exitLogs = [];
            try {
                exitLogs = typeof sub.exitLogs === 'string' ? JSON.parse(sub.exitLogs) : sub.exitLogs || [];
            } catch (e) {
                exitLogs = [];
            }
            
            let violationDetails = '';
            if (exitLogs.length > 0) {
                violationDetails = '<div class="violation-details"><strong>Violations:</strong><ul>';
                exitLogs.forEach(log => {
                    const logTime = new Date(log.time).toLocaleTimeString();
                    violationDetails += `<li>${logTime}: ${log.type}</li>`;
                });
                violationDetails += '</ul></div>';
            }
            
            card.innerHTML = `
                <div class="submission-header">
                    <h3>${sub.studentName}</h3>
                    <span style="color: #666;">Day ${sub.day}</span>
                </div>
                <div class="submission-details">
                    <div class="detail-item">
                        <span class="detail-label">Email:</span> ${sub.studentEmail}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Submitted:</span> ${timestamp}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Q1:</span> 
                        <span class="${sub.q1_correct ? 'correct' : 'incorrect'}">
                            ${sub.q1_correct ? '✓ Correct' : '✗ Incorrect'}
                        </span> (Answer: ${sub.q1_answer}) - Time: ${formatTime(sub.q1_time)}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Q2:</span> 
                        <span class="${sub.q2_correct ? 'correct' : 'incorrect'}">
                            ${sub.q2_correct ? '✓ Correct' : '✗ Incorrect'}
                        </span> (Answer: ${sub.q2_answer}) - Time: ${formatTime(sub.q2_time)}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Q3 Time:</span> ${formatTime(sub.q3_time)}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Q3 Answer:</span> 
                        <div style="margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px; white-space: pre-wrap;">${sub.q3_answer}</div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Time:</span> ${formatTime(sub.totalTime)}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Exit Count:</span> 
                        <span style="color: ${sub.exitCount > 0 ? '#dc3545' : '#28a745'}; font-weight: bold;">
                            ${sub.exitCount}
                        </span>
                    </div>
                    ${violationDetails}
                    ${sub.workFileURL ? `<div class="detail-item"><a href="${sub.workFileURL}" target="_blank" class="btn" style="display: inline-block; margin-top: 10px;">View Uploaded Work</a></div>` : ''}
                </div>
            `;
            
            container.appendChild(card);
        });
        
        showStatus('submissionsStatus', `Loaded ${submissions.length} submission(s)`, 'success');
    } catch (error) {
        showStatus('submissionsStatus', 'Error loading submissions: ' + error.message, 'error');
        container.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 40px;">Error loading submissions</p>';
    }
}

// CSV Export
function exportToCSV() {
    if (!isAuthenticated) return;
    
    if (cachedSubmissions.length === 0) {
        alert('No submissions to export. Please load submissions first.');
        return;
    }

    const headers = [
        'Student Name',
        'Email',
        'Day',
        'Timestamp',
        'Q1 Answer',
        'Q1 Correct',
        'Q1 Time (s)',
        'Q2 Answer',
        'Q2 Correct',
        'Q2 Time (s)',
        'Q3 Answer',
        'Q3 Time (s)',
        'Total Time (s)',
        'Exit Count',
        'Violations'
    ];

    const rows = cachedSubmissions.map(sub => {
        let exitLogs = [];
        try {
            exitLogs = typeof sub.exitLogs === 'string' ? JSON.parse(sub.exitLogs) : sub.exitLogs || [];
        } catch (e) {
            exitLogs = [];
        }
        
        const violations = exitLogs.map(log => `${log.time}: ${log.type}`).join('; ');
        
        return [
            sub.studentName,
            sub.studentEmail,
            sub.day,
            sub.timestamp,
            sub.q1_answer,
            sub.q1_correct,
            sub.q1_time,
            sub.q2_answer,
            sub.q2_correct,
            sub.q2_time,
            `"${sub.q3_answer.replace(/"/g, '""')}"`,
            sub.q3_time,
            sub.totalTime,
            sub.exitCount,
            `"${violations}"`
        ];
    });

    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dpotd_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Initialize on page load
window.addEventListener('load', () => {
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
        alert('⚠️ Please update the SCRIPT_URL in admin.js with your Google Apps Script deployment URL');
    }
    document.getElementById('passwordInput').focus();
});
