class DafYomiPlayer {
    constructor() {
        this.audioData = {};
        this.masechetData = [];
        this.currentTractate = '';
        this.currentDaf = '';
        this.currentLanguage = 'en';
        this.audio = document.getElementById('audio-player');
        this.isPlaying = false;
        this.isLoading = false;
        
        this.initializeElements();
        this.loadData();
        this.bindEvents();
        this.setInitialState();
    }
    
    initializeElements() {
        this.tractateSelect = document.getElementById('tractate-select');
        this.dafSelect = document.getElementById('daf-select');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.loading = document.getElementById('loading');
        
        // Header study badge elements
        this.headerStudyBadge = document.getElementById('header-study-badge');
        this.headerMasechetDisplay = document.getElementById('header-masechet-display');
        this.headerDafDisplay = document.getElementById('header-daf-display');
        this.headerEnglishDisplay = document.getElementById('header-english-display');

        // Text section elements
        this.textSection = document.getElementById('text-section');
        this.textLoading = document.getElementById('text-loading');
        this.textContent = document.getElementById('text-content');
        this.hebrewBtn = document.getElementById('hebrew-btn');
        this.englishBtn = document.getElementById('english-btn');
    }
    
    async loadData() {
        try {
            // Load both audio data and masechet data
            const [audioResponse, masechetResponse] = await Promise.all([
                fetch('data.json'),
                fetch('masechet.json')
            ]);
            
            this.audioData = await audioResponse.json();
            this.masechetData = await masechetResponse.json();
            
            this.populateTractateDropdown();
            this.initRoutingAndState();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }
    
    getTractateKey(tractate) {
        if (!tractate) return '';
        let clean = tractate.replace(/\s+/g, '');
        if (clean === 'Chullin') clean = 'Chulin';
        if (clean === 'RoshHashanah') clean = 'RoshHashana';
        return clean;
    }

    normalizeSlug(str) {
        if (!str) return '';
        const aliases = {
            'chullin': 'chulin',
            'roshhashanah': 'roshhashana',
            'avodazarah': 'avodahzarah',
            'avodazara': 'avodahzarah',
            'beitza': 'beitzah',
            'megila': 'megillah',
            'nida': 'niddah',
            'bechorot': 'bekhorot',
            'arachin': 'arakhin',
            'hagigah': 'chagigah',
            'brachot': 'berakhot',
            'berachot': 'berakhot',
        };
        const cleaned = decodeURIComponent(str).trim().toLowerCase().replace(/[\s\-_]/g, '');
        return aliases[cleaned] || cleaned;
    }

    findTractateKey(input) {
        if (!input) return null;
        const normalized = this.normalizeSlug(input);

        // Check in masechetData by title, heTitle, or normalized key
        for (const m of this.masechetData) {
            const key = this.getTractateKey(m.title);
            if (
                this.normalizeSlug(m.title) === normalized ||
                this.normalizeSlug(m.heTitle) === normalized ||
                this.normalizeSlug(key) === normalized
            ) {
                return key;
            }
        }

        // Check directly in audioData keys
        for (const key of Object.keys(this.audioData)) {
            if (this.normalizeSlug(key) === normalized) {
                return key;
            }
        }

        return null;
    }

    getTractateSlug(tractateKey) {
        if (!tractateKey) return '';
        const slugMap = {
            'Chulin': 'chulin',
            'BavaKamma': 'bava-kamma',
            'BavaMetzia': 'bava-metzia',
            'BavaBatra': 'bava-batra',
            'RoshHashana': 'rosh-hashana',
            'MoedKatan': 'moed-katan',
            'AvodahZarah': 'avodah-zarah',
        };
        if (slugMap[tractateKey]) return slugMap[tractateKey];
        return tractateKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    parseDafNumber(dafInput) {
        if (!dafInput) return null;
        const raw = decodeURIComponent(dafInput).trim();
        if (/^\d+$/.test(raw)) {
            return String(parseInt(raw, 10));
        }
        const gematriaValues = {
            'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
            'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
            'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90,
            'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
        };
        let total = 0;
        for (const char of raw) {
            if (gematriaValues[char]) {
                total += gematriaValues[char];
            } else {
                return null;
            }
        }
        return total > 0 ? String(total) : null;
    }

    saveLastPlayed() {
        if (!this.currentTractate || !this.currentDaf) return;
        try {
            const data = {
                tractate: this.currentTractate,
                daf: this.currentDaf,
                timestamp: Date.now()
            };
            localStorage.setItem('dafyomi_last_played', JSON.stringify(data));
        } catch (e) {
            console.warn('Unable to save to localStorage:', e);
        }
    }

    getLastPlayed() {
        try {
            const raw = localStorage.getItem('dafyomi_last_played');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.tractate && parsed.daf) {
                return parsed;
            }
        } catch (e) {
            console.warn('Unable to read from localStorage:', e);
        }
        return null;
    }

    updateHeaderStudyDisplay() {
        if (this.currentTractate && this.currentDaf) {
            const hebrewTitle = this.getHebrewTitle(this.currentTractate);
            const gematriaTitle = this.convertToGematria(this.currentDaf);
            const masechet = this.masechetData.find(
                m => m.title === this.currentTractate || this.getTractateKey(m.title) === this.currentTractate
            );
            const englishTitle = this.currentTractate === 'Chulin' 
                ? 'Chulin' 
                : (masechet ? masechet.title : this.currentTractate.replace(/([A-Z])/g, ' $1').trim());

            if (this.headerMasechetDisplay) {
                this.headerMasechetDisplay.textContent = `מסכת ${hebrewTitle}`;
            }
            if (this.headerDafDisplay) {
                this.headerDafDisplay.textContent = `דף ${gematriaTitle}`;
            }
            if (this.headerEnglishDisplay) {
                this.headerEnglishDisplay.textContent = `(${englishTitle} ${this.currentDaf})`;
            }
            if (this.headerStudyBadge) {
                this.headerStudyBadge.style.display = 'inline-flex';
            }
        } else {
            if (this.headerStudyBadge) {
                this.headerStudyBadge.style.display = 'none';
            }
        }
    }

    selectTractate(tractate, explicitDaf = null, shouldPushHistory = true) {
        const key = this.getTractateKey(tractate);
        const tractateData = this.audioData[key] || this.audioData[tractate];
        if (!tractateData) return;

        const dafs = Array.isArray(tractateData) ? tractateData : tractateData.dafs || [];
        if (dafs.length === 0) return;

        this.currentTractate = key;
        this.tractateSelect.value = key;
        this.populateDafDropdown(key);

        // If explicit daf is provided and exists in dafs, use it;
        // Otherwise, automatically select page 2 (or first available daf)
        let targetDaf = null;
        if (explicitDaf && dafs.includes(String(explicitDaf))) {
            targetDaf = String(explicitDaf);
        } else if (dafs.includes('2')) {
            targetDaf = '2';
        } else {
            targetDaf = dafs[0];
        }

        this.selectDaf(targetDaf, shouldPushHistory);
    }

    selectDaf(daf, shouldPushHistory = true) {
        if (!this.currentTractate) return;

        this.currentDaf = String(daf);
        this.dafSelect.value = this.currentDaf;

        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            this.updatePlayPauseButton();
        }

        this.loadAudio();
        this.loadTalmudText();
        this.updatePageTitle();
        this.updateHeaderStudyDisplay();
        this.saveLastPlayed();

        if (shouldPushHistory) {
            this.updateURL();
        }
    }

    getRouteFromURL() {
        let path = '';
        if (window.location.hash) {
            path = window.location.hash.replace(/^#\/?/, '');
        } else {
            const search = window.location.search;
            if (search && search.startsWith('?/')) {
                path = search.slice(2);
            } else {
                path = window.location.pathname;
            }
        }

        path = path.replace(/^\/+|\/+$/g, '');
        if (path.startsWith('index.html')) {
            path = path.replace(/^index\.html\/?/, '');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const queryMasechet = urlParams.get('masechet') || urlParams.get('tractate');
        const queryDaf = urlParams.get('daf') || urlParams.get('page');

        if (queryMasechet) {
            const tractateKey = this.findTractateKey(queryMasechet);
            const daf = this.parseDafNumber(queryDaf);
            if (tractateKey) {
                return { tractate: tractateKey, daf };
            }
        }

        if (!path) {
            return { tractate: null, daf: null };
        }

        const parts = path.split('/').filter(Boolean);
        if (parts.length === 0) {
            return { tractate: null, daf: null };
        }

        const masechetInput = parts[0];
        const dafInput = parts[1] || null;

        const tractateKey = this.findTractateKey(masechetInput);
        const daf = dafInput ? this.parseDafNumber(dafInput) : null;

        return { tractate: tractateKey, daf };
    }

    updateURL(customPath = null) {
        if (customPath !== null) {
            const targetUrl = customPath || '/';
            if (window.location.pathname !== targetUrl) {
                window.history.pushState(null, '', targetUrl);
            }
            return;
        }

        if (this.currentTractate && this.currentDaf) {
            const slug = this.getTractateSlug(this.currentTractate);
            const newPath = `/${slug}/${this.currentDaf}`;
            if (window.location.pathname !== newPath) {
                window.history.pushState(
                    { tractate: this.currentTractate, daf: this.currentDaf },
                    '',
                    newPath
                );
            }
        }
    }

    initRoutingAndState() {
        const route = this.getRouteFromURL();
        if (route.tractate) {
            // Direct navigation requested via URL
            this.selectTractate(route.tractate, route.daf, false);

            // Canonicalize URL pathname if needed
            const canonicalSlug = this.getTractateSlug(this.currentTractate);
            const canonicalPath = `/${canonicalSlug}/${this.currentDaf}`;
            if (window.location.pathname !== canonicalPath && !window.location.hash) {
                window.history.replaceState(
                    { tractate: this.currentTractate, daf: this.currentDaf },
                    '',
                    canonicalPath
                );
            }
        } else {
            // Clean URL: Load the latest daf that was played if available
            const lastPlayed = this.getLastPlayed();
            if (lastPlayed && lastPlayed.tractate) {
                const key = this.getTractateKey(lastPlayed.tractate);
                const tractateData = this.audioData[key] || this.audioData[lastPlayed.tractate];
                if (tractateData) {
                    const dafs = Array.isArray(tractateData) ? tractateData : tractateData.dafs || [];
                    const validDaf = dafs.includes(String(lastPlayed.daf)) ? String(lastPlayed.daf) : null;
                    if (validDaf) {
                        this.selectTractate(key, validDaf, false);
                    }
                }
            }
        }
    }

    populateTractateDropdown() {
        // Sort masechet data by order
        this.masechetData.sort((a, b) => a.order - b.order);
        
        // Filter to only show tractates that have available audio content
        const availableTractates = this.masechetData.filter(masechet => {
            const key = this.getTractateKey(masechet.title);
            const tractateData = this.audioData[key] || this.audioData[masechet.title];
            if (!tractateData) return false;
            
            // Handle both old format (array) and new format (object with dafs array)
            const dafs = Array.isArray(tractateData) ? tractateData : tractateData.dafs || [];
            return dafs.length > 0;
        });
        
        availableTractates.forEach(masechet => {
            const tractateKey = this.getTractateKey(masechet.title);
            const option = document.createElement('option');
            option.value = tractateKey;
            option.textContent = masechet.heTitle; // Show only Hebrew text
            this.tractateSelect.appendChild(option);
        });
    }
    
    // Convert number to Hebrew gematria
    convertToGematria(num) {
        const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
        const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
        const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
        
        let result = '';
        let n = parseInt(num);
        
        // Handle hundreds
        if (n >= 100) {
            const hundredsDigit = Math.floor(n / 100);
            if (hundredsDigit <= 4) {
                result += hundreds[hundredsDigit];
            } else {
                // For numbers > 400, use ת + remaining hundreds
                result += 'ת';
                const remaining = hundredsDigit - 4;
                if (remaining <= 4) {
                    result += hundreds[remaining];
                }
            }
            n %= 100;
        }
        
        // Handle special cases for 15 and 16 (to avoid writing God's name)
        if (n === 15) {
            result += 'טו';
            return result;
        } else if (n === 16) {
            result += 'טז';
            return result;
        }
        
        // Handle tens
        if (n >= 10) {
            const tensDigit = Math.floor(n / 10);
            if (tensDigit <= 9) {
                result += tens[tensDigit];
            }
            n %= 10;
        }
        
        // Handle ones
        if (n > 0 && n <= 9) {
            result += ones[n];
        }
        
        return result || 'א'; // Return aleph for 0 or empty result
    }

    populateDafDropdown(tractate) {
        const key = this.getTractateKey(tractate);
        const tractateData = this.audioData[key] || this.audioData[tractate];
        if (!tractateData) return;
        
        // Handle both old format (array) and new format (object with dafs array)
        const dafs = Array.isArray(tractateData) ? tractateData : tractateData.dafs || [];
        
        // Clear and enable daf dropdown
        this.dafSelect.innerHTML = '<option value="">דף</option>';
        this.dafSelect.disabled = false;
        
        // Sort numerically
        dafs.sort((a, b) => parseInt(a) - parseInt(b));
        
        dafs.forEach(daf => {
            const option = document.createElement('option');
            option.value = daf;
            option.textContent = this.convertToGematria(daf);
            this.dafSelect.appendChild(option);
        });
    }
    
    formatTractateName(tractate) {
        const key = this.getTractateKey(tractate);
        // Find the Hebrew title for this tractate
        const masechet = this.masechetData.find(m => m.title === tractate || this.getTractateKey(m.title) === key);
        if (masechet) {
            return `${masechet.title} - ${masechet.heTitle}`;
        }
        // Fallback: Add spaces before capital letters and format nicely
        return tractate.replace(/([A-Z])/g, ' $1').trim();
    }
    
    getHebrewTitle(tractate) {
        const key = this.getTractateKey(tractate);
        const masechet = this.masechetData.find(m => m.title === tractate || this.getTractateKey(m.title) === key);
        return masechet ? masechet.heTitle : tractate;
    }
    
    formatTractateForAPI(tractate) {
        const key = this.getTractateKey(tractate);
        // Convert tractate name to Sefaria API format
        // Handle multi-word tractates and spelling variations
        const tractateMap = {
            'BavaBatra': 'Bava_Batra',
            'BavaKamma': 'Bava_Kamma', 
            'BavaMetzia': 'Bava_Metzia',
            'RoshHashana': 'Rosh_Hashanah',
            'MoedKatan': 'Moed_Katan',
            'AvodahZarah': 'Avodah_Zarah',
            'Chulin': 'Chullin',
            'Kiddishin': 'Kiddushin',
        };
        
        return tractateMap[key] || tractateMap[tractate] || key;
    }
    
    bindEvents() {
        // Dropdown events
        this.tractateSelect.addEventListener('change', (e) => {
            const tractate = (e && e.target) ? e.target.value : this.tractateSelect.value;
            if (tractate) {
                // Automatically selects page 2 (or first available daf)
                this.selectTractate(tractate, null, true);
            } else {
                this.resetToInitialState();
                this.updateURL('');
            }
        });
        
        this.dafSelect.addEventListener('change', (e) => {
            const daf = (e && e.target) ? e.target.value : this.dafSelect.value;
            if (daf && this.currentTractate) {
                this.selectDaf(daf, true);
            } else {
                this.resetToInitialState();
                this.updateURL('');
            }
        });
        
        // Audio player controls
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        this.prevBtn.addEventListener('click', () => {
            this.skipBackward();
        });
        
        this.nextBtn.addEventListener('click', () => {
            this.skipForward();
        });
        
        // Audio events
        this.audio.addEventListener('loadstart', () => {
            this.isLoading = true;
            this.showLoading(true);
            this.disablePlayControls(true);
        });
        
        this.audio.addEventListener('canplay', () => {
            this.isLoading = false;
            this.showLoading(false);
            this.disablePlayControls(false);
        });
        
        this.audio.addEventListener('error', () => {
            this.isLoading = false;
            this.showLoading(false);
            this.disablePlayControls(true);
            
            // Only show error if we actually tried to load something
            if (this.currentTractate && this.currentDaf) {
                this.showError('Error loading audio file. Please try another daf.');
            }
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
            this.saveLastPlayed();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
        
        this.audio.addEventListener('ended', () => {
            this.playNextDaf();
        });

        // Browser navigation (back/forward)
        window.addEventListener('popstate', () => {
            const route = this.getRouteFromURL();
            if (route.tractate) {
                if (route.tractate !== this.currentTractate || route.daf !== this.currentDaf) {
                    this.selectTractate(route.tractate, route.daf, false);
                }
            } else {
                this.resetToInitialState();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'SELECT') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    this.skipBackward();
                    break;
                case 'ArrowRight':
                    this.skipForward();
                    break;
            }
        });
        
        // Language toggle buttons
        if (this.hebrewBtn) {
            this.hebrewBtn.addEventListener('click', () => {
                this.switchLanguage('he');
            });
        }
        
        if (this.englishBtn) {
            this.englishBtn.addEventListener('click', () => {
                this.switchLanguage('en');
            });
        }
    }
    
    loadAudio() {
        if (!this.currentTractate || !this.currentDaf) return;
        
        // Disable controls and show loading
        this.disablePlayControls(true);
        this.showLoading(true);

        const tractateKey = this.getTractateKey(this.currentTractate);
        const lowerTractate = tractateKey.toLowerCase();
        
        const localAudioPath = `content/${tractateKey}/${tractateKey}${this.currentDaf}.mp3`;
        const archiveAudioPath = `https://archive.org/download/dafyomi-audio-${lowerTractate}/${tractateKey}${this.currentDaf}.mp3`;
        const gcsAudioPath = `https://storage.googleapis.com/dafyomi-audio/content/${tractateKey}/${tractateKey}${this.currentDaf}.mp3`;

        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // In local development, check local files first
        // In production (GitHub Pages / custom domain), check Archive.org first
        const sources = isLocalHost
            ? [localAudioPath, archiveAudioPath, gcsAudioPath]
            : [archiveAudioPath, localAudioPath, gcsAudioPath];

        this.tryLoadFromSources(sources, 0);
    }

    tryLoadFromSources(sources, index) {
        if (index >= sources.length) {
            this.handleAudioLoadError();
            return;
        }

        const audioPath = sources[index];
        this.tryLoadAudio(audioPath, () => {
            this.tryLoadFromSources(sources, index + 1);
        });
    }
    
    tryLoadAudio(audioPath, onError) {
        // Create a temporary audio element to test if the file exists
        const testAudio = new Audio();
        let settled = false;
        let timer = null;

        const cleanup = () => {
            if (timer) clearTimeout(timer);
            testAudio.removeEventListener('canplay', onReady);
            testAudio.removeEventListener('loadedmetadata', onReady);
            testAudio.removeEventListener('error', onFail);
        };

        const onReady = () => {
            if (settled) return;
            settled = true;
            cleanup();
            // File exists and metadata received, use it in the main player
            this.audio.src = audioPath;
            this.audio.load();
        };

        const onFail = () => {
            if (settled) return;
            settled = true;
            cleanup();
            onError();
        };

        testAudio.addEventListener('canplay', onReady, { once: true });
        testAudio.addEventListener('loadedmetadata', onReady, { once: true });
        testAudio.addEventListener('error', onFail, { once: true });

        // Safety timeout in case browser pauses unattached audio
        timer = setTimeout(() => {
            if (!settled) {
                // If it's taking too long, attempt to set directly on this.audio if it's the primary source
                onReady();
            }
        }, 5000);

        testAudio.preload = 'metadata';
        testAudio.src = audioPath;
        testAudio.load();
    }
    
    handleAudioLoadError() {
        // Check if we have URLs in data.json as final fallback
        const tractateKey = this.getTractateKey(this.currentTractate);
        const tractateData = this.audioData[tractateKey] || this.audioData[this.currentTractate];
        let fallbackPath = null;
        
        if (tractateData && tractateData.urls && tractateData.urls[this.currentDaf]) {
            fallbackPath = tractateData.urls[this.currentDaf];
        }
        
        if (fallbackPath) {
            // Try the URL from data.json
            this.audio.src = fallbackPath;
            this.audio.load();
        } else {
            // No audio file found anywhere
            this.isLoading = false;
            this.showLoading(false);
            this.disablePlayControls(true);
            
            const tractateName = this.formatTractateName(this.currentTractate);
            this.showError(`ההקלטה עבור ${tractateName} דף ${this.convertToGematria(this.currentDaf)} אינה זמינה כרגע`);
            console.error(`Audio file not found for ${this.currentTractate} ${this.currentDaf}`);
        }
    }
    
    togglePlayPause() {
        if (!this.audio.src || this.playPauseBtn.disabled) return;
        
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play().catch(e => {
                console.error('Error playing audio:', e);
                this.showError('Error playing audio. Please try again.');
            });
        }
    }
    
    skipBackward() {
        if (!this.audio.src || this.prevBtn.disabled) return;
        
        const newTime = Math.max(0, this.audio.currentTime - 15);
        this.audio.currentTime = newTime;
    }
    
    skipForward() {
        if (!this.audio.src || this.nextBtn.disabled) return;
        
        const newTime = Math.min(this.audio.duration || 0, this.audio.currentTime + 15);
        this.audio.currentTime = newTime;
    }
    
    playNextDaf() {
        if (!this.currentTractate || !this.currentDaf) return;
        
        const key = this.getTractateKey(this.currentTractate);
        const tractateData = this.audioData[key] || this.audioData[this.currentTractate];
        if (!tractateData) return;

        const dafs = Array.isArray(tractateData) ? tractateData : tractateData.dafs || [];
        const currentIndex = dafs.indexOf(this.currentDaf);
        
        if (currentIndex < dafs.length - 1) {
            const nextDaf = dafs[currentIndex + 1];
            this.selectDaf(nextDaf, true);
            this.audio.play().catch(e => {
                console.warn('Auto-playback prevented by browser policy:', e);
            });
        }
    }
    
    updatePlayPauseButton() {
        const icon = this.playPauseBtn.querySelector('i');
        icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
    
    setInitialState() {
        // Set initial disabled state
        this.disablePlayControls(true);
        
        // Reset text section
        if (this.textContent) this.textContent.innerHTML = '<p class="text-placeholder">Select a Masechet and Daf to view the text</p>';
        if (this.textLoading) this.textLoading.style.display = 'none';
        
        // Reset state, page title, and header study badge
        this.currentTractate = '';
        this.currentDaf = '';
        if (this.tractateSelect) this.tractateSelect.value = '';
        if (this.dafSelect) {
            this.dafSelect.innerHTML = '<option value="">דף</option>';
            this.dafSelect.disabled = true;
        }
        this.updatePageTitle();
        this.updateHeaderStudyDisplay();
        
        // Clear audio
        this.audio.src = '';
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }
    
    resetToInitialState() {
        // Stop any current playback
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
        }
        
        // Clear current audio
        this.audio.src = '';
        
        // Reset UI to initial state
        this.setInitialState();
    }
    
    disablePlayControls(disabled) {
        this.playPauseBtn.disabled = disabled;
        this.prevBtn.disabled = disabled;
        this.nextBtn.disabled = disabled;
        
        // Update visual state
        if (disabled) {
            this.playPauseBtn.style.opacity = '0.5';
            this.prevBtn.style.opacity = '0.5';
            this.nextBtn.style.opacity = '0.5';
            this.playPauseBtn.style.cursor = 'not-allowed';
            this.prevBtn.style.cursor = 'not-allowed';
            this.nextBtn.style.cursor = 'not-allowed';
        } else {
            this.playPauseBtn.style.opacity = '1';
            this.prevBtn.style.opacity = '1';
            this.nextBtn.style.opacity = '1';
            this.playPauseBtn.style.cursor = 'pointer';
            this.prevBtn.style.cursor = 'pointer';
            this.nextBtn.style.cursor = 'pointer';
        }
    }
    
    showLoading(show) {
        if (this.loading) this.loading.style.display = show ? 'flex' : 'none';
    }
    
    showError(message) {
        // Simple error handling - could be enhanced with a toast system
        alert(message);
    }
    
    updatePageTitle() {
        if (this.currentTractate && this.currentDaf) {
            const hebrewTitle = this.getHebrewTitle(this.currentTractate);
            const gematriaTitle = this.convertToGematria(this.currentDaf);
            // Set page title to Hebrew: "מסכת [Hebrew Title] דף [Gematria]"
            document.title = `מסכת ${hebrewTitle} דף ${gematriaTitle}`;
        } else {
            // Reset to original title if no selection
            document.title = 'Daf Yomi by R. Darren Platzky - Mevaser Zion Tel Mond';
        }
    }
    
    async getTalmudPage(tractate, page, language = 'he') {
        // Convert tractate name to API format (e.g., BavaBatra -> Bava_Batra)
        const apiTractate = this.formatTractateForAPI(tractate);
        const ref = `${apiTractate}.${page}`;
        let url = `https://www.sefaria.org/api/v3/texts/${ref}`;
        
        // For English, we need to specify the version parameter
        if (language === 'en') {
            url += '?version=english';
        }
        
        console.log('Original tractate:', tractate);
        console.log('API tractate:', apiTractate);
        console.log('Fetching from URL:', url);
        
        try {
            const response = await fetch(url);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Raw API response:', data);
            return data;
        } catch (error) {
            console.error('Error fetching Talmud text:', error);
            throw error;
        }
    }
    
    async loadTalmudText() {
        if (!this.currentTractate || !this.currentDaf) {
            console.log('Missing tractate or daf:', this.currentTractate, this.currentDaf);
            return;
        }
        
        console.log('Loading Talmud text for:', this.currentTractate, this.currentDaf, 'Language:', this.currentLanguage);
        
        // Show loading state
        if (this.textLoading) this.textLoading.style.display = 'flex';
        if (this.textContent) this.textContent.innerHTML = '<p class="text-placeholder">Loading text from Sefaria...</p>';
        
        try {
            const data = await this.getTalmudPage(this.currentTractate, this.currentDaf, this.currentLanguage);
            console.log('Received data for current selection:', data);
            
            this.displayTalmudText(data);
        } catch (error) {
            console.error('Error loading Talmud text:', error);
            if (this.textContent) {
                this.textContent.innerHTML = `<p class="text-placeholder">Error loading text: ${error.message}. Check console for details.</p>`;
            }
        } finally {
            // Hide loading state
            if (this.textLoading) this.textLoading.style.display = 'none';
        }
    }
    
    displayTalmudText(data) {
        if (!data || !this.textContent) return;
        
        console.log('Displaying text data for language:', this.currentLanguage);
        console.log('Full data structure:', data);
        
        // Clear content
        this.textContent.innerHTML = '';
        
        // Get text from the response structure
        let textToDisplay = null;
        
        // For English version requests, the text is often directly in the text property
        if (data.text) {
            textToDisplay = data.text;
            console.log('Found text in direct property:', textToDisplay);
        }
        // Fallback: check versions array
        else if (data.versions && data.versions.length > 0) {
            // Find version based on current language
            let targetVersion;
            if (this.currentLanguage === 'he') {
                targetVersion = data.versions.find(v => v.language === 'he' && v.isPrimary);
            } else {
                targetVersion = data.versions.find(v => v.language === 'en');
            }
            
            if (targetVersion && targetVersion.text) {
                textToDisplay = targetVersion.text;
                console.log(`Found ${this.currentLanguage} text in versions:`, textToDisplay);
            }
        }
        
        // Display text segments
        if (textToDisplay) {
            // Set text direction based on language
            const direction = this.currentLanguage === 'he' ? 'rtl' : 'ltr';
            this.textContent.setAttribute('dir', direction);
            
            if (Array.isArray(textToDisplay)) {
                textToDisplay.forEach((segment, index) => {
                    if (Array.isArray(segment)) {
                        // Handle nested arrays (each segment might be an array of lines)
                        segment.forEach((line, lineIndex) => {
                            if (line && line.trim()) {
                                const segmentDiv = document.createElement('div');
                                segmentDiv.className = 'text-segment';
                                segmentDiv.setAttribute('dir', direction);
                                segmentDiv.innerHTML = line;
                                this.textContent.appendChild(segmentDiv);
                            }
                        });
                    } else if (segment && segment.trim()) {
                        const segmentDiv = document.createElement('div');
                        segmentDiv.className = 'text-segment';
                        segmentDiv.setAttribute('dir', direction);
                        segmentDiv.innerHTML = segment;
                        this.textContent.appendChild(segmentDiv);
                    }
                });
            } else if (typeof textToDisplay === 'string') {
                const segmentDiv = document.createElement('div');
                segmentDiv.className = 'text-segment';
                segmentDiv.setAttribute('dir', direction);
                segmentDiv.innerHTML = textToDisplay;
                this.textContent.appendChild(segmentDiv);
            }
        }
        
        // If no text found
        if (this.textContent.children.length === 0) {
            const languageName = this.currentLanguage === 'he' ? 'Hebrew' : 'English';
            this.textContent.innerHTML = `<p class="text-placeholder">No ${languageName} text available for this daf.</p>`;
            console.log(`No ${languageName} text could be extracted from:`, data);
        } else {
            console.log('Successfully displayed', this.textContent.children.length, 'text segments in', this.currentLanguage);
            
            // Add attribution with Sefaria logo and version notes
            this.addTextAttribution(data);
        }
    }
    
    addTextAttribution(data) {
        if (!data || !this.textContent) return;
        
        // Remove any existing attribution
        const existingAttribution = this.textContent.querySelector('.text-attribution');
        if (existingAttribution) {
            existingAttribution.remove();
        }
        
        // Find the appropriate version for attribution
        let versionNotes = '';
        if (data.versions && data.versions.length > 0) {
            let targetVersion;
            if (this.currentLanguage === 'he') {
                targetVersion = data.versions.find(v => v.language === 'he' && v.isPrimary);
            } else {
                targetVersion = data.versions.find(v => v.language === 'en');
            }
            
            if (targetVersion && targetVersion.versionNotes) {
                versionNotes = targetVersion.versionNotes;
            }
        }
        
        // Fallback to default text if no version notes found
        if (!versionNotes) {
            versionNotes = this.currentLanguage === 'he' 
                ? 'Hebrew text from Sefaria.org'
                : 'English from The William Davidson digital edition of the <a href="https://korenpub.com/collections/the-noe-edition-koren-talmud-bavli-1">Koren Noé Talmud</a>, with commentary by <a href="/adin-even-israel-steinsaltz">Rabbi Adin Even-Israel Steinsaltz</a>';
        }
        
        // Create attribution element
        const attributionDiv = document.createElement('div');
        attributionDiv.className = 'text-attribution';
        
        // Add Sefaria logo
        const logo = document.createElement('img');
        logo.src = 'sefaria.png';
        logo.alt = 'Sefaria';
        
        // Add version notes text
        const textSpan = document.createElement('span');
        textSpan.innerHTML = versionNotes;
        
        attributionDiv.appendChild(logo);
        attributionDiv.appendChild(textSpan);
        
        // Append to text content
        this.textContent.appendChild(attributionDiv);
    }
    
    switchLanguage(language) {
        if (this.currentLanguage === language) return;
        
        this.currentLanguage = language;
        
        // Update button states
        if (this.hebrewBtn && this.englishBtn) {
            this.hebrewBtn.classList.toggle('active', language === 'he');
            this.englishBtn.classList.toggle('active', language === 'en');
        }
        
        // Reload text in the new language from the API
        if (this.currentTractate && this.currentDaf) {
            this.loadTalmudText();
        }
    }
}

// Initialize the player when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DafYomiPlayer();
});

// Service Worker registration for better caching (optional)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
