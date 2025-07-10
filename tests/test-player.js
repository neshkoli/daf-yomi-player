/**
 * Test suite for Daf Yomi Player
 * Tests core functionality including data loading, UI interactions, and audio controls
 */

// Mock DOM elements for testing
const mockElements = {
    'tractate-select': { 
        value: '', 
        addEventListener: jest.fn(), 
        appendChild: jest.fn(), 
        innerHTML: '', 
        disabled: false,
        classList: { add: jest.fn(), remove: jest.fn() }
    },
    'daf-select': { 
        value: '', 
        addEventListener: jest.fn(), 
        appendChild: jest.fn(), 
        innerHTML: '', 
        disabled: true,
        classList: { add: jest.fn(), remove: jest.fn() }
    },
    'play-pause-btn': { 
        addEventListener: jest.fn(), 
        innerHTML: '<i class="fas fa-play"></i>',
        disabled: false,
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelector: jest.fn(() => ({ className: 'fas fa-play' }))
    },
    'prev-btn': { 
        addEventListener: jest.fn(),
        disabled: false,
        classList: { add: jest.fn(), remove: jest.fn() }
    },
    'next-btn': { 
        addEventListener: jest.fn(),
        disabled: false,
        classList: { add: jest.fn(), remove: jest.fn() }
    },
    'loading': { 
        style: { display: 'none' } 
    },
    'text-section': { 
        style: { display: 'block' } 
    },
    'text-loading': { 
        style: { display: 'none' } 
    },
    'text-content': { 
        innerHTML: '', 
        style: { display: 'block' },
        appendChild: jest.fn()
    },
    'hebrew-btn': { 
        addEventListener: jest.fn(), 
        classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() } 
    },
    'english-btn': { 
        addEventListener: jest.fn(), 
        classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() } 
    },
    'audio-player': {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        pause: jest.fn(),
        play: jest.fn(),
        load: jest.fn(),
        currentTime: 0,
        duration: 0,
        src: '',
        paused: true,
        volume: 1,
        muted: false
    }
};

// Mock fetch for testing
global.fetch = jest.fn();

// Mock document.getElementById
global.document = {
    getElementById: jest.fn((id) => mockElements[id] || {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        innerHTML: '',
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() }
    }),
    createElement: jest.fn((tagName) => ({
        tagName: tagName.toUpperCase(),
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: {},
        innerHTML: '',
        textContent: '',
        value: '',
        disabled: false,
        src: '',
        currentTime: 0,
        duration: 0,
        paused: true,
        play: jest.fn(),
        pause: jest.fn(),
        load: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn()
    }))
};

// Mock console methods
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock document.title
Object.defineProperty(global.document, 'title', {
    writable: true,
    value: 'Daf Yomi Player'
});

// Import the player class (we'll need to extract it from script.js)
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
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }
    
    populateTractateDropdown() {
        // Sort masechet data by order
        this.masechetData.sort((a, b) => a.order - b.order);
        
        // Filter to only show tractates that have available audio content
        const availableTractates = this.masechetData.filter(masechet => {
            // Check if this tractate exists in audioData and has content
            const tractateData = this.audioData[masechet.title];
            if (!tractateData) return false;
            
            // Handle both old format (array) and new format (object with dafs array)
            const dafs = Array.isArray(tractateData) ? tractateData : tractateData.dafs || [];
            return dafs.length > 0;
        });
        
        availableTractates.forEach(masechet => {
            const option = document.createElement('option');
            option.value = masechet.title;
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
        const tractateData = this.audioData[tractate];
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
        // Find the Hebrew title for this tractate
        const masechet = this.masechetData.find(m => m.title === tractate);
        if (masechet) {
            return `${masechet.title} - ${masechet.heTitle}`;
        }
        // Fallback: Add spaces before capital letters and format nicely
        return tractate.replace(/([A-Z])/g, ' $1').trim();
    }
    
    getHebrewTitle(tractate) {
        const masechet = this.masechetData.find(m => m.title === tractate);
        return masechet ? masechet.heTitle : tractate;
    }
    
    formatTractateForAPI(tractate) {
        // Convert tractate name to Sefaria API format
        // Handle multi-word tractates and spelling variations
        const tractateMap = {
            'BavaBatra': 'Bava_Batra',
            'BavaKamma': 'Bava_Kamma', 
            'BavaMetzia': 'Bava_Metzia',
            'Kiddishin': 'Kiddushin',  // Handle spelling variation
            // Add other mappings as needed
        };
        
        return tractateMap[tractate] || tractate;
    }
    
    bindEvents() {
        // Dropdown events
        this.tractateSelect.addEventListener('change', (e) => {
            const tractate = e.target.value;
            if (tractate) {
                this.populateDafDropdown(tractate);
                this.currentTractate = tractate;
            } else {
                this.dafSelect.innerHTML = '<option value="">דף</option>';
                this.dafSelect.disabled = true;
                // Stop playback and reset to initial state
                if (this.isPlaying) {
                    this.audio.pause();
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                }
                this.resetToInitialState();
            }
            this.currentDaf = '';
        });
        
        this.dafSelect.addEventListener('change', (e) => {
            this.currentDaf = e.target.value;
            if (this.currentDaf && this.currentTractate) {
                this.loadAudio();
                this.loadTalmudText();
            }
        });
        
        // Audio controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.skipBackward());
        this.nextBtn.addEventListener('click', () => this.skipForward());
        
        // Language toggle
        this.hebrewBtn.addEventListener('click', () => this.switchLanguage('he'));
        this.englishBtn.addEventListener('click', () => this.switchLanguage('en'));
        
        // Audio events
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
    }
    
    loadAudio() {
        if (!this.currentTractate || !this.currentDaf) return;
        
        const audioPath = `content/${this.currentTractate}/${this.currentTractate}${this.currentDaf}.mp3`;
        
        this.showLoading(true);
        this.disablePlayControls(true);
        
        this.tryLoadAudio(audioPath, () => {
            this.handleAudioLoadError();
        });
    }
    
    tryLoadAudio(audioPath, onError) {
        this.audio.src = audioPath;
        this.audio.load();
        
        const timeout = setTimeout(() => {
            onError();
        }, 10000); // 10 second timeout
        
        this.audio.addEventListener('canplaythrough', () => {
            clearTimeout(timeout);
            this.showLoading(false);
            this.disablePlayControls(false);
            this.updatePageTitle();
        }, { once: true });
        
        this.audio.addEventListener('error', () => {
            clearTimeout(timeout);
            onError();
        }, { once: true });
    }
    
    handleAudioLoadError() {
        this.showLoading(false);
        this.disablePlayControls(true);
        this.showError(`Failed to load audio for ${this.formatTractateName(this.currentTractate)} Daf ${this.currentDaf}`);
    }
    
    togglePlayPause() {
        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    }
    
    skipBackward() {
        this.audio.currentTime = Math.max(0, this.audio.currentTime - 15);
    }
    
    skipForward() {
        this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 15);
    }
    
    updatePlayPauseButton() {
        const icon = this.playPauseBtn.querySelector('i');
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
        }
    }
    
    setInitialState() {
        this.textContent.innerHTML = 'Select a Masechet and Daf to view the text';
        this.disablePlayControls(true);
    }
    
    resetToInitialState() {
        this.textContent.innerHTML = 'Select a Masechet and Daf to view the text';
        this.disablePlayControls(true);
        this.updatePageTitle();
    }
    
    disablePlayControls(disabled) {
        this.playPauseBtn.disabled = disabled;
        this.prevBtn.disabled = disabled;
        this.nextBtn.disabled = disabled;
        
        if (disabled) {
            this.playPauseBtn.classList.add('disabled');
            this.prevBtn.classList.add('disabled');
            this.nextBtn.classList.add('disabled');
        } else {
            this.playPauseBtn.classList.remove('disabled');
            this.prevBtn.classList.remove('disabled');
            this.nextBtn.classList.remove('disabled');
        }
    }
    
    showLoading(show) {
        this.loading.style.display = show ? 'flex' : 'none';
    }
    
    showError(message) {
        console.error(message);
        this.textContent.innerHTML = `<div class="error">${message}</div>`;
    }
    
    updatePageTitle() {
        if (this.currentTractate && this.currentDaf) {
            document.title = `${this.formatTractateName(this.currentTractate)} Daf ${this.currentDaf} - Daf Yomi Player`;
        } else {
            document.title = 'Daf Yomi Player';
        }
    }
    
    async getTalmudPage(tractate, page, language = 'he') {
        const apiTractate = this.formatTractateForAPI(tractate);
        const url = `https://www.sefaria.org/api/v2/texts/${apiTractate}.${page}?context=0`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching Talmud text:', error);
            return null;
        }
    }
    
    async loadTalmudText() {
        if (!this.currentTractate || !this.currentDaf) return;
        
        this.textLoading.style.display = 'block';
        
        try {
            const data = await this.getTalmudPage(this.currentTractate, this.currentDaf, this.currentLanguage);
            if (data) {
                this.displayTalmudText(data);
            } else {
                this.textContent.innerHTML = 'Text not available for this daf';
            }
        } catch (error) {
            console.error('Error loading Talmud text:', error);
            this.textContent.innerHTML = 'Error loading text';
        } finally {
            this.textLoading.style.display = 'none';
        }
    }
    
    displayTalmudText(data) {
        if (!data || !data.text) {
            this.textContent.innerHTML = 'Text not available for this daf';
            return;
        }
        
        const text = data.text[this.currentLanguage] || data.text.he || data.text.en || 'Text not available';
        
        this.textContent.innerHTML = `
            <div class="text-content loaded" dir="${this.currentLanguage === 'he' ? 'rtl' : 'ltr'}">
                ${text}
            </div>
        `;
        
        this.addTextAttribution(data);
    }
    
    addTextAttribution(data) {
        const attribution = document.createElement('div');
        attribution.className = 'text-attribution';
        attribution.innerHTML = `
            <img src="sefaria.png" alt="Sefaria" style="height: 20px; margin-right: 8px;">
            <span>Text provided by <a href="https://www.sefaria.org" target="_blank" rel="noopener">Sefaria</a></span>
        `;
        this.textContent.appendChild(attribution);
    }
    
    switchLanguage(language) {
        this.currentLanguage = language;
        
        // Update button states
        this.hebrewBtn.classList.toggle('active', language === 'he');
        this.englishBtn.classList.toggle('active', language === 'en');
        
        // Reload text if we have a current selection
        if (this.currentTractate && this.currentDaf) {
            this.loadTalmudText();
        }
    }
}

// Test data
const mockAudioData = {
    "BavaBatra": ["2", "3", "4", "5"],
    "BavaKamma": ["2", "3", "4", "5", "6"],
    "Berakhot": ["2", "3", "4"]
};

const mockMasechetData = [
    { order: 1, title: "Berakhot", heTitle: "ברכות" },
    { order: 20, title: "BavaKamma", heTitle: "בבא קמא" },
    { order: 22, title: "BavaBatra", heTitle: "בבא בתרא" }
];

describe('Daf Yomi Player', () => {
    let player;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup fetch mock
        fetch.mockImplementation((url) => {
            if (url === 'data.json') {
                return Promise.resolve({
                    json: () => Promise.resolve(mockAudioData)
                });
            } else if (url === 'masechet.json') {
                return Promise.resolve({
                    json: () => Promise.resolve(mockMasechetData)
                });
            }
            return Promise.reject(new Error('Not found'));
        });
        
        // Create player instance
        player = new DafYomiPlayer();
    });
    
    describe('Initialization', () => {
        test('should initialize with default state', () => {
            // The player loads data during initialization, so we need to wait
            // For now, just check the initial state before data loading
            expect(player.currentTractate).toBe('');
            expect(player.currentDaf).toBe('');
            expect(player.currentLanguage).toBe('en');
            expect(player.isPlaying).toBe(false);
            expect(player.isLoading).toBe(false);
        });
        
        test('should load data on initialization', async () => {
            // Wait for async data loading
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(fetch).toHaveBeenCalledWith('data.json');
            expect(fetch).toHaveBeenCalledWith('masechet.json');
        });
    });
    
    describe('Gematria Conversion', () => {
        test('should convert numbers to Hebrew gematria', () => {
            expect(player.convertToGematria(1)).toBe('א');
            expect(player.convertToGematria(10)).toBe('י');
            expect(player.convertToGematria(15)).toBe('טו');
            expect(player.convertToGematria(16)).toBe('טז');
            expect(player.convertToGematria(20)).toBe('כ');
            expect(player.convertToGematria(100)).toBe('ק');
            expect(player.convertToGematria(500)).toBe('תק');
        });
        
        test('should handle edge cases', () => {
            expect(player.convertToGematria(0)).toBe('א');
            expect(player.convertToGematria('')).toBe('א');
        });
    });
    
    describe('Tractate Formatting', () => {
        test('should format tractate names correctly', () => {
            expect(player.formatTractateName('BavaBatra')).toBe('BavaBatra - בבא בתרא');
            expect(player.formatTractateForAPI('BavaBatra')).toBe('Bava_Batra');
            expect(player.getHebrewTitle('BavaBatra')).toBe('בבא בתרא');
        });
        
        test('should handle unknown tractates', () => {
            expect(player.formatTractateName('UnknownTractate')).toBe('Unknown Tractate');
            expect(player.getHebrewTitle('UnknownTractate')).toBe('UnknownTractate');
        });
    });
    
    describe('Data Loading', () => {
        test('should populate tractate dropdown with available content', async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(player.tractateSelect.appendChild).toHaveBeenCalled();
        });
        
        test('should handle data loading errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));
            
            const errorPlayer = new DafYomiPlayer();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(console.error).toHaveBeenCalled();
        });
    });
    
    describe('Audio Controls', () => {
        test('should toggle play/pause', () => {
            player.audio.paused = true;
            player.togglePlayPause();
            expect(player.audio.play).toHaveBeenCalled();
            
            player.audio.paused = false;
            player.togglePlayPause();
            expect(player.audio.pause).toHaveBeenCalled();
        });
        
        test('should skip backward', () => {
            player.audio.currentTime = 30;
            player.skipBackward();
            expect(player.audio.currentTime).toBe(15);
        });
        
        test('should skip forward', () => {
            player.audio.currentTime = 30;
            player.audio.duration = 100;
            player.skipForward();
            expect(player.audio.currentTime).toBe(45);
        });
        
        test('should not skip below 0', () => {
            player.audio.currentTime = 10;
            player.skipBackward();
            expect(player.audio.currentTime).toBe(0);
        });
        
        test('should not skip above duration', () => {
            player.audio.currentTime = 90;
            player.audio.duration = 100;
            player.skipForward();
            expect(player.audio.currentTime).toBe(100);
        });
    });
    
    describe('UI State Management', () => {
        test('should disable play controls when appropriate', () => {
            player.disablePlayControls(true);
            expect(player.playPauseBtn.disabled).toBe(true);
            expect(player.prevBtn.disabled).toBe(true);
            expect(player.nextBtn.disabled).toBe(true);
            
            player.disablePlayControls(false);
            expect(player.playPauseBtn.disabled).toBe(false);
            expect(player.prevBtn.disabled).toBe(false);
            expect(player.nextBtn.disabled).toBe(false);
        });
        
        test('should show/hide loading state', () => {
            player.showLoading(true);
            expect(player.loading.style.display).toBe('flex');
            
            player.showLoading(false);
            expect(player.loading.style.display).toBe('none');
        });
        
        test('should update page title', () => {
            player.currentTractate = 'BavaBatra';
            player.currentDaf = '15';
            player.updatePageTitle();
            expect(document.title).toContain('BavaBatra');
            expect(document.title).toContain('Daf 15');
        });
    });
    
    describe('Language Switching', () => {
        test('should switch language correctly', () => {
            player.switchLanguage('he');
            expect(player.currentLanguage).toBe('he');
            expect(player.hebrewBtn.classList.add).toHaveBeenCalledWith('active');
            expect(player.englishBtn.classList.remove).toHaveBeenCalledWith('active');
            
            player.switchLanguage('en');
            expect(player.currentLanguage).toBe('en');
            expect(player.englishBtn.classList.add).toHaveBeenCalledWith('active');
            expect(player.hebrewBtn.classList.remove).toHaveBeenCalledWith('active');
        });
    });
    
    describe('Error Handling', () => {
        test('should show error messages', () => {
            player.showError('Test error message');
            expect(player.textContent.innerHTML).toContain('Test error message');
        });
        
        test('should handle audio load errors', () => {
            player.currentTractate = 'BavaBatra';
            player.currentDaf = '15';
            player.handleAudioLoadError();
            
            expect(player.textContent.innerHTML).toContain('Failed to load audio');
        });
    });
    
    describe('Text Loading', () => {
        test('should format API tractate names correctly', () => {
            expect(player.formatTractateForAPI('BavaBatra')).toBe('Bava_Batra');
            expect(player.formatTractateForAPI('BavaKamma')).toBe('Bava_Kamma');
            expect(player.formatTractateForAPI('Unknown')).toBe('Unknown');
        });
        
        test('should handle text loading errors', async () => {
            fetch.mockRejectedValueOnce(new Error('API error'));
            
            player.currentTractate = 'BavaBatra';
            player.currentDaf = '15';
            
            await player.loadTalmudText();
            
            expect(player.textContent.innerHTML).toContain('Text not available for this daf');
        });
    });
});

// Integration tests
describe('Integration Tests', () => {
    test('should handle complete workflow', async () => {
        const player = new DafYomiPlayer();
        
        // Wait for data loading
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Simulate tractate selection
        player.currentTractate = 'BavaBatra';
        player.populateDafDropdown('BavaBatra');
        
        expect(player.dafSelect.disabled).toBe(false);
        expect(player.dafSelect.appendChild).toHaveBeenCalled();
        
        // Simulate daf selection
        player.currentDaf = '15';
        player.loadAudio();
        
        expect(player.audio.src).toContain('content/BavaBatra/BavaBatra15.mp3');
    });
}); 