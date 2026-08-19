/**
 * Controller chính kết nối toàn bộ hệ thống
 */
document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    
    const speech = new SpeechModule((text) => {
        document.getElementById('transcript-input').value = text;
    });
    
    const ai = new AIEngine(db);
    const dashboard = new DashboardModule(db);

    let currentMode = 'practice';
    let timerInterval = null;
    let secondsLeft = 0;

    // API Key Modal Controls
    const modal = document.getElementById('api-modal');
    document.getElementById('api-key-btn').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('close-api-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('save-api-key').addEventListener('click', async () => {
        const val = document.getElementById('api-key-input').value;
        if (val) {
            await db.setSetting('gemini_api_key', val);
            modal.classList.add('hidden');
            alert('Lưu API Key thành công!');
        }
    });

    // Navigation Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.tab;

            if (currentMode === 'dashboard') {
                document.getElementById('practice-assistance').classList.add('hidden');
                document.getElementById('evaluation-result').classList.add('hidden');
                document.getElementById('dashboard-view').classList.remove('hidden');
                dashboard.render();
            } else {
                document.getElementById('dashboard-view').classList.add('hidden');
                if (currentMode === 'exam') {
                    document.getElementById('practice-assistance').classList.add('hidden');
                } else {
                    document.getElementById('practice-assistance').classList.remove('hidden');
                }
            }
        });
    });

    // Recording Controls
    const startBtn = document.getElementById('start-rec-btn');
    const stopBtn = document.getElementById('stop-rec-btn');
    
    startBtn.addEventListener('click', () => {
        speech.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        secondsLeft = currentMode === 'exam' ? 60 : 120;
        document.getElementById('timer').innerText = `00:${secondsLeft}`;
        
        timerInterval = setInterval(() => {
            secondsLeft--;
            document.getElementById('timer').innerText = `00:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;
            if (secondsLeft <= 0) {
                clearInterval(timerInterval);
                stopBtn.click();
            }
        }, 1000);
    });

    stopBtn.addEventListener('click', () => {
        speech.stop();
        clearInterval(timerInterval);
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });

    // Image Prompt Inserter
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const input = document.getElementById('transcript-input');
            input.value += chip.dataset.insert;
        });
    });

    // Vision Analysis
    document.getElementById('analyze-img-btn').addEventListener('click', async () => {
        const loading = document.getElementById('analysis-loading');
        const content = document.getElementById('analysis-content');
        loading.classList.remove('hidden');
        content.innerHTML = '';

        try {
            const imgData = await getBase64Image(document.getElementById('preview-image'));
            const res = await ai.analyzeImage(imgData);

            loading.classList.add('hidden');
            content.innerHTML = `
                <p><strong>Đối tượng:</strong> ${res.analysis.people}</p>
                <p><strong>Hành động:</strong> ${res.analysis.action}</p>
                <p><strong>Địa điểm:</strong> ${res.analysis.location}</p>
                <hr>
                <h4>Từ vựng gợi ý:</h4>
                <p><strong>HSKK Trung cấp:</strong> ${res.vocabulary.intermediate.join(', ')}</p>
                <p><strong>HSKK Cao cấp:</strong> ${res.vocabulary.advanced.join(', ')}</p>
            `;
        } catch (err) {
            loading.classList.add('hidden');
            alert('Lỗi phân tích: ' + err.message);
        }
    });

    // Submit & AI Evaluate
    document.getElementById('submit-btn').addEventListener('click', async () => {
        const transcript = document.getElementById('transcript-input').value;
        if (!transcript) return alert('Vui lòng nói hoặc nhập transcript!');

        const imgData = await getBase64Image(document.getElementById('preview-image'));
        
        try {
            const res = await ai.evaluateSpeaking(transcript, imgData);
            
            // Save to DB
            await db.saveEvaluation({
                timestamp: Date.now(),
                mode: currentMode,
                transcript,
                scores: res.scores,
                hskLevelFit: res.hskLevelFit
            });

            // Display Results
            document.getElementById('practice-assistance').classList.add('hidden');
            document.getElementById('evaluation-result').classList.remove('hidden');

            document.getElementById('total-score').innerText = res.scores.overall;
            document.getElementById('hsk-fit-level').innerText = `Trình độ tương đương: ${res.hskLevelFit}`;

            const subScoresContainer = document.getElementById('sub-scores');
            subScoresContainer.innerHTML = Object.entries(res.scores)
                .filter(([k]) => k !== 'overall')
                .map(([key, score]) => `<div class="score-item"><span>${key.toUpperCase()}</span><strong>${score}</strong></div>`)
                .join('');

            const coloredContainer = document.getElementById('colored-corrections');
            coloredContainer.innerHTML = res.coloredCorrections.map(c => 
                `<mark class="${c.type}">${c.text}</mark> ${c.suggestion ? `(Gợi ý: ${c.suggestion})` : ''}<br>`
            ).join('');

            document.getElementById('native-upgrade').innerText = res.nativeVersion;

        } catch (err) {
            alert('Lỗi chấm điểm: ' + err.message);
        }
    });

    // Utility Base64 Image Converter
function getBase64Image(imgEl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Bắt buộc trình duyệt yêu cầu quyền CORS khi tải ảnh
        img.crossOrigin = "anonymous"; 
        img.src = imgEl.src;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg"));
        };

        img.onerror = (err) => reject(new Error("Không thể chuyển đổi ảnh: " + err));
    });
}
});
