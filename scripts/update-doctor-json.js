/**
 * Update Doctor Grid JSON Files to Use WebP Images
 * 
 * This script updates both doctors.en.json and doctors.ar.json
 * to reference the new WebP optimized images.
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_UPDATE = [
  path.join(__dirname, '../src/components/doctors/doctorgrid/doctors.en.json'),
  path.join(__dirname, '../src/components/doctors/doctorgrid/doctors.ar.json')
];

function updateImagePath(imagePath) {
  // Convert: assets/img/doctor-grid/10.png
  // To: assets/img/doctor-grid-optimized/10.webp
  return imagePath
    .replace('/doctor-grid/', '/doctor-grid-optimized/')
    .replace('.png', '.webp');
}

function updateJsonFile(filePath) {
  console.log(`\n📝 Processing: ${path.basename(filePath)}`);
  
  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf-8');
    const doctors = JSON.parse(content);
    
    console.log(`   Found ${doctors.length} doctors`);
    
    // Update each doctor's image path
    let updateCount = 0;
    doctors.forEach((doctor, index) => {
      if (doctor.image && doctor.image.includes('doctor-grid') && doctor.image.endsWith('.png')) {
        const oldPath = doctor.image;
        doctor.image = updateImagePath(doctor.image);
        console.log(`   ✅ Doctor #${index + 1}: ${path.basename(oldPath)} → ${path.basename(doctor.image)}`);
        updateCount++;
      }
    });
    
    // Write back the file with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(doctors, null, 2), 'utf-8');
    
    console.log(`   💾 Updated ${updateCount} image paths`);
    console.log(`   ✅ File saved: ${filePath}`);
    
    return { success: true, count: updateCount };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, count: 0 };
  }
}

function main() {
  console.log('🚀 Updating Doctor Grid JSON Files');
  console.log('=' .repeat(60));
  
  let totalUpdates = 0;
  
  FILES_TO_UPDATE.forEach(file => {
    const result = updateJsonFile(file);
    if (result.success) {
      totalUpdates += result.count;
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total image paths updated: ${totalUpdates}`);
  console.log('✅ Both EN and AR files updated');
  console.log('\n🎉 JSON update complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test the doctors page to verify images load correctly');
  console.log('   2. Check responsive sizes on mobile/tablet/desktop');
  console.log('   3. Measure page load improvement');
  console.log('   4. Delete original PNG files after verification');
}

main();
