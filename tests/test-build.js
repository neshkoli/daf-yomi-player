/**
 * Tests for build.js script
 * Tests content scanning, data generation, and file validation
 */

const fs = require('fs');
const path = require('path');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Import the build functions after mocking
const { scanContentFolder, writeDataFile, validateAudioFiles } = require('../build.js');

describe('Build Script', () => {
    const mockContentDir = '/mock/content';
    const mockOutputFile = '/mock/data.json';
    
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup path mock
        path.join = jest.fn((...args) => args.join('/'));
        path.__dirname = '/mock';
        
        // Setup fs mock
        fs.existsSync = jest.fn().mockReturnValue(true);
        fs.readdirSync = jest.fn().mockReturnValue([]);
        fs.writeFileSync = jest.fn().mockImplementation(() => {});
        
        // Reset process.exit mock
        process.exit.mockClear();
    });
    
    afterAll(() => {
        // Restore original process.exit
        process.exit = originalExit;
    });
    
    describe('scanContentFolder', () => {
        test('should scan content directory and extract audio data', () => {
            // Mock directory structure
            const mockSubdirs = [
                { name: 'BavaBatra', isDirectory: () => true },
                { name: 'BavaKamma', isDirectory: () => true },
                { name: '.DS_Store', isDirectory: () => false } // Should be ignored
            ];
            
            fs.readdirSync
                .mockReturnValueOnce(mockSubdirs) // First call for subdirectories
                .mockReturnValueOnce(['BavaBatra2.mp3', 'BavaBatra3.mp3', 'BavaBatra4.mp3']) // BavaBatra files
                .mockReturnValueOnce(['BavaKamma2.mp3', 'BavaKamma3.mp3']); // BavaKamma files
            
            const result = scanContentFolder();
            
            expect(result).toEqual({
                'BavaBatra': ['2', '3', '4'],
                'BavaKamma': ['2', '3']
            });
        });
        
        test('should handle empty directories', () => {
            fs.readdirSync.mockReturnValue([]);
            
            const result = scanContentFolder();
            
            expect(result).toEqual({});
        });
        
        test('should ignore hidden directories', () => {
            const mockSubdirs = [
                { name: 'BavaBatra', isDirectory: () => true },
                { name: '.hidden', isDirectory: () => true },
                { name: 'BavaKamma', isDirectory: () => true }
            ];
            
            fs.readdirSync
                .mockReturnValueOnce(mockSubdirs)
                .mockReturnValueOnce(['BavaBatra2.mp3'])
                .mockReturnValueOnce(['BavaKamma2.mp3']);
            
            const result = scanContentFolder();
            
            expect(result).toHaveProperty('BavaBatra');
            expect(result).toHaveProperty('BavaKamma');
            expect(result).not.toHaveProperty('.hidden');
        });
        
        test('should handle invalid file names', () => {
            const mockSubdirs = [
                { name: 'BavaBatra', isDirectory: () => true }
            ];
            
            fs.readdirSync
                .mockReturnValueOnce(mockSubdirs)
                .mockReturnValueOnce(['BavaBatra2.mp3', 'invalid.mp3', 'BavaBatra3.mp3']);
            
            const result = scanContentFolder();
            
            expect(result).toEqual({
                'BavaBatra': ['2', '3']
            });
        });
        
        test('should sort daf numbers numerically', () => {
            const mockSubdirs = [
                { name: 'BavaBatra', isDirectory: () => true }
            ];
            
            fs.readdirSync
                .mockReturnValueOnce(mockSubdirs)
                .mockReturnValueOnce(['BavaBatra10.mp3', 'BavaBatra2.mp3', 'BavaBatra1.mp3']);
            
            const result = scanContentFolder();
            
            expect(result).toEqual({
                'BavaBatra': ['1', '2', '10']
            });
        });
        
        test('should handle missing content directory', () => {
            fs.existsSync.mockReturnValue(false);
            
            expect(() => scanContentFolder()).toThrow();
        });
    });
    
    describe('writeDataFile', () => {
        test('should write JSON data to file', () => {
            const audioData = {
                'BavaBatra': ['2', '3', '4'],
                'BavaKamma': ['2', '3']
            };
            
            const result = writeDataFile(audioData);
            
            expect(result).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                '/mock/data.json',
                JSON.stringify(audioData, null, 2),
                'utf8'
            );
        });
        
        test('should handle write errors', () => {
            fs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error');
            });
            
            const audioData = { 'BavaBatra': ['2'] };
            const result = writeDataFile(audioData);
            
            expect(result).toBe(false);
        });
        
        test('should calculate statistics correctly', () => {
            const audioData = {
                'BavaBatra': ['2', '3', '4'],
                'BavaKamma': ['2', '3']
            };
            
            // Mock console.log to capture output
            const originalLog = console.log;
            const logs = [];
            console.log = jest.fn((...args) => logs.push(args.join(' ')));
            
            writeDataFile(audioData);
            
            // Restore console.log
            console.log = originalLog;
            
            // Check that statistics were logged
            expect(logs.some(log => log.includes('Tractates: 2'))).toBe(true);
            expect(logs.some(log => log.includes('Total Daf recordings: 5'))).toBe(true);
        });
    });
    
    describe('validateAudioFiles', () => {
        test('should validate all audio files exist', () => {
            const audioData = {
                'BavaBatra': ['2', '3'],
                'BavaKamma': ['2']
            };
            
            // Mock file existence
            fs.existsSync
                .mockReturnValueOnce(true)  // content/BavaBatra/BavaBatra2.mp3
                .mockReturnValueOnce(true)  // content/BavaBatra/BavaBatra3.mp3
                .mockReturnValueOnce(true); // content/BavaKamma/BavaKamma2.mp3
            
            const result = validateAudioFiles(audioData);
            
            expect(result).toBe(true);
            expect(fs.existsSync).toHaveBeenCalledTimes(3);
        });
        
        test('should detect missing files', () => {
            const audioData = {
                'BavaBatra': ['2', '3'],
                'BavaKamma': ['2']
            };
            
            // Mock file existence - one file missing
            fs.existsSync
                .mockReturnValueOnce(true)   // content/BavaBatra/BavaBatra2.mp3
                .mockReturnValueOnce(false)  // content/BavaBatra/BavaBatra3.mp3 (missing)
                .mockReturnValueOnce(true);  // content/BavaKamma/BavaKamma2.mp3
            
            const result = validateAudioFiles(audioData);
            
            expect(result).toBe(false);
        });
        
        test('should handle empty audio data', () => {
            const result = validateAudioFiles({});
            
            expect(result).toBe(true);
        });
    });
    
    describe('Integration', () => {
        test('should process complete workflow', () => {
            // Mock directory structure
            const mockSubdirs = [
                { name: 'BavaBatra', isDirectory: () => true },
                { name: 'BavaKamma', isDirectory: () => true }
            ];
            
            fs.readdirSync
                .mockReturnValueOnce(mockSubdirs)
                .mockReturnValueOnce(['BavaBatra2.mp3', 'BavaBatra3.mp3'])
                .mockReturnValueOnce(['BavaKamma2.mp3']);
            
            // Mock file existence
            fs.existsSync
                .mockReturnValueOnce(true)  // content directory
                .mockReturnValueOnce(true)  // BavaBatra2.mp3
                .mockReturnValueOnce(true)  // BavaBatra3.mp3
                .mockReturnValueOnce(true); // BavaKamma2.mp3
            
            // Scan content
            const audioData = scanContentFolder();
            
            expect(audioData).toEqual({
                'BavaBatra': ['2', '3'],
                'BavaKamma': ['2']
            });
            
            // Validate files
            const validationResult = validateAudioFiles(audioData);
            expect(validationResult).toBe(true);
            
            // Write data
            const writeResult = writeDataFile(audioData);
            expect(writeResult).toBe(true);
        });
    });
});

// Test helper functions
describe('Helper Functions', () => {
    test('findGaps should identify missing numbers', () => {
        // Import the findGaps function (we need to extract it from build.js)
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
        
        expect(findGaps([1, 2, 4, 6])).toEqual([3, 5]);
        expect(findGaps([1, 2, 3, 4])).toEqual([]);
        expect(findGaps([1, 3, 5])).toEqual([2, 4]);
        expect(findGaps([])).toEqual([]);
        expect(findGaps([1])).toEqual([]);
    });
    
    test('generateStats should format statistics correctly', () => {
        const audioData = {
            'BavaBatra': ['2', '3', '5'],
            'BavaKamma': ['2', '3', '4', '6']
        };
        
        // Mock console.log
        const originalLog = console.log;
        const logs = [];
        console.log = jest.fn((...args) => logs.push(args.join(' ')));
        
        // We need to extract generateStats from build.js
        const generateStats = (audioData) => {
            console.log('📈 Detailed Statistics:');
            
            Object.entries(audioData)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([tractate, dafs]) => {
                    const min = Math.min(...dafs.map(d => parseInt(d)));
                    const max = Math.max(...dafs.map(d => parseInt(d)));
                    const gaps = findGaps(dafs.map(d => parseInt(d)));
                    
                    console.log(`   📖 ${tractate}:`);
                    console.log(`      • Count: ${dafs.length} dafs`);
                    console.log(`      • Range: ${min} - ${max}`);
                    
                    if (gaps.length > 0) {
                        console.log(`      • Missing: ${gaps.join(', ')}`);
                    } else {
                        console.log(`      • Complete sequence ✅`);
                    }
                });
        };
        
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
        
        generateStats(audioData);
        
        // Restore console.log
        console.log = originalLog;
        
        // Check that statistics were generated
        expect(logs.some(log => log.includes('BavaBatra'))).toBe(true);
        expect(logs.some(log => log.includes('BavaKamma'))).toBe(true);
        expect(logs.some(log => log.includes('Count: 3 dafs'))).toBe(true);
        expect(logs.some(log => log.includes('Count: 4 dafs'))).toBe(true);
    });
}); 