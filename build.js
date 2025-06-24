#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Build script to scan the content folder and generate data.json
 * for the Daf Yomi audio player
 */

const CONTENT_DIR = path.join(__dirname, 'content');
const OUTPUT_FILE = path.join(__dirname, 'data.json');

function scanContentFolder() {
    const audioData = {};
    
    try {
        // Check if content directory exists
        if (!fs.existsSync(CONTENT_DIR)) {
            console.error('❌ Content directory not found:', CONTENT_DIR);
            process.exit(1);
        }
        
        // Read all subdirectories in content folder
        const subdirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(name => !name.startsWith('.')); // Exclude hidden directories
        
        console.log('📁 Found tractate directories:', subdirs.length);
        
        subdirs.forEach(tractate => {
            const tractateDir = path.join(CONTENT_DIR, tractate);
            
            try {
                // Read all MP3 files in the tractate directory
                const files = fs.readdirSync(tractateDir)
                    .filter(file => file.toLowerCase().endsWith('.mp3'))
                    .filter(file => !file.startsWith('.')); // Exclude hidden files
                
                if (files.length === 0) {
                    console.warn(`⚠️  No MP3 files found in ${tractate}`);
                    return;
                }
                
                // Extract daf numbers from filenames
                const dafs = files.map(file => {
                    // Remove the tractate name and .mp3 extension to get the number
                    const match = file.match(new RegExp(`^${tractate}(\\d+)\\.mp3$`, 'i'));
                    return match ? match[1] : null;
                })
                .filter(daf => daf !== null)
                .sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
                
                if (dafs.length > 0) {
                    audioData[tractate] = dafs;
                    console.log(`✅ ${tractate}: Found ${dafs.length} daf recordings (${Math.min(...dafs.map(d => parseInt(d)))} - ${Math.max(...dafs.map(d => parseInt(d)))})`);
                } else {
                    console.warn(`⚠️  No valid daf files found in ${tractate}`);
                }
                
            } catch (error) {
                console.error(`❌ Error reading directory ${tractate}:`, error.message);
            }
        });
        
        return audioData;
        
    } catch (error) {
        console.error('❌ Error scanning content folder:', error.message);
        process.exit(1);
    }
}

function writeDataFile(audioData) {
    try {
        const jsonData = JSON.stringify(audioData, null, 2);
        fs.writeFileSync(OUTPUT_FILE, jsonData, 'utf8');
        
        const totalTractates = Object.keys(audioData).length;
        const totalDafs = Object.values(audioData).reduce((sum, dafs) => sum + dafs.length, 0);
        
        console.log('\n📊 Build Summary:');
        console.log(`   • Tractates: ${totalTractates}`);
        console.log(`   • Total Daf recordings: ${totalDafs}`);
        console.log(`   • Output file: ${OUTPUT_FILE}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error writing data file:', error.message);
        return false;
    }
}

function validateAudioFiles(audioData) {
    console.log('\n🔍 Validating audio files...');
    let missingFiles = 0;
    let totalFiles = 0;
    
    Object.entries(audioData).forEach(([tractate, dafs]) => {
        dafs.forEach(daf => {
            totalFiles++;
            const filePath = path.join(CONTENT_DIR, tractate, `${tractate}${daf}.mp3`);
            
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️  Missing file: ${tractate}${daf}.mp3`);
                missingFiles++;
            }
        });
    });
    
    if (missingFiles === 0) {
        console.log(`✅ All ${totalFiles} audio files are present`);
    } else {
        console.warn(`⚠️  ${missingFiles} out of ${totalFiles} files are missing`);
    }
    
    return missingFiles === 0;
}

function generateStats(audioData) {
    console.log('\n📈 Detailed Statistics:');
    
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
}

function findGaps(numbers) {
    if (numbers.length === 0) return [];
    
    numbers.sort((a, b) => a - b);
    const gaps = [];
    
    for (let i = numbers[0]; i <= numbers[numbers.length - 1]; i++) {
        if (!numbers.includes(i)) {
            gaps.push(i);
        }
    }
    
    return gaps;
}

function main() {
    console.log('🚀 Starting Daf Yomi audio data build process...\n');
    
    // Scan content folder
    const audioData = scanContentFolder();
    
    if (Object.keys(audioData).length === 0) {
        console.error('❌ No valid audio data found. Please check your content directory structure.');
        process.exit(1);
    }
    
    // Validate files exist
    validateAudioFiles(audioData);
    
    // Generate detailed statistics
    generateStats(audioData);
    
    // Write data file
    if (writeDataFile(audioData)) {
        console.log('\n✅ Build completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Open index.html in a web browser');
        console.log('   2. Or serve the files using a local web server');
        console.log('   3. For GitHub Pages: commit and push all files to your repository');
    } else {
        console.error('\n❌ Build failed!');
        process.exit(1);
    }
}

// Run the build if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = { scanContentFolder, writeDataFile, validateAudioFiles };
