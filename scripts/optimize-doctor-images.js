/**
 * Image Optimization Script - Phase 2A: Doctor Grid Images
 * 
 * This script converts all doctor-grid PNG images to WebP format
 * and generates 3 responsive sizes for each image.
 * 
 * Expected savings: 20-25 MB (67% reduction)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_DIR = path.join(__dirname, '../public/assets/img/doctor-grid');
const OUTPUT_DIR = path.join(__dirname, '../public/assets/img/doctor-grid-optimized');
const SIZES = [
  { width: 300, suffix: '-sm' },  // Mobile
  { width: 600, suffix: '-md' },  // Tablet
  { width: 900, suffix: '-lg' }   // Desktop
];
const WEBP_QUALITY = 85; // Good balance between quality and size

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
}

/**
 * Convert single image to WebP with multiple sizes
 */
async function convertImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const baseName = path.basename(filename, path.extname(filename));
  
  console.log(`\n📸 Processing: ${filename}`);
  
  try {
    // Get original image info
    const metadata = await sharp(inputPath).metadata();
    console.log(`   Original: ${metadata.width}x${metadata.height} - ${(metadata.size / 1024).toFixed(0)} KB`);
    
    let totalSavings = metadata.size || 0;
    
    // Generate all sizes
    for (const size of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `${baseName}${size.suffix}.webp`);
      
      await sharp(inputPath)
        .resize(size.width, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);
      
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / 1024).toFixed(0);
      totalSavings -= stats.size;
      
      console.log(`   ✅ ${size.width}px → ${sizeMB} KB (${outputPath.split('\\').pop()})`);
    }
    
    // Also create a full-size WebP version
    const fullSizePath = path.join(OUTPUT_DIR, `${baseName}.webp`);
    await sharp(inputPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(fullSizePath);
    
    const fullSizeStats = fs.statSync(fullSizePath);
    const fullSizeMB = (fullSizeStats.size / 1024).toFixed(0);
    totalSavings -= fullSizeStats.size;
    
    console.log(`   ✅ Full size → ${fullSizeMB} KB (${fullSizePath.split('\\').pop()})`);
    console.log(`   💰 Savings: ${(totalSavings / 1024 / 1024).toFixed(2)} MB`);
    
    return { success: true, savings: totalSavings };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, savings: 0 };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Image Optimization - Phase 2A');
  console.log('=' .repeat(60));
  console.log(`Input:  ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Sizes:  ${SIZES.map(s => s.width + 'px').join(', ')}`);
  console.log(`Quality: ${WEBP_QUALITY}%`);
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
  console.log('   2. Update doctors.en.json to reference new WebP files');
  console.log('   3. Replace <img> tags with Next.js <Image> component');
  console.log('   4. Delete original PNG files after verification');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
