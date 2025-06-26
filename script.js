class DafYomiPlayer {
    constructor() {
        this.audioData = {};
        this.masechetData = []; // Store masechet data frhis.currentTractate = '';
        this.currentDaf = '';
        this.currentLanguage = 'he'; // Default to Hebrew
        this.currentTextData = null; // Store the current text data
        this.audio = document.getElementById('audio-player');
        this.isPlaying = false;
        this.isLoading = false;
        
        this.initializeElements();
        this.loadData(); // Changed from loadAudioData to loadData
        this.bindEvents();
        
        // Initially disable play controls and show initial state
        this.setInitialState();
    }
    
    initializeElements() {
        this.tractateSelect = document.getElementById('tractate-select');
        this.dafSelect = document.getElementById('daf-select');
        this.loadBtn = document.getElementById('load-btn'); // May not exist
        this.audioSection = document.getElementById('audio-section');
        this.currentTrack = document.getElementById('current-track'); // May not exist
        this.currentInfo = document.getElementById('current-info'); // May not exist
        this.currentDafText = document.getElementById('current-daf-text'); // New element for header text
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.currentTime = document.getElementById('current-time'); // May not exist
        this.duration = document.getElementById('duration'); // May not exist
        this.progress = document.getElementById('progress'); // May not exist
        this.progressBar = document.querySelector('.progress-bar'); // May not exist
        this.loading = document.getElementById('loading');
        this.nowPlaying = document.querySelector('.now-playing'); // May not exist
        
        // Text section elements
        this.textSection = document.getElementById('text-section');
        this.textTitle = document.getElementById('text-title');
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
        this.dafSelect.innerHTML = '<option value="">Daf...</option>';
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
                // Update header text to show tractate selection with Hebrew
                if (this.currentDafText) {
                    const hebrewTitle = this.getHebrewTitle(tractate);
                    this.currentDafText.textContent = `Masechet ${tractate} - ${hebrewTitle} selected - Choose a Daf`;
                }
            } else {
                this.dafSelect.innerHTML = '<option value="">Select Daf...</option>';
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
                // Stop current playback if playing
                if (this.isPlaying) {
                    this.audio.pause();
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                }
                // Update header text immediately when daf is selected
                this.updateCurrentDafText();
                // Automatically load audio when daf is selected
                this.loadAudio();
                // Load Talmud text when daf is selected
                this.loadTalmudText();
            } else {
                // Reset to initial state when no daf selected
                this.resetToInitialState();
            }
        });
        
        // Load button (optional - only bind if it exists)
        if (this.loadBtn) {
            this.loadBtn.addEventListener('click', () => {
                this.loadAudio();
            });
        }
        
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
            // Update UI when audio is ready (only if elements exist)
            if (this.nowPlaying) this.nowPlaying.classList.remove('hidden');
            if (this.currentTrack) this.currentTrack.textContent = `${this.formatTractateName(this.currentTractate)} - Daf ${this.currentDaf}`;
            if (this.currentInfo) this.currentInfo.textContent = `Ready to play from ${this.formatTractateName(this.currentTractate)}`;
        });
        
        this.audio.addEventListener('error', () => {
            this.isLoading = false;
            this.showLoading(false);
            this.disablePlayControls(true);
            
            // Only show error if we actually tried to load something
            if (this.currentTractate && this.currentDaf) {
                if (this.nowPlaying) this.nowPlaying.classList.remove('hidden');
                if (this.currentTrack) this.currentTrack.textContent = 'Error loading audio';
                if (this.currentInfo) this.currentInfo.textContent = 'Please try selecting another daf';
                this.showError('Error loading audio file. Please try another daf.');
            }
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });
        
        this.audio.addEventListener('ended', () => {
            this.playNextDaf();
        });
        
        // Progress bar click (only if progress bar exists)
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => {
                if (this.audio.duration) {
                    const rect = this.progressBar.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = clickX / rect.width;
                    this.audio.currentTime = percentage * this.audio.duration;
                }
            });
        }
        
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
        
        // Get audio URL - check if we have GCS URLs or use local path
        let audioPath;
        const tractateData = this.audioData[this.currentTractate];
        
        if (tractateData && tractateData.urls && tractateData.urls[this.currentDaf]) {
            // Use GCS URL
            audioPath = tractateData.urls[this.currentDaf];
        } else {
            // Fallback to local path
            audioPath = `content/${this.currentTractate}/${this.currentTractate}${this.currentDaf}.mp3`;
        }
        
        // Show now-playing section and loading state (only if elements exist)
        if (this.nowPlaying) this.nowPlaying.classList.remove('hidden');
        if (this.currentTrack) this.currentTrack.textContent = `Loading ${this.formatTractateName(this.currentTractate)} - Daf ${this.currentDaf}...`;
        if (this.currentInfo) this.currentInfo.textContent = 'Preparing audio...';
        
        // Disable controls while loading
        this.disablePlayControls(true);
        
        this.audio.src = audioPath;
        this.audio.load();
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
        
        const tractateData = this.audioData[this.currentTractate];
        const dafs = Array.isArray(tractateData) ? tractateData : tractateData.dafs || [];
        const currentIndex = dafs.indexOf(this.currentDaf);
        
        if (currentIndex < dafs.length - 1) {
            const nextDaf = dafs[currentIndex + 1];
            this.currentDaf = nextDaf;
            this.dafSelect.value = nextDaf;
            this.loadAudio();
        }
    }
    
    updatePlayPauseButton() {
        const icon = this.playPauseBtn.querySelector('i');
        icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
    
    updateProgress() {
        if (this.audio.duration) {
            const percentage = (this.audio.currentTime / this.audio.duration) * 100;
            if (this.progress) this.progress.style.width = `${percentage}%`;
            
            if (this.currentTime) this.currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }
    
    updateDuration() {
        if (this.duration) this.duration.textContent = this.formatTime(this.audio.duration);
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    setInitialState() {
        // Always show the audio section
        if (this.audioSection) this.audioSection.style.display = 'block';
        
        // Set initial disabled state
        this.disablePlayControls(true);
        
        // Clear text and hide now-playing section when no audio is selected (only if elements exist)
        if (this.currentTrack) this.currentTrack.textContent = '';
        if (this.currentInfo) this.currentInfo.textContent = '';
        if (this.nowPlaying) this.nowPlaying.classList.add('hidden');
        
        // Reset header text to initial state
        if (this.currentDafText) this.currentDafText.textContent = 'Select a Masechet and Daf to begin learning';
        
        // Reset text section
        if (this.textTitle) this.textTitle.textContent = 'Talmud Text';
        if (this.textContent) this.textContent.innerHTML = '<p class="text-placeholder">Select a Masechet and Daf to view the text</p>';
        if (this.textLoading) this.textLoading.style.display = 'none';
        
        // Reset page title
        this.updatePageTitle();
        
        // Clear audio
        this.audio.src = '';
        this.isPlaying = false;
        this.updatePlayPauseButton();
        
        // Reset progress (only if elements exist)
        if (this.progress) this.progress.style.width = '0%';
        if (this.currentTime) this.currentTime.textContent = '0:00';
        if (this.duration) this.duration.textContent = '0:00';
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
    
    updateCurrentDafText() {
        if (this.currentDafText && this.currentTractate && this.currentDaf) {
            const hebrewTitle = this.getHebrewTitle(this.currentTractate);
            this.currentDafText.textContent = `Now learning: ${this.currentTractate} - ${hebrewTitle} - Daf ${this.currentDaf}`;
        }
        // Update page title whenever daf text is updated
        this.updatePageTitle();
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
        if (this.textTitle) this.textTitle.textContent = 'Loading Talmud Text...';
        if (this.textContent) this.textContent.innerHTML = '<p class="text-placeholder">Loading text from Sefaria...</p>';
        
        try {
            const data = await this.getTalmudPage(this.currentTractate, this.currentDaf, this.currentLanguage);
            console.log('Received data for current selection:', data);
            
            // Store the data for language switching
            this.currentTextData = data;
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
        
        // Update title
        if (this.textTitle) {
            const tractateFormatted = this.formatTractateName(this.currentTractate);
            this.textTitle.textContent = `${tractateFormatted} ${this.currentDaf}`;
        }
        
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
    
    // Test function to debug Sefaria API
    async testSefariaAPI() {
        console.log('Testing Sefaria API...');
        
        // Test with a known tractate and page
        try {
            console.log('Fetching Berakhot 2a...');
            const testData = await this.getTalmudPage('Berakhot', '2a');
            console.log('Sefaria API Response:', testData);
            
            if (testData) {
                console.log('Response structure:');
                console.log('- Has versions:', !!testData.versions);
                console.log('- Versions count:', testData.versions ? testData.versions.length : 0);
                console.log('- Has direct text:', !!testData.text);
                
                if (testData.versions && testData.versions.length > 0) {
                    testData.versions.forEach((version, index) => {
                        console.log(`Version ${index}:`, {
                            language: version.language,
                            title: version.versionTitle,
                            isPrimary: version.isPrimary,
                            hasText: !!version.text
                        });
                    });
                    
                    // Show Hebrew version text structure
                    const hebrewVersion = testData.versions.find(v => v.language === 'he' && v.isPrimary);
                    if (hebrewVersion && hebrewVersion.text) {
                        console.log('Hebrew text structure:');
                        console.log('- Is array:', Array.isArray(hebrewVersion.text));
                        console.log('- Length:', hebrewVersion.text.length);
                        console.log('- First element type:', typeof hebrewVersion.text[0]);
                        console.log('- First element is array:', Array.isArray(hebrewVersion.text[0]));
                        if (hebrewVersion.text[0]) {
                            console.log('- First few characters:', hebrewVersion.text[0].toString().substring(0, 100));
                        }
                    }
                }
            } else {
                console.log('No response data received');
            }
        } catch (error) {
            console.error('Sefaria API test failed:', error);
        }
        
        // Test the mapping between our tractate names and Sefaria names
        console.log('Current tractate:', this.currentTractate);
        console.log('Current daf:', this.currentDaf);
        
        // Test URL construction
        if (this.currentTractate && this.currentDaf) {
            const ref = `${this.currentTractate}.${this.currentDaf}`;
            const url = `https://www.sefaria.org/api/v3/texts/${ref}`;
            console.log('Constructed URL:', url);
        }
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
if ('serviceWorker' in navigator) {
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
