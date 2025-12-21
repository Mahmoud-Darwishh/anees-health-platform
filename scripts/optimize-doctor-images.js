/**
 * Image Optimization Script - Simplified: Doctor Grid Images
 * 
 * This script converts all doctor-grid PNG images to WebP format
 * with a single optimized version (no multiple sizes).
 * 
 * Strategy: One WebP per image with good quality compression
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_DIR = path.join(__dirname, '../public/assets/img/doctor-grid');
const OUTPUT_DIR = path.join(__dirname, '../public/assets/img/doctor-grid-optimized');
const WEBP_QUALITY = 85; // Good balance between quality and size

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
}

/**
 * Convert single image to WebP (single version only)
 */
async function convertImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const baseName = path.basename(filename, path.extname(filename));
  const outputPath = path.join(OUTPUT_DIR, `${baseName}.webp`);
  
  console.log(`\n📸 Processing: ${filename}`);
  
  try {
    // Get original image info
    const metadata = await sharp(inputPath).metadata();
    const originalSize = metadata.size || 0;
    console.log(`   Original: ${metadata.width}x${metadata.height} - ${(originalSize / 1024).toFixed(0)} KB`);
    
    // Convert to WebP with quality compression
    await sharp(inputPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);
    
    const outputStats = fs.statSync(outputPath);
    const outputSize = outputStats.size;
    const savings = originalSize - outputSize;
    const reductionPercent = ((savings / originalSize) * 100).toFixed(1);
    
    console.log(`   ✅ WebP → ${(outputSize / 1024).toFixed(0)} KB`);
    console.log(`   💰 Savings: ${(savings / 1024).toFixed(0)} KB (${reductionPercent}% reduction)`);
    
    return { success: true, savings };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, savings: 0 };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Simplified Image Optimization');
  console.log('=' .repeat(60));
  console.log(`Input:  ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Quality: ${WEBP_QUALITY}%`);
  console.log(`Strategy: Single WebP per image (no multiple sizes)`);
  console.log('=' .repeat(60));
  
  // Get all PNG files from doctor-grid directory
  const files = fs.readdirSync(INPUT_DIR)
    .filter(file => file.endsWith('.png'));
  
  console.log(`\n📁 Found ${files.length} PNG images to convert\n`);
  
  let totalSavings = 0;
  let successCount = 0;
  
  // Process each file
  for (const file of files) {
    const result = await convertImage(file);
    if (result.success) {
      successCount++;
      totalSavings += result.savings;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully converted: ${successCount}/${files.length} images`);
  console.log(`💰 Total savings: ${(totalSavings / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📦 Output directory: ${OUTPUT_DIR}`);
  console.log('\n🎉 Optimization complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review optimized images in', OUTPUT_DIR);
  console.log('   2. Update Image components (remove sizes prop)');
  console.log('   3. Test images on different devices');
  console.log('   4. Delete multi-size variants (-sm, -md, -lg) if they exist');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
