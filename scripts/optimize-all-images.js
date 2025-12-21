/**
 * Universal Image Optimization Script
 * 
 * This script converts all PNG/JPG images to WebP format with quality compression.
 * Strategy: One optimized WebP per image (no multiple sizes).
 * 
 * Features:
 * - Converts PNG, JPG, JPEG to WebP
 * - Maintains folder structure
 * - Creates -optimized folders alongside originals
 * - Quality: 85% (good balance)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_DIR = path.join(__dirname, '../public/assets/img');
const WEBP_QUALITY = 85;
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

// Folders to optimize
const FOLDERS_TO_OPTIMIZE = [
  'banner',
  'bg',
  'blog',
  'category',
  'clients',
  'clinic',
  'company',
  'deals',
  'dependent',
  'doctors',
  'doctors-dashboard',
  'faq',
  'features',
  'icons',
  'onboard-img',
  'partners',
  'patients',
  'products',
  'reviews',
  'seller',
  'service',
  'shapes',
  'slider',
  'specialities',
  'stores'
];

/**
 * Check if file should be processed
 */
function shouldProcessFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Convert single image to WebP
 */
async function convertImage(inputPath, outputPath) {
  try {
    // Get original image info
    const metadata = await sharp(inputPath).metadata();
    const originalSize = metadata.size || 0;
    
    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);
    
    const outputStats = fs.statSync(outputPath);
    const outputSize = outputStats.size;
    const savings = originalSize - outputSize;
    const reductionPercent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0;
    
    return {
      success: true,
      originalSize,
      outputSize,
      savings,
      reductionPercent
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process a single folder
 */
async function processFolder(folderName) {
  const inputDir = path.join(BASE_DIR, folderName);
  const outputDir = path.join(BASE_DIR, `${folderName}-optimized`);
  
  // Check if input folder exists
  if (!fs.existsSync(inputDir)) {
    console.log(`   ⚠️  Folder not found: ${folderName}`);
    return { processed: 0, saved: 0 };
  }
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`\n📁 Processing folder: ${folderName}`);
  console.log(`   Input:  ${inputDir}`);
  console.log(`   Output: ${outputDir}`);
  
  // Get all files
  const files = fs.readdirSync(inputDir);
  const imageFiles = files.filter(shouldProcessFile);
  
  if (imageFiles.length === 0) {
    console.log(`   ℹ️  No images found`);
    return { processed: 0, saved: 0 };
  }
  
  console.log(`   Found ${imageFiles.length} images to convert`);
  
  let processedCount = 0;
  let totalSavings = 0;
  
  // Process each image
  for (const filename of imageFiles) {
    const inputPath = path.join(inputDir, filename);
    const baseName = path.basename(filename, path.extname(filename));
    const outputPath = path.join(outputDir, `${baseName}.webp`);
    
    const result = await convertImage(inputPath, outputPath);
    
    if (result.success) {
      console.log(
        `   ✅ ${filename.padEnd(30)} → ${baseName}.webp ` +
        `(${(result.outputSize / 1024).toFixed(0)} KB, ${result.reductionPercent}% reduction)`
      );
      processedCount++;
      totalSavings += result.savings;
    } else {
      console.log(`   ❌ ${filename.padEnd(30)} → Error: ${result.error}`);
    }
  }
  
  console.log(`   💾 Processed: ${processedCount}/${imageFiles.length}`);
  console.log(`   💰 Saved: ${(totalSavings / 1024 / 1024).toFixed(2)} MB`);
  
  return {
    processed: processedCount,
    saved: totalSavings
  };
}

/**
 * Process root-level images
 */
async function processRootImages() {
  console.log(`\n📁 Processing root-level images`);
  
  const files = fs.readdirSync(BASE_DIR);
  const imageFiles = files.filter(file => {
    const filePath = path.join(BASE_DIR, file);
    return fs.statSync(filePath).isFile() && shouldProcessFile(file);
  });
  
  if (imageFiles.length === 0) {
    console.log(`   ℹ️  No root-level images found`);
    return { processed: 0, saved: 0 };
  }
  
  console.log(`   Found ${imageFiles.length} images`);
  
  // Use existing optimized folder or create it
  const outputDir = path.join(BASE_DIR, 'optimized');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let processedCount = 0;
  let totalSavings = 0;
  
  for (const filename of imageFiles) {
    const inputPath = path.join(BASE_DIR, filename);
    const baseName = path.basename(filename, path.extname(filename));
    const outputPath = path.join(outputDir, `${baseName}.webp`);
    
    const result = await convertImage(inputPath, outputPath);
    
    if (result.success) {
      console.log(
        `   ✅ ${filename.padEnd(30)} → ${baseName}.webp ` +
        `(${(result.outputSize / 1024).toFixed(0)} KB, ${result.reductionPercent}% reduction)`
      );
      processedCount++;
      totalSavings += result.savings;
    } else {
      console.log(`   ❌ ${filename.padEnd(30)} → Error: ${result.error}`);
    }
  }
  
  return {
    processed: processedCount,
    saved: totalSavings
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Universal Image Optimization');
  console.log('='.repeat(70));
  console.log(`Base Directory: ${BASE_DIR}`);
  console.log(`WebP Quality: ${WEBP_QUALITY}%`);
  console.log(`Strategy: Single WebP per image (simplified)`);
  console.log('='.repeat(70));
  
  let totalProcessed = 0;
  let totalSaved = 0;
  
  // Process root images
  const rootResult = await processRootImages();
  totalProcessed += rootResult.processed;
  totalSaved += rootResult.saved;
  
  // Process each folder
  for (const folder of FOLDERS_TO_OPTIMIZE) {
    const result = await processFolder(folder);
    totalProcessed += result.processed;
    totalSaved += result.saved;
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Total images processed: ${totalProcessed}`);
  console.log(`💰 Total space saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📦 Output: Various *-optimized folders in ${BASE_DIR}`);
  console.log('\n🎉 Optimization complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review optimized images in the -optimized folders');
  console.log('   2. Update image references in your code to use new paths');
  console.log('   3. Test images across different devices and browsers');
  console.log('   4. Consider removing original images after verification');
  console.log('\n💡 Note: The script preserves folder structure and creates');
  console.log('   separate -optimized folders to keep originals safe.');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
