const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRPyEM0A2oP_zU9GTq_tPintK4rU1e16IvGLgCV-P1G4-dsghsw7B_kkgAuPII56X0/exec';

// Global state variables
let startTime;
let timerInterval;
let questionsData;
let q1StartTime, q2StartTime, q3StartTime;
let exitCount = 0;
let exitLogs = [];
let testActive = false;
let currentDay = null;

const TEST_DURATION = 120 * 60 * 1000; // 2 hours in milliseconds

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = 'status ' + type;
    el.style.display = 'block';
}

function showLoading(message) {
    const modal = document.getElementById('loadingModal');
    const text = document.getElementById('loadingText');
    text.textContent = message;
    modal.classList.add('show');
}

function hideLoading() {
    const modal = document.getElementById('loadingModal');
    modal.classList.remove('show');
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Clean answer to only accept numbers
function cleanAnswer(answer) {
    return answer.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
}

// ============================================
// VIOLATION MONITORING
// ============================================

function recordViolation(type) {
    if (!testActive) return;

    exitCount++;
    exitLogs.push({
        time: new Date().toISOString(),
        type: type
    });

    document.getElementById('violationCount').textContent = exitCount;

    const overlay = document.getElementById('warningOverlay');
    const warningText = overlay.querySelector('p:first-child');

    if (type === 'exited_fullscreen') {
        warningText.innerHTML = '<strong>⚠️ WARNING: YOU EXITED FULLSCREEN MODE!</strong>';
    } else if (type === 'tab_hidden') {
        warningText.innerHTML = '<strong>⚠️ WARNING: YOU SWITCHED TABS!</strong>';
    } else {
        warningText.innerHTML = '<strong>⚠️ WARNING: YOU LEFT THE TEST PAGE!</strong>';
    }

    overlay.classList.add('show');
}

function hideWarning() {
    const overlay = document.getElementById('warningOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

function returnToFullscreen() {
    document.documentElement.requestFullscreen()
        .then(() => {
            console.log('Returned to fullscreen');
            hideWarning();
        })
        .catch((err) => {
            alert('Please allow fullscreen mode to continue the test.');
            console.error('Fullscreen error:', err);
        });
}

function handleFullscreenChange() {
    if (!document.fullscreenElement && testActive) {
        recordViolation('exited_fullscreen');
        const overlay = document.getElementById('warningOverlay');
        overlay.classList.add('show');

        setTimeout(() => {
            document.documentElement.requestFullscreen()
                .then(() => {
                    console.log('Re-entered fullscreen');
                    hideWarning();
                })
                .catch((err) => {
                    console.error('Failed to re-enter fullscreen:', err);
                });
        }, 100);
    } else if (document.fullscreenElement && testActive) {
        hideWarning();
    }
}

function handleVisibilityChange() {
    if (document.hidden && testActive) {
        recordViolation('tab_hidden');
        const overlay = document.getElementById('warningOverlay');
        overlay.classList.add('show');
    } else if (!document.hidden && testActive) {
        hideWarning();
    }
}

function handleWindowBlur() {
    if (testActive) {
        recordViolation('window_blur');
        const overlay = document.getElementById('warningOverlay');
        overlay.classList.add('show');
    }
}

function handleWindowFocus() {
    if (testActive) {
        hideWarning();
    }
}

function monitorFullscreen() {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
}

// ============================================
// KEYBOARD & INTERACTION BLOCKING
// ============================================

document.addEventListener('keydown', function(e) {
    if (testActive) {
        if ((e.ctrlKey && e.keyCode === 9) ||
            (e.ctrlKey && e.shiftKey && e.keyCode === 9) ||
            (e.altKey && e.keyCode === 9) ||
            (e.metaKey && e.keyCode === 9) ||
            (e.metaKey && e.keyCode === 192) ||
            (e.ctrlKey && (e.keyCode >= 49 && e.keyCode <= 57)) ||
            (e.metaKey && (e.keyCode >= 49 && e.keyCode <= 57)) ||
            e.keyCode === 123 ||
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
            (e.ctrlKey && e.keyCode === 85) ||
            (e.ctrlKey && e.keyCode === 83) ||
            (e.ctrlKey && e.keyCode === 80) ||
            (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74)) ||
            (e.altKey && e.keyCode === 37) ||
            (e.altKey && e.keyCode === 39) ||
            (e.ctrlKey && e.keyCode === 87) ||
            (e.metaKey && e.keyCode === 87) ||
            e.keyCode === 27) {
            
            e.preventDefault();
            e.stopPropagation();
            recordViolation('keyboard_shortcut_blocked');
            return false;
        }
    }
});

document.addEventListener('keyup', function(e) {
    if (testActive && e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        recordViolation('screenshot_attempt');
    }
});

document.addEventListener('contextmenu', function(e) {
    if (testActive) {
        e.preventDefault();
        recordViolation('right_click');
    }
});

window.addEventListener('beforeunload', function(e) {
    if (testActive) {
        e.preventDefault();
        e.returnValue = '';
        recordViolation('attempted_close');
        return '';
    }
});

// ============================================
// TEST SCHEDULE & DAY MANAGEMENT
// ============================================

async function getCurrentDay() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getSchedule`);
        const schedule = await response.json();
        const now = new Date();
        let activeDay = null;

        for (let i = 1; i <= 5; i++) {
            const dayStart = schedule[`day${i}`] ? new Date(schedule[`day${i}`]) : null;
            const nextDay = schedule[`day${i + 1}`] ? new Date(schedule[`day${i + 1}`]) : null;

            if (dayStart && now >= dayStart) {
                if (!nextDay || now < nextDay) {
                    activeDay = i;
                    break;
                }
            }
        }

        return activeDay;
    } catch (error) {
        console.error('Error getting current day:', error);
        return null;
    }
}

// ============================================
// TIMER MANAGEMENT
// ============================================

function updateTimer() {
    if (!startTime) return;

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, TEST_DURATION - elapsed);

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

    const timerEl = document.getElementById('timer');
    timerEl.textContent = `Time Remaining: ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerEl.style.display = 'block';
    timerEl.style.color = '#000000';

    if (remaining < 10 * 60 * 1000) {
        timerEl.style.color = '#ff6b6b';
    }

    if (remaining <= 0) {
        clearInterval(timerInterval);
        submitTest(true);
    }
}

// ============================================
// TEST START
// ============================================

window.startTest = startTest;
window.submitTest = submitTest;
window.returnToFullscreen = returnToFullscreen;

async function startTest() {
    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const emailError = document.getElementById('emailError');

    emailError.textContent = '';

    if (!name || !email) {
        showStatus('startStatus', 'Please fill in all fields', 'error');
        return;
    }

    if (!validateEmail(email)) {
        emailError.textContent = 'Please enter a valid email address (e.g., student@example.com)';
        showStatus('startStatus', 'Invalid email format', 'error');
        return;
    }

    showLoading('Determining current day...');

    currentDay = await getCurrentDay();
    if (!currentDay) {
        hideLoading();
        showStatus('startStatus', 'No test is currently available. Please check the schedule.', 'error');
        return;
    }

    showLoading(`Loading Day ${currentDay} questions...`);

    try {
        const checkResponse = await fetch(`${SCRIPT_URL}?action=checkSubmission&email=${encodeURIComponent(email)}&day=${currentDay}`);
        const checkData = await checkResponse.json();

        if (checkData.exists) {
            hideLoading();
            showStatus('startStatus', 'You have already submitted this test!', 'error');
            return;
        }

        showLoading('Loading questions...');
        const response = await fetch(`${SCRIPT_URL}?action=getQuestions&day=${currentDay}`);
        questionsData = await response.json();

        if (questionsData.error) {
            hideLoading();
            showStatus('startStatus', 'Error: ' + questionsData.error, 'error');
            return;
        }

        document.getElementById('q1Text').textContent = questionsData.q1_text;
        document.getElementById('q2Text').textContent = questionsData.q2_text;
        document.getElementById('q3Text').textContent = questionsData.q3_text;
        document.getElementById('dayIndicator').textContent = `Day ${currentDay}`;

        hideLoading();

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn';
        confirmBtn.style.marginTop = '20px';
        confirmBtn.textContent = 'Enter Fullscreen & Begin Test';
        
        confirmBtn.onclick = async function() {
            try {
                await document.documentElement.requestFullscreen();
                console.log('Entered fullscreen successfully');
                
                confirmBtn.remove();

                document.getElementById('studentForm').style.display = 'none';
                document.getElementById('questionSection').style.display = 'block';

                document.body.classList.add('locked');
                testActive = true;
                monitorFullscreen();

                startTime = Date.now();
                q1StartTime = Date.now();
                timerInterval = setInterval(updateTimer, 1000);
                updateTimer();
            } catch (err) {
                console.error('Fullscreen error:', err);
                alert('Fullscreen mode is required to take the test. Please allow fullscreen and try again.');
            }
        };

        const statusEl = document.getElementById('startStatus');
        statusEl.textContent = 'Questions loaded! Click below to enter fullscreen mode and begin.';
        statusEl.className = 'status success';
        statusEl.style.display = 'block';
        statusEl.parentElement.appendChild(confirmBtn);

        const q1AnswerEl = document.getElementById('q1Answer');
        const q2AnswerEl = document.getElementById('q2Answer');
        
        if (q1AnswerEl) {
            q1AnswerEl.addEventListener('focus', () => {
                if (!q2StartTime) q2StartTime = Date.now();
            });
        }

        if (q2AnswerEl) {
            q2AnswerEl.addEventListener('focus', () => {
                if (!q3StartTime) q3StartTime = Date.now();
            });
        }

        setTimeout(() => {
            if (testActive) {
                alert('Time is up! Your test will be submitted automatically.');
                submitTest(true);
            }
        }, TEST_DURATION);

    } catch (error) {
        hideLoading();
        showStatus('startStatus', 'Error connecting to server: ' + error.message, 'error');
        console.error('Error:', error);
    }
}

// ============================================
// TEST SUBMISSION
// ============================================

async function submitTest(isForced = false) {
    if (!testActive && !isForced) {
        console.log('Test not active, submission blocked');
        return;
    }

    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const q1Answer = cleanAnswer(document.getElementById('q1Answer').value.trim());
    const q2Answer = cleanAnswer(document.getElementById('q2Answer').value.trim());
    const q3Answer = document.getElementById('q3Answer').value.trim();

    if (!isForced && (!q1Answer || !q2Answer || !q3Answer)) {
        showStatus('submitStatus', 'Please answer all questions', 'error');
        return;
    }

    testActive = false;
    clearInterval(timerInterval);

    const endTime = Date.now();
    const totalTime = Math.floor((endTime - startTime) / 1000);
    const q1Time = q2StartTime ? Math.floor((q2StartTime - q1StartTime) / 1000) : totalTime;
    const q2Time = q3StartTime ? Math.floor((q3StartTime - q2StartTime) / 1000) : 0;
    const q3Time = Math.floor((endTime - (q3StartTime || q2StartTime || q1StartTime)) / 1000);

    const q1Correct = q1Answer === cleanAnswer(questionsData.q1_answer);
    const q2Correct = q2Answer === cleanAnswer(questionsData.q2_answer);

    const submission = {
        studentName: name,
        studentEmail: email,
        day: currentDay,
        q1_answer: q1Answer,
        q2_answer: q2Answer,
        q3_answer: q3Answer,
        q1_correct: q1Correct,
        q2_correct: q2Correct,
        q1_time: q1Time,
        q2_time: q2Time,
        q3_time: q3Time,
        totalTime: totalTime,
        exitCount: exitCount,
        exitLogs: JSON.stringify(exitLogs),
        workFileURL: ''
    };

    showLoading(isForced ? 'Auto-submitting test...' : 'Submitting your answers...');
    document.getElementById('submitBtn').disabled = true;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(submission)
        });

        const responseText = await response.text();
        const result = JSON.parse(responseText);

        hideLoading();

        if (result.success) {
            testActive = false;
            document.body.classList.remove('locked');
            hideWarning();

            if (document.exitFullscreen) {
                document.exitFullscreen();
            }

            document.getElementById('questionSection').style.display = 'none';

            const resultsHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <h1 style="color: #28a745; margin-bottom: 20px;">✅ Test Submitted Successfully!</h1>
                    <p style="font-size: 18px; color: #666; margin-bottom: 30px;">
                        Thanks for submitting! Your score will be emailed to you soon.
                    </p>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #EA5A2F; max-width: 500px; margin: 0 auto;">
                        <h2 style="margin-bottom: 20px; color: #000;">Your Results</h2>
                        
                        <div style="text-align: left; margin-bottom: 15px;">
                            <strong style="color: #495057;">Question 1:</strong>
                            <span class="${q1Correct ? 'correct' : 'incorrect'}" style="font-size: 18px; margin-left: 10px;">
                                ${q1Correct ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                            <div style="color: #666; font-size: 14px; margin-top: 5px;">
                                Your answer: ${q1Answer}
                            </div>
                        </div>
                        
                        <div style="text-align: left; margin-bottom: 15px;">
                            <strong style="color: #495057;">Question 2:</strong>
                            <span class="${q2Correct ? 'correct' : 'incorrect'}" style="font-size: 18px; margin-left: 10px;">
                                ${q2Correct ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                            <div style="color: #666; font-size: 14px; margin-top: 5px;">
                                Your answer: ${q2Answer}
                            </div>
                        </div>
                        
                        <div style="text-align: left;">
                            <strong style="color: #495057;">Question 3:</strong>
                            <span style="color: #666; font-size: 14px; margin-left: 10px;">
                                Will be graded manually
                            </span>
                        </div>
                        
                        <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #E3E3E3;">
                            <strong style="color: #495057;">Total Time:</strong>
                            <span style="color: #000; font-size: 18px; margin-left: 10px;">
                                ${Math.floor(totalTime / 60)} minutes ${totalTime % 60} seconds
                            </span>
                        </div>
                        
                        ${exitCount > 0 ? `
                        <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 6px;">
                            <strong style="color: #856404;">⚠️ Violations: ${exitCount}</strong>
                            <div style="color: #856404; font-size: 14px; margin-top: 5px;">
                                These have been recorded and may affect your score.
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <button class="btn" onclick="window.location.reload()" style="max-width: 300px; margin: 30px auto 0;">
                        Back to Home
                    </button>
                </div>
            `;

            document.querySelector('.container').innerHTML = resultsHTML;
        } else {
            showStatus('submitStatus', 'Error: ' + (result.error || 'Unknown error'), 'error');
            testActive = true;
            document.getElementById('submitBtn').disabled = false;
        }
    } catch (error) {
        hideLoading();
        showStatus('submitStatus', 'Error submitting: ' + error.message, 'error');
        console.error('Error:', error);
        testActive = true;
        document.getElementById('submitBtn').disabled = false;
    }
}

// ============================================
// INPUT VALIDATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const numberInputs = ['q1Answer', 'q2Answer'];
    
    numberInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function(e) {
                const cleaned = cleanAnswer(e.target.value);
                if (e.target.value !== cleaned) {
                    e.target.value = cleaned;
                }
            });
        }
    });
});
