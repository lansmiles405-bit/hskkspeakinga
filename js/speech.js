/**
 * Module Speech Recognition & Audio Processing (Web Speech API)
 */
class SpeechModule {
    constructor(onTranscriptCallback) {
        this.recognition = null;
        this.isRecording = false;
        this.onTranscript = onTranscriptCallback;
        this.init();
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Trình duyệt không hỗ trợ Web Speech API. Vui lòng sử dụng Google Chrome.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-CN'; // Ngôn ngữ Tiếng Trung Quốc

        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            if (this.onTranscript) this.onTranscript(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech Recognition Error:', event.error);
        };
    }

    start() {
        if (this.recognition && !this.isRecording) {
            this.recognition.start();
            this.isRecording = true;
        }
    }

    stop() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
        }
    }
}