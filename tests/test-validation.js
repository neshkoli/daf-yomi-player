/**
 * Tests for validate-content.js script
 * Tests content validation, file naming, and error reporting
 */

const fs = require('fs');
const path = require('path');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Import the validation function after mocking
const { validateContent } = require('../validate-content.js');

describe('Content Validation', () => {
    const mockContentDir = '/mock/content';
    const mockMasechetFile = '/mock/masechet.json';
    
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup path mock
        path.join = jest.fn((...args) => args.join('/'));
        path.__dirname = '/mock';
        
        // Setup fs mock
        fs.existsSync = jest.fn().mockReturnValue(true);
        fs.readFileSync = jest.fn().mockReturnValue('[]');
        fs.readdirSync = jest.fn().mockReturnValue([]);
        
        // Reset process.exit mock
        process.exit.mockClear();
    });
    
    afterAll(() => {
        // Restore original process.exit
        process.exit = originalExit;
    });
    
    describe('validateContent', () => {
        test('should validate content structure successfully', () => {
            // Mock masechet data
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' },
                { order: 2, title: 'BavaKamma', heTitle: 'בבא קמא' }
            ];
            
            // Mock directory structure
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true },
                { name: 'BavaKamma', isDirectory: () => true }
            ];
            
            // Mock file lists
            const mockBavaBatraFiles = ['BavaBatra2.mp3', 'BavaBatra3.mp3', 'BavaBatra4.mp3'];
            const mockBavaKammaFiles = ['BavaKamma2.mp3', 'BavaKamma3.mp3'];
            
            // Setup mocks
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories) // First call for directories
                .mockReturnValueOnce(mockBavaBatraFiles) // BavaBatra files
                .mockReturnValueOnce(mockBavaKammaFiles); // BavaKamma files
            
            const result = validateContent();
            
            expect(result).toBe(true);
        });
        
        test('should handle missing content directory', () => {
            fs.existsSync.mockReturnValue(false);
            
            const result = validateContent();
            
            expect(result).toBe(false);
        });
        
        test('should handle invalid masechet.json', () => {
            fs.readFileSync.mockImplementation(() => {
                throw new Error('Invalid JSON');
            });
            
            const result = validateContent();
            
            expect(result).toBe(false);
        });
        
        test('should validate file naming conventions', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' }
            ];
            
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true }
            ];
            
            // Mix of valid and invalid files
            const mockFiles = [
                'BavaBatra2.mp3',    // Valid
                'invalid.mp3',        // Invalid
                'BavaBatra3.mp3',     // Valid
                'BavaBatra.txt',      // Invalid
                'BavaBatra4.mp3'      // Valid
            ];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockFiles);
            
            // Mock console.warn to capture warnings
            const originalWarn = console.warn;
            const warnings = [];
            console.warn = jest.fn((...args) => warnings.push(args.join(' ')));
            
            const result = validateContent();
            
            // Restore console.warn
            console.warn = originalWarn;
            
            expect(result).toBe(true);
            expect(warnings.some(w => w.includes("doesn't match expected pattern"))).toBe(true);
        });
        
        test('should detect gaps in daf numbering', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' }
            ];
            
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true }
            ];
            
            // Files with gaps in numbering
            const mockFiles = [
                'BavaBatra2.mp3',
                'BavaBatra3.mp3',
                'BavaBatra5.mp3', // Gap: missing 4
                'BavaBatra6.mp3'
            ];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockFiles);
            
            // Mock console.warn to capture warnings
            const originalWarn = console.warn;
            const warnings = [];
            console.warn = jest.fn((...args) => warnings.push(args.join(' ')));
            
            const result = validateContent();
            
            // Restore console.warn
            console.warn = originalWarn;
            
            expect(result).toBe(true);
            expect(warnings.some(w => w.includes('Gap in daf numbering'))).toBe(true);
        });
        
        test('should handle empty directories', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' }
            ];
            
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true }
            ];
            
            // Empty directory
            const mockFiles = [];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockFiles);
            
            // Mock console.error to capture errors
            const originalError = console.error;
            const errors = [];
            console.error = jest.fn((...args) => errors.push(args.join(' ')));
            
            const result = validateContent();
            
            // Restore console.error
            console.error = originalError;
            
            expect(result).toBe(false);
            expect(errors.some(e => e.includes('No MP3 files found'))).toBe(true);
        });
        
        test('should validate directory names against masechet.json', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' }
            ];
            
            // Directory name not in masechet.json
            const mockDirectories = [
                { name: 'UnknownTractate', isDirectory: () => true }
            ];
            
            const mockFiles = ['UnknownTractate2.mp3'];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockFiles);
            
            // Mock console.warn to capture warnings
            const originalWarn = console.warn;
            const warnings = [];
            console.warn = jest.fn((...args) => warnings.push(args.join(' ')));
            
            const result = validateContent();
            
            // Restore console.warn
            console.warn = originalWarn;
            
            expect(result).toBe(true);
            expect(warnings.some(w => w.includes('not found in masechet.json'))).toBe(true);
        });
        
        test('should sort files numerically', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' }
            ];
            
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true }
            ];
            
            // Files in random order
            const mockFiles = [
                'BavaBatra10.mp3',
                'BavaBatra2.mp3',
                'BavaBatra1.mp3'
            ];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockFiles);
            
            const result = validateContent();
            
            expect(result).toBe(true);
        });
        
        test('should provide detailed validation summary', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' },
                { order: 2, title: 'BavaKamma', heTitle: 'בבא קמא' }
            ];
            
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true },
                { name: 'BavaKamma', isDirectory: () => true }
            ];
            
            const mockBavaBatraFiles = ['BavaBatra2.mp3', 'BavaBatra3.mp3'];
            const mockBavaKammaFiles = ['BavaKamma2.mp3'];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockBavaBatraFiles)
                .mockReturnValueOnce(mockBavaKammaFiles);
            
            // Mock console.log to capture output
            const originalLog = console.log;
            const logs = [];
            console.log = jest.fn((...args) => logs.push(args.join(' ')));
            
            const result = validateContent();
            
            // Restore console.log
            console.log = originalLog;
            
            expect(result).toBe(true);
            
            // Check for summary information
            expect(logs.some(log => log.includes('Validation Summary'))).toBe(true);
            expect(logs.some(log => log.includes('Directories processed: 2'))).toBe(true);
        });
    });
    
    describe('Error Handling', () => {
        test('should handle file system errors gracefully', () => {
            fs.readdirSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });
            
            const result = validateContent();
            
            expect(result).toBe(false);
        });
        
        test('should handle invalid file names gracefully', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' }
            ];
            
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true }
            ];
            
            // Files with no numbers
            const mockFiles = [
                'BavaBatra.mp3',
                'BavaBatra2.mp3',
                'BavaBatra.mp3'
            ];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockFiles);
            
            const result = validateContent();
            
            expect(result).toBe(true);
        });
    });
    
    describe('Integration', () => {
        test('should validate complete content structure', () => {
            const mockMasechetData = [
                { order: 1, title: 'BavaBatra', heTitle: 'בבא בתרא' },
                { order: 2, title: 'BavaKamma', heTitle: 'בבא קמא' }
            ];
            
            const mockDirectories = [
                { name: 'BavaBatra', isDirectory: () => true },
                { name: 'BavaKamma', isDirectory: () => true }
            ];
            
            const mockBavaBatraFiles = ['BavaBatra2.mp3', 'BavaBatra3.mp3', 'BavaBatra4.mp3'];
            const mockBavaKammaFiles = ['BavaKamma2.mp3', 'BavaKamma3.mp3'];
            
            fs.readFileSync.mockReturnValue(JSON.stringify(mockMasechetData));
            fs.readdirSync
                .mockReturnValueOnce(mockDirectories)
                .mockReturnValueOnce(mockBavaBatraFiles)
                .mockReturnValueOnce(mockBavaKammaFiles);
            
            // Mock console methods to capture output
            const originalLog = console.log;
            const originalWarn = console.warn;
            const originalError = console.error;
            
            const logs = [];
            const warnings = [];
            const errors = [];
            
            console.log = jest.fn((...args) => logs.push(args.join(' ')));
            console.warn = jest.fn((...args) => warnings.push(args.join(' ')));
            console.error = jest.fn((...args) => errors.push(args.join(' ')));
            
            const result = validateContent();
            
            // Restore console methods
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
            
            expect(result).toBe(true);
            expect(errors.length).toBe(0);
            expect(logs.some(log => log.includes('All content validated successfully'))).toBe(true);
        });
    });
}); 