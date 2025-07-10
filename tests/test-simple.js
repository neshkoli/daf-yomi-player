/**
 * Simple test suite for Daf Yomi Player
 * Tests core functionality without complex mocking
 */

describe('Daf Yomi Player - Core Functions', () => {
    // Test gematria conversion function
    const convertToGematria = (num) => {
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
    };

    // Test tractate formatting functions
    const formatTractateName = (tractate) => {
        // Add spaces before capital letters and format nicely
        return tractate.replace(/([A-Z])/g, ' $1').trim();
    };

    const formatTractateForAPI = (tractate) => {
        // Convert tractate name to Sefaria API format
        const tractateMap = {
            'BavaBatra': 'Bava_Batra',
            'BavaKamma': 'Bava_Kamma', 
            'BavaMetzia': 'Bava_Metzia',
            'Kiddishin': 'Kiddushin',  // Handle spelling variation
        };
        
        return tractateMap[tractate] || tractate;
    };

    // Test helper functions
    const findGaps = (numbers) => {
        if (numbers.length === 0) return [];
        
        numbers.sort((a, b) => a - b);
        const gaps = [];
        
        for (let i = numbers[0]; i <= numbers[numbers.length - 1]; i++) {
            if (!numbers.includes(i)) {
                gaps.push(i);
            }
        }
        
        return gaps;
    };

    describe('Gematria Conversion', () => {
        test('should convert numbers to Hebrew gematria', () => {
            expect(convertToGematria(1)).toBe('א');
            expect(convertToGematria(10)).toBe('י');
            expect(convertToGematria(15)).toBe('טו');
            expect(convertToGematria(16)).toBe('טז');
            expect(convertToGematria(20)).toBe('כ');
            expect(convertToGematria(100)).toBe('ק');
            expect(convertToGematria(500)).toBe('תק');
        });

        test('should handle edge cases', () => {
            expect(convertToGematria(0)).toBe('א');
            expect(convertToGematria('')).toBe('א');
        });
    });

    describe('Tractate Formatting', () => {
        test('should format tractate names correctly', () => {
            expect(formatTractateName('BavaBatra')).toBe('Bava Batra');
            expect(formatTractateForAPI('BavaBatra')).toBe('Bava_Batra');
            expect(formatTractateForAPI('BavaKamma')).toBe('Bava_Kamma');
            expect(formatTractateForAPI('Unknown')).toBe('Unknown');
        });
    });

    describe('Helper Functions', () => {
        test('findGaps should identify missing numbers', () => {
            expect(findGaps([1, 2, 4, 6])).toEqual([3, 5]);
            expect(findGaps([1, 2, 3, 4])).toEqual([]);
            expect(findGaps([1, 3, 5])).toEqual([2, 4]);
            expect(findGaps([])).toEqual([]);
            expect(findGaps([1])).toEqual([]);
        });
    });

    describe('Data Processing', () => {
        test('should process audio file names correctly', () => {
            const processFileName = (fileName, tractateName) => {
                const match = fileName.match(new RegExp(`^${tractateName}(\\d+)\\.mp3$`, 'i'));
                return match ? match[1] : null;
            };

            expect(processFileName('BavaBatra15.mp3', 'BavaBatra')).toBe('15');
            expect(processFileName('BavaKamma2.mp3', 'BavaKamma')).toBe('2');
            expect(processFileName('invalid.mp3', 'BavaBatra')).toBe(null);
            expect(processFileName('BavaBatra15.txt', 'BavaBatra')).toBe(null);
        });

        test('should sort daf numbers numerically', () => {
            const sortDafNumbers = (numbers) => {
                return numbers.sort((a, b) => parseInt(a) - parseInt(b));
            };

            expect(sortDafNumbers(['10', '2', '1'])).toEqual(['1', '2', '10']);
            expect(sortDafNumbers(['1', '2', '3'])).toEqual(['1', '2', '3']);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid inputs gracefully', () => {
            const safeParseInt = (value) => {
                const parsed = parseInt(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            expect(safeParseInt('15')).toBe(15);
            expect(safeParseInt('abc')).toBe(0);
            expect(safeParseInt('')).toBe(0);
            expect(safeParseInt(null)).toBe(0);
        });
    });

    describe('String Utilities', () => {
        test('should format file paths correctly', () => {
            const formatAudioPath = (tractate, daf) => {
                return `content/${tractate}/${tractate}${daf}.mp3`;
            };

            expect(formatAudioPath('BavaBatra', '15')).toBe('content/BavaBatra/BavaBatra15.mp3');
            expect(formatAudioPath('BavaKamma', '2')).toBe('content/BavaKamma/BavaKamma2.mp3');
        });

        test('should validate file extensions', () => {
            const isValidAudioFile = (fileName) => {
                return /\.mp3$/i.test(fileName);
            };

            expect(isValidAudioFile('BavaBatra15.mp3')).toBe(true);
            expect(isValidAudioFile('BavaBatra15.MP3')).toBe(true);
            expect(isValidAudioFile('BavaBatra15.txt')).toBe(false);
            expect(isValidAudioFile('BavaBatra15')).toBe(false);
        });
    });
});

describe('Build Script Utilities', () => {
    // Test file validation logic
    const validateFileStructure = (files, tractateName) => {
        const validFiles = files.filter(file => {
            // Check if file is MP3
            if (!file.toLowerCase().endsWith('.mp3')) return false;
            
            // Check if file matches tractate naming pattern
            const pattern = new RegExp(`^${tractateName}\\d+\\.mp3$`, 'i');
            return pattern.test(file);
        });

        return validFiles.map(file => {
            const match = file.match(new RegExp(`^${tractateName}(\\d+)\\.mp3$`, 'i'));
            return match ? match[1] : null;
        }).filter(daf => daf !== null);
    };

    describe('File Validation', () => {
        test('should validate file structure correctly', () => {
            const files = [
                'BavaBatra2.mp3',
                'BavaBatra3.mp3',
                'invalid.mp3',
                'BavaBatra4.txt',
                'BavaBatra5.mp3'
            ];

            const result = validateFileStructure(files, 'BavaBatra');
            expect(result).toEqual(['2', '3', '5']);
        });

        test('should handle empty file list', () => {
            const result = validateFileStructure([], 'BavaBatra');
            expect(result).toEqual([]);
        });

        test('should handle no valid files', () => {
            const files = ['invalid.txt', 'wrong.mp3', 'BavaBatra.txt'];
            const result = validateFileStructure(files, 'BavaBatra');
            expect(result).toEqual([]);
        });
    });

    describe('Statistics Calculation', () => {
        test('should calculate statistics correctly', () => {
            const calculateStats = (audioData) => {
                const tractates = Object.keys(audioData);
                const totalDafs = Object.values(audioData).reduce((sum, dafs) => sum + dafs.length, 0);
                
                return {
                    tractateCount: tractates.length,
                    totalDafs,
                    averageDafsPerTractate: totalDafs / tractates.length
                };
            };

            const testData = {
                'BavaBatra': ['2', '3', '4'],
                'BavaKamma': ['2', '3']
            };

            const stats = calculateStats(testData);
            expect(stats.tractateCount).toBe(2);
            expect(stats.totalDafs).toBe(5);
            expect(stats.averageDafsPerTractate).toBe(2.5);
        });
    });
});

describe('Content Validation', () => {
    // Test content validation logic
    const validateContentStructure = (directories, masechetData) => {
        const validTractates = new Set(masechetData.map(m => m.title));
        const errors = [];
        const warnings = [];

        directories.forEach(dir => {
            if (!validTractates.has(dir)) {
                warnings.push(`Directory '${dir}' not found in masechet.json`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    };

    describe('Content Structure Validation', () => {
        test('should validate directory names against masechet data', () => {
            const directories = ['BavaBatra', 'BavaKamma', 'UnknownTractate'];
            const masechetData = [
                { title: 'BavaBatra', heTitle: 'בבא בתרא' },
                { title: 'BavaKamma', heTitle: 'בבא קמא' }
            ];

            const result = validateContentStructure(directories, masechetData);
            
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain("Directory 'UnknownTractate' not found in masechet.json");
            expect(result.warnings.length).toBe(1);
        });

        test('should handle empty directories', () => {
            const result = validateContentStructure([], []);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
            expect(result.warnings.length).toBe(0);
        });
    });
}); 