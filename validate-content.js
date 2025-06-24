#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Content validation script for Daf Yomi audio player
 * Validates audio file naming conventions and data consistency
 */

const CONTENT_DIR = path.join(__dirname, 'content');
const MASECHET_FILE = path.join(__dirname, 'masechet.json');

function validateContent() {
    console.log('🔍 Validating content structure...\n');
    
    let errors = 0;
    let warnings = 0;
    
    // Load masechet configuration
    let masechetData = [];
    try {
        masechetData = JSON.parse(fs.readFileSync(MASECHET_FILE, 'utf8'));
    } catch (error) {
        console.error('❌ Error reading masechet.json:', error.message);
        return false;
    }
    
    // Create lookup for valid tractate names
    const validTractates = new Set(masechetData.map(m => m.title));
    
    // Check content directory exists
    if (!fs.existsSync(CONTENT_DIR)) {
        console.error('❌ Content directory not found:', CONTENT_DIR);
        return false;
    }
    
    // Get all directories in content
    const directories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => !name.startsWith('.'));
    
    console.log(`📁 Found ${directories.length} tractate directories`);
    
    // Validate each directory
    directories.forEach(dir => {
        console.log(`\n📖 Validating ${dir}:`);
        
        // Check if directory name matches canonical name
        if (!validTractates.has(dir)) {
            console.warn(`  ⚠️  Directory name '${dir}' not found in masechet.json`);
            warnings++;
        }
        
        // Check audio files in directory
        const dirPath = path.join(CONTENT_DIR, dir);
        const files = fs.readdirSync(dirPath)
            .filter(file => file.endsWith('.mp3'))
            .sort((a, b) => {
                // Sort numerically by daf number
                const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
                const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
                return aNum - bNum;
            });
        
        if (files.length === 0) {
            console.error(`  ❌ No MP3 files found in ${dir}`);
            errors++;
            return;
        }
        
        console.log(`  ✅ Found ${files.length} audio files`);
        
        // Validate file naming convention
        const expectedPattern = new RegExp(`^${dir}\\d+\\.mp3$`);
        files.forEach(file => {
            if (!expectedPattern.test(file)) {
                console.warn(`  ⚠️  File '${file}' doesn't match expected pattern '${dir}[number].mp3'`);
                warnings++;
            }
        });
        
        // Check for sequential numbering
        const numbers = files.map(file => {
            const match = file.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        }).sort((a, b) => a - b);
        
        // Check for gaps in numbering
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] - numbers[i-1] > 1) {
                console.warn(`  ⚠️  Gap in daf numbering: ${numbers[i-1]} -> ${numbers[i]}`);
                warnings++;
            }
        }
        
        // Show range
        if (numbers.length > 0) {
            console.log(`  📄 Daf range: ${numbers[0]} - ${numbers[numbers.length - 1]}`);
        }
    });
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Validation Summary:');
    console.log(`✅ Directories processed: ${directories.length}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errors === 0 && warnings === 0) {
        console.log('\n🎉 All content validated successfully!');
        return true;
    } else if (errors === 0) {
        console.log('\n✅ Content validation passed with warnings');
        return true;
    } else {
        console.log('\n❌ Content validation failed');
        return false;
    }
}

// Run validation if called directly
if (require.main === module) {
    const success = validateContent();
    process.exit(success ? 0 : 1);
}

module.exports = { validateContent };
