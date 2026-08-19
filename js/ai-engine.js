/**
 * Module AI Engine kết nối Gemini API
 */
class AIEngine {
    constructor(db) {
        this.db = db;
    }

    async getApiKey() {
        return await this.db.getSetting('gemini_api_key');
    }

    async analyzeImage(base64Image) {
        const apiKey = await this.getApiKey();
        if (!apiKey) throw new Error('Chưa cấu hình Gemini API Key!');

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `Bạn là giám khảo HSKK. Hãy phân tích hình ảnh này để hỗ trợ người học luyện nói.
Trả về dữ liệu JSON theo cấu trúc chính xác:
{
  "analysis": {
    "people": "...",
    "action": "...",
    "location": "...",
    "objects": "...",
    "context": "..."
  },
  "vocabulary": {
    "beginner": ["..."],
    "intermediate": ["..."],
    "advanced": ["..."]
  },
  "sentences": {
    "level1": "...",
    "level2": "...",
    "level3": "..."
  }
}`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } }
                ]
            }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await res.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);
    }

    async evaluateSpeaking(transcript, imageBase64) {
        const apiKey = await this.getApiKey();
        if (!apiKey) throw new Error('Chưa cấu hình API Key!');

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `Đóng vai giám khảo HSKK chuyên nghiệp. Chấm điểm bài nói mô tả tranh dựa trên transcript và ảnh.
Transcript người học: "${transcript}"

Hãy đánh giá và trả về kết quả định dạng JSON:
{
  "scores": {
    "content": 85,
    "vocabulary": 80,
    "grammar": 75,
    "fluency": 80,
    "pronunciation": 70,
    "coherence": 85,
    "taskCompletion": 90,
    "naturalness": 75,
    "overall": 80
  },
  "hskLevelFit": "HSKK Intermediate (78%)",
  "coloredCorrections": [
    {"text": "图片中有一个学生。", "type": "correct"},
    {"text": "他学习很认真地。", "type": "warning", "suggestion": "他学习得很认真。"}
  ],
  "nativeVersion": "从图片中可以看出，一名学生正在图书馆专心致志地学习。"
}`;

        const parts = [{ text: prompt }];
        if (imageBase64) {
            parts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } });
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } })
        });

        const data = await res.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);
    }
}