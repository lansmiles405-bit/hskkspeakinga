document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    
    // Khởi tạo ghi âm giọng nói
    const speech = new SpeechModule((text) => {
        const input = document.getElementById('transcript-input');
        if (input) input.value = text;
    });
    
    const ai = new AIEngine(db);

    let currentMode = 'practice';
    let timerInterval = null;
    let secondsLeft = 0;

    // Modal API Key
    const modal = document.getElementById('api-modal');
    document.getElementById('api-key-btn')?.addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('close-api-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('save-api-key')?.addEventListener('click', async () => {
        const val = document.getElementById('api-key-input').value;
        if (val) {
            await db.setSetting('gemini_api_key', val);
            modal.classList.add('hidden');
            alert('Lưu API Key thành công!');
        }
    });

    // Chuyển Tab Mode
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.tab;
        });
    });

    // Nút Ghi âm
    const startBtn = document.getElementById('start-rec-btn');
    const stopBtn = document.getElementById('stop-rec-btn');
    
    startBtn?.addEventListener('click', () => {
        speech.start();
        if (stopBtn) stopBtn.style.display = 'block';
        
        secondsLeft = currentMode === 'exam' ? 60 : 120;
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.innerText = `${secondsLeft}s`;
        
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsLeft--;
            if (timerEl) timerEl.innerText = `${secondsLeft}s`;
            if (secondsLeft <= 0) {
                clearInterval(timerInterval);
                stopBtn?.click();
            }
        }, 1000);
    });

    stopBtn?.addEventListener('click', () => {
        speech.stop();
        clearInterval(timerInterval);
        if (stopBtn) stopBtn.style.display = 'none';
    });

    // Chèn mẫu câu nhanh
    document.querySelectorAll('.formula-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const input = document.getElementById('transcript-input');
            if (input && chip.dataset.insert) {
                input.value += chip.dataset.insert;
            }
        });
    });

    // Phân tích hình ảnh Gemini
    document.getElementById('analyze-img-btn')?.addEventListener('click', async () => {
        const content = document.getElementById('analysis-content');
        if (content) content.innerHTML = '<p>🔄 Đang phân tích hình ảnh bằng AI...</p>';

        try {
            const imgEl = document.getElementById('preview-image');
            const imgData = await getBase64Image(imgEl);
            const res = await ai.analyzeImage(imgData);

            content.innerHTML = `
                <ul class="analysis-list">
                    <li><b>人物:</b> ${res.analysis.people || 'Trống'}</li>
                    <li><b>地点:</b> ${res.analysis.location || 'Trống'}</li>
                    <li><b>动作:</b> ${res.analysis.action || 'Trống'}</li>
                    <li><b>物品:</b> ${res.analysis.objects || 'Trống'}</li>
                    <li><b>场景:</b> ${res.analysis.context || 'Trống'}</li>
                </ul>
            `;
        } catch (err) {
            if (content) content.innerHTML = `<p style="color:red;">Lỗi phân tích: ${err.message}</p>`;
        }
    });

    // Chấm điểm bài nói
    document.getElementById('submit-btn')?.addEventListener('click', async () => {
        const transcript = document.getElementById('transcript-input').value;
        const output = document.getElementById('evaluation-output');

        if (!transcript) return alert('Vui lòng nói hoặc nhập transcript!');
        if (output) output.innerHTML = '⏳ AI đang chấm điểm bài nói của bạn...';

        try {
            const imgEl = document.getElementById('preview-image');
            const imgData = await getBase64Image(imgEl);
            const res = await ai.evaluateSpeaking(transcript, imgData);

            if (output) {
                output.innerHTML = `
                    <p>🎯 <strong>Điểm tổng: ${res.scores.overall}/100</strong> (${res.hskLevelFit})</p>
                    <p>💡 <strong>Gợi ý sửa lỗi:</strong></p>
                    <div>${res.coloredCorrections.map(c => `<mark style="padding:2px 4px; border-radius:4px;">${c.text}</mark> ${c.suggestion ? `👉 <em>${c.suggestion}</em>` : ''}`).join('<br>')}</div>
                    <p style="margin-top:8px;">🌟 <strong>Câu chuẩn bản ngữ:</strong> ${res.nativeVersion}</p>
                `;
            }
        } catch (err) {
            if (output) output.innerHTML = `<p style="color:red;">Lỗi chấm điểm: ${err.message}</p>`;
        }
    });

    // Hàm chuyển Ảnh sang Base64
    function getBase64Image(imgEl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
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
            img.onerror = (err) => reject(new Error("Không thể tải ảnh để phân tích: " + err));
        });
    }
});
