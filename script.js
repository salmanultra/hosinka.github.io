import { getCurrentDate, getEventsForDate } from './date-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const apiKey = "AIzaSyBBxto7HrT84BYwwX5nUolkEdjwcTrKiYY";
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const themeToggle = document.getElementById('theme-toggle');
    const newChatButton = document.getElementById('new-chat');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const clearHistoryButton = document.getElementById('clear-history');
    const exportChatButton = document.getElementById('export-chat');
    const attachFileButton = document.getElementById('attach-file');
    const fileInput = document.getElementById('file-input');
    const voiceInputButton = document.getElementById('voice-input');
    const characterCount = document.querySelector('.character-count');
    const chatHistoryList = document.getElementById('chat-history-list');

    let currentChatId = Date.now();
    let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    let isDarkMode = localStorage.getItem('darkMode') === 'true';
    let isProcessing = false;

    // تنظیم حداکثر کاراکتر
    const MAX_CHARS = 1000;

    // تنظیمات تشخیص صدا
    const SPEECH_CONFIG = {
        lang: 'fa-IR',
        continuous: true,
        interimResults: true,
        maxAlternatives: 3,
        silenceDelay: 1500,
        minConfidence: 0.7,
        maxDuration: 300000, // 5 دقیقه
        soundThreshold: 35,
        noiseThreshold: 20,
        minSoundDuration: 250,
        silenceThreshold: 25,
        consecutiveSilence: 2000,
        maxWords: 1000,
        restartDelay: 1000 // تاخیر برای شروع مجدد
    };

    // تنظیمات پیش‌فرض برای مدل‌ها
    const MODEL_CONFIG = {
        'gemini-2.0-flash-001': {
            temperature: 0.4,
            topK: 16,
            topP: 0.6,
            maxOutputTokens: 1024
        },
        'gemini-1.5-pro': {
            temperature: 0.9,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 2048
        }
    };

    // تنظیمات شخصیت ربات
    const BOT_PERSONA = {
        name: 'هوشینکا',
        creator: 'سلمان',
        defaultResponse: 'من فقط هوشینکام و سلمان منو ساخته'
    };

    // اضافه کردن متغیر برای نگهداری مکالمات فعلی
    let currentConversation = [];

    // مدیریت ورودی کاربر
    userInput.addEventListener('input', (e) => {
        const length = e.target.value.length;
        characterCount.textContent = `${length}/${MAX_CHARS}`;
        if (length > MAX_CHARS) {
            e.target.value = e.target.value.substring(0, MAX_CHARS);
        }
    });

    // تغییر تم
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        localStorage.setItem('darkMode', isDarkMode);
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    themeToggle.addEventListener('click', toggleTheme);

    // تابع کپی کردن کد رو به window اضافه می‌کنیم تا از همه جا قابل دسترسی باشه
    window.copyCode = function(button) {
        const codeBlock = button.parentElement;
        const code = codeBlock.querySelector('code').textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i> کپی شد';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-copy"></i> کپی';
                button.classList.remove('copied');
            }, 2000);
        });
    };

    // بهبود تابع تشخیص و تبدیل کد
    function formatCodeBlocks(text) {
        // الگوی تشخیص بلوک کد با زبان برنامه‌نویسی
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        
        // اگر متن شامل بلوک کد نیست، بررسی کنیم که آیا کل متن یک کد است
        if (!codeBlockRegex.test(text)) {
            // اگر متن شبیه کد است (مثلاً شامل علائم خاص برنامه‌نویسی)
            if (looksLikeCode(text)) {
                return createCodeBlock('plaintext', text);
            }
            return text;
        }
        
        return text.replace(codeBlockRegex, (match, language, code) => {
            return createCodeBlock(language || 'plaintext', code);
        });
    }

    // تابع تشخیص کد
    function looksLikeCode(text) {
        const codeIndicators = [
            /\b(function|class|if|else|for|while|return|var|let|const)\b/, // کلمات کلیدی
            /[{}[\]();]/, // علائم خاص
            /\b(true|false|null|undefined)\b/, // مقادیر خاص
            /\b(\d+\.\d+|\d+)\b/, // اعداد
            /[<>]=?/, // عملگرهای مقایسه
            /\/\*[\s\S]*?\*\/|\/\/.*/, // کامنت‌ها
            /\$\{.*?\}/, // متغیرهای تمپلیت
            /\b(import|export|from)\b/, // کلمات کلیدی ES6
        ];

        return codeIndicators.some(pattern => pattern.test(text));
    }

    // تابع ایجاد بلوک کد
    function createCodeBlock(language, code) {
        return `
            <div class="code-block">
                <span class="language-label">${language}</span>
                <button class="copy-button" onclick="copyCode(this)">
                    <i class="fas fa-copy"></i> کپی
                </button>
                <pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
            </div>
        `;
    }

    // تابع escape کردن HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // بروزرسانی تابع addMessageToChat
    function addMessageToChat(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // اگر پیام از ربات است، بررسی کد
        if (sender === 'bot') {
            messageDiv.innerHTML = formatCodeBlocks(message);
        } else {
            messageDiv.textContent = message;
        }
        
        chatLog.appendChild(messageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
        
        // بروزرسانی حافظه مکالمه
        currentConversation.push({
            role: sender === 'user' ? 'user' : 'assistant',
            parts: [{ text: message }]
        });
        
        if (currentConversation.length > 10) {
            currentConversation = currentConversation.slice(-10);
        }
        
        const chat = chatHistory.find(c => c.id === currentChatId);
        if (chat) {
            chat.conversation = currentConversation;
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        }
    }

    // ارسال پیام به API
    async function processMessage(message) {
        // چک کردن سوالات مربوط به هویت ربات
        const identityQuestions = [
            'تو کی هستی',
            'چی هستی',
            'کی تو رو ساخته',
            'چیکار میکنی',
            'چکاره ای',
            'معرفی کن',
            'خودتو معرفی کن'
        ];

        // چک کردن سوالات مربوط به تاریخ
        const dateQuestions = [
            'امروز چندمه',
            'تاریخ امروز چنده',
            'تاریخ رو بگو',
            'امروز چه روزیه'
        ];

        const lowercaseMessage = message.toLowerCase();

        if (identityQuestions.some(q => lowercaseMessage.includes(q))) {
            return BOT_PERSONA.defaultResponse;
        }

        if (dateQuestions.some(q => lowercaseMessage.includes(q))) {
            const currentDate = getCurrentDate();
            const events = getEventsForDate(currentDate);
            let response = `امروز ${currentDate} است.`;
            if (events.length > 0) {
                response += ` مناسبت‌های امروز: ${events.join(', ')}`;
            }
            return response;
        }

        return null; // ادامه روند عادی پردازش
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message || isProcessing) return;

        try {
            isProcessing = true;
            addMessageToChat('user', message);
            userInput.value = '';
            characterCount.textContent = `0/${MAX_CHARS}`;
            loadingIndicator.style.display = 'block';

            // چک کردن پاسخ‌های از پیش تعریف شده
            const predefinedResponse = await processMessage(message);
            if (predefinedResponse) {
                addMessageToChat('bot', predefinedResponse);
                saveChatHistory(message, predefinedResponse);
                return;
            }

            const selectedModel = document.getElementById('model-select').value;
            const modelConfig = MODEL_CONFIG[selectedModel];
            let attempts = 0;
            const maxAttempts = 3;
            let success = false;

            // Fetch current date and time
            let currentDate = await getCurrentDate();
            let events = await getEventsForDate(currentDate);
            currentDate = `Current date: ${currentDate}. Events: ${events.join(', ')}. `;

            while (attempts < maxAttempts && !success) {
                try {
                    let apiMessage = message;
                    if (selectedModel === 'gemini-1.5-pro') {
                        apiMessage = currentDate + message; // Add date to the message
                    }

                    const requestBody = {
                        contents: currentConversation.concat([{ role: 'user', parts: [{ text: apiMessage }] }]), // Send updated message
                        generationConfig: modelConfig
                    };

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        if (response.status === 429) {
                            addMessageToChat('bot', 'سیستم در حال آماده‌سازی است، لطفاً کمی صبر کنید...');
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            continue;
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.error.message || 'خطای API');
                    }

                    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                        const botResponse = data.candidates[0].content.parts[0].text;
                        addMessageToChat('bot', botResponse);
                        saveChatHistory(message, botResponse);
                        success = true;
                    } else {
                        throw new Error('پاسخ نامعتبر از API');
                    }
                } catch (error) {
                    attempts++;
                    if (attempts === maxAttempts) {
                        throw error;
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (error.message.includes('429')) {
                addMessageToChat('bot', 'سیستم در حال آماده‌سازی است، لطفاً کمی صبر کنید...');
            } else {
                addMessageToChat('bot', 'متأسفانه خطایی در ارتباط با هوش مصنوعی رخ داد. لطفاً دوباره تلاش کنید.');
            }
        } finally {
            loadingIndicator.style.display = 'none';
            isProcessing = false;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // ذخیره تاریخچه چت
    function saveChatHistory(userMessage, botMessage) {
        const chat = chatHistory.find(c => c.id === currentChatId);
        
        if (chat) {
            // اضافه کردن پیام جدید به چت موجود
            chat.messages.push(
                { sender: 'user', text: userMessage },
                { sender: 'bot', text: botMessage }
            );
            chat.conversation = currentConversation; // ذخیره حافظه مکالمه
        } else {
            // ایجاد چت جدید
            const newChat = {
                id: currentChatId,
                timestamp: Date.now(),
                messages: [
                    { sender: 'user', text: userMessage },
                    { sender: 'bot', text: botMessage }
                ],
                conversation: currentConversation // ذخیره حافظه مکالمه
            };
            chatHistory.unshift(newChat);
        }

        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        updateChatHistoryList();
    }

    // به‌روزرسانی لیست تاریخچه
    function updateChatHistoryList() {
        chatHistoryList.innerHTML = '';
        chatHistory.forEach((chat, index) => {
            const li = document.createElement('li');
            const date = new Date(chat.timestamp).toLocaleDateString('fa-IR');
            const preview = chat.messages[0].text.substring(0, 30) + '...';
            
            li.innerHTML = `
                <span class="chat-preview">${date}: ${preview}</span>
                <button class="delete-chat" title="حذف"><i class="fas fa-trash"></i></button>
            `;
            
            li.querySelector('.chat-preview').onclick = () => loadChat(chat);
            li.querySelector('.delete-chat').onclick = (e) => {
                e.stopPropagation();
                deleteChat(index);
            };
            
            chatHistoryList.appendChild(li);
        });
    }

    // بارگذاری چت
    function loadChat(chat) {
        currentChatId = chat.id;
        chatLog.innerHTML = '';
        
        // بازیابی حافظه مکالمه
        currentConversation = chat.conversation || [];
        
        // نمایش پیام‌های قبلی
        chat.messages.forEach(msg => {
            addMessageToChat(msg.sender, msg.text);
        });
    }

    // حذف چت
    function deleteChat(index) {
        if (confirm('آیا از حذف این چت اطمینان دارید؟')) {
            chatHistory.splice(index, 1);
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            updateChatHistoryList();
        }
    }

    // چت جدید
    newChatButton.addEventListener('click', () => {
        currentChatId = Date.now();
        chatLog.innerHTML = '';
        userInput.value = '';
        characterCount.textContent = `0/${MAX_CHARS}`;
        currentConversation = []; // شروع حافظه جدید
    });

    // حالت تمام صفحه
    fullscreenToggle.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            fullscreenToggle.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });

    // پاک کردن تاریخچه
    clearHistoryButton.addEventListener('click', () => {
        if (confirm('آیا مطمئن هستید که می‌خواهید تمام تاریخچه چت را پاک کنید؟')) {
            chatHistory = [];
            currentConversation = [];
            localStorage.removeItem('chatHistory');
            updateChatHistoryList();
            chatLog.innerHTML = '';
        }
    });

    // دانلود تاریخچه
    exportChatButton.addEventListener('click', () => {
        const chatText = chatHistory
            .map(chat => {
                return chat.messages
                    .map(msg => `${msg.sender === 'user' ? 'شما' : 'ربات'}: ${msg.text}`)
                    .join('\n');
            })
            .join('\n\n---\n\n');
        
        const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // آپلود فایل
    attachFileButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                userInput.value += `[فایل: ${file.name}]\n${e.target.result}`;
            };
            reader.readAsText(file);
        }
    });

    // Enhanced Voice Input with Advanced Noise Reduction
    voiceInputButton.addEventListener('click', () => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            let isListening = false;
            let audioContext = null;
            let analyser = null;
            let micStream = null;

            // Advanced Speech Recognition Configuration
            const SPEECH_CONFIG = {
                lang: 'fa-IR',
                continuous: true,
                interimResults: true,
                maxAlternatives: 3,
                silenceDelay: 800,    // Reduced delay for faster response
                minConfidence: 0.6,   // Lower threshold to capture more speech
                maxDuration: 300000,  // 5 minutes
                noiseReductionLevel: 0.5,  // More lenient noise reduction
                soundThreshold: 30,   // More sensitive sound detection
                silenceThreshold: 10, // More sensitive to silence
                maxWords: 1000,
                silenceTimeout: 1500  // Time to wait after silence before sending
            };

            // Advanced Noise Reduction Setup
            function setupNoiseReduction() {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                
                // Create a high-pass filter to reduce low-frequency noise
                const highPassFilter = audioContext.createBiquadFilter();
                highPassFilter.type = 'highpass';
                highPassFilter.frequency.value = 300; // Cut off low frequencies

                // Create a low-pass filter to reduce high-frequency noise
                const lowPassFilter = audioContext.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 3000; // Cut off high frequencies

                return { highPassFilter, lowPassFilter };
            }

            // Noise Level Detection
            function detectNoiseLevel(stream) {
                if (!audioContext) setupNoiseReduction();
                
                const source = audioContext.createMediaStreamSource(stream);
                const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
                
                scriptProcessor.onaudioprocess = (event) => {
                    const inputBuffer = event.inputBuffer;
                    const inputData = inputBuffer.getChannelData(0);
                    const rms = Math.sqrt(inputData.reduce((sq, val) => sq + val * val, 0) / inputData.length);
                    
                    // Adjust microphone button based on noise level
                    if (rms > SPEECH_CONFIG.noiseReductionLevel) {
                        voiceInputButton.classList.add('high-noise');
                    } else {
                        voiceInputButton.classList.remove('high-noise');
                    }
                };

                source.connect(scriptProcessor);
                scriptProcessor.connect(audioContext.destination);
            }

            // Configure Recognition
            recognition.lang = SPEECH_CONFIG.lang;
            recognition.continuous = SPEECH_CONFIG.continuous;
            recognition.interimResults = SPEECH_CONFIG.interimResults;
            recognition.maxAlternatives = SPEECH_CONFIG.maxAlternatives;

            recognition.onstart = async () => {
                try {
                    // Request microphone access
                    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    detectNoiseLevel(micStream);

                    isListening = true;
                    voiceInputButton.classList.add('recording');
                    voiceInputButton.innerHTML = '<i class="fas fa-stop-circle"></i>';
                    userInput.placeholder = 'در حال گوش دادن... (نویز محیط را کاهش دهید)';
                    userInput.value = '';

                    // Audio Feedback
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    oscillator.connect(audioContext.destination);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.2);
                } catch (error) {
                    console.error('Microphone access error:', error);
                    stopRecognition(false);
                }
            };

            let silenceTimer = null;
            let lastSpeechTime = Date.now();
            let accumulatedTranscript = '';

            recognition.onresult = (event) => {
                lastSpeechTime = Date.now();
                let currentTranscript = '';
                let isFinal = false;

                // Process all results
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        isFinal = true;
                        const transcript = result[0].transcript.trim();
                        if (result[0].confidence >= SPEECH_CONFIG.minConfidence) {
                            accumulatedTranscript = transcript;
                        }
                    } else {
                        currentTranscript = result[0].transcript.trim();
                    }
                }

                // Update UI with current speech
                if (currentTranscript) {
                    userInput.value = currentTranscript;
                }

                // Clear existing silence timer
                if (silenceTimer) {
                    clearTimeout(silenceTimer);
                }

                // Set new silence timer
                silenceTimer = setTimeout(() => {
                    const silenceDuration = Date.now() - lastSpeechTime;
                    if (silenceDuration >= SPEECH_CONFIG.silenceTimeout && accumulatedTranscript) {
                        userInput.value = accumulatedTranscript;
                        sendMessage();
                        stopRecognition(true);
                    }
                }, SPEECH_CONFIG.silenceDelay);

                // If we have a final result, consider sending
                if (isFinal && accumulatedTranscript) {
                    userInput.value = accumulatedTranscript;
                    // Wait briefly to see if more speech follows
                    setTimeout(() => {
                        const silenceDuration = Date.now() - lastSpeechTime;
                        if (silenceDuration >= SPEECH_CONFIG.silenceDelay) {
                            sendMessage();
                            stopRecognition(true);
                        }
                    }, SPEECH_CONFIG.silenceDelay);
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                stopRecognition(false);
                
                // Detailed Error Handling
                switch(event.error) {
                    case 'no-speech':
                        alert('هیچ صدایی شناسایی نشد. لطفاً دوباره تلاش کنید.');
                        break;
                    case 'audio-capture':
                        alert('خطا در دسترسی به میکروفون. مطمئن شوید که میکروفون متصل است.');
                        break;
                    case 'not-allowed':
                        alert('دسترسی به میکروفون رد شد. لطفاً تنظیمات مرورگر را بررسی کنید.');
                        break;
                    default:
                        alert('خطای ناشناخته در تشخیص صدا.');
                }
            };

            recognition.onend = () => stopRecognition(false);

            function stopRecognition(successful) {
                if (isListening) {
                    isListening = false;
                    recognition.stop();

                    // Close microphone stream
                    if (micStream) {
                        micStream.getTracks().forEach(track => track.stop());
                    }

                    voiceInputButton.classList.remove('recording', 'high-noise');
                    voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>';
                    userInput.placeholder = 'پیام خود را بنویسید... (Shift + Enter برای خط جدید)';

                    // Audio Feedback
                    if (successful) {
                        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        const oscillator = audioContext.createOscillator();
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
                        oscillator.connect(audioContext.destination);
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + 0.1);
                    }
                }
            }

            // Start or Stop Recognition
            if (!isListening) {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('Start recognition error:', error);
                    alert('خطا در شروع تشخیص صدا. لطفاً صفحه را رفرش کنید.');
                }
            } else {
                stopRecognition(false);
            }
        } else {
            alert('مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند. لطفاً از Chrome یا Edge استفاده کنید.');
        }
    });

    // ارسال با Enter
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // دکمه ارسال
    sendButton.addEventListener('click', sendMessage);

    // تنظیم اولیه تم
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

    // بارگذاری اولیه تاریخچه
    updateChatHistoryList();

    // اضافه کردن کد مربوط به راهنما
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');

    helpButton.addEventListener('click', () => {
        helpModal.style.display = 'flex';
    });

    closeHelp.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });

    // بستن مدال با کلیک خارج از محتوا
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.style.display = 'none';
        }
    });

    // بستن مدال با کلید Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpModal.style.display === 'flex') {
            helpModal.style.display = 'none';
        }
    });
});
