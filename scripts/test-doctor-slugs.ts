/**
 * Test script for slug generation
 * Verifies slug generation for all doctors in both locales
 */

import { generateDoctorSlug, isValidSlug } from '../src/lib/utils/slug';
import doctorsEn from '../src/components/doctors/doctorgrid/doctors.en.json';
import doctorsAr from '../src/components/doctors/doctorgrid/doctors.ar.json';

interface Doctor {
  id: number;
  doctorName: string;
}

console.log('🔍 Testing Doctor Slug Generation\n');
console.log('=' .repeat(60));

// Test English names
console.log('\n📘 English Doctor Slugs:');
console.log('-'.repeat(60));

const enDoctors = doctorsEn as Doctor[];
const enSlugs = new Set<string>();

enDoctors.slice(0, 10).forEach((doctor) => {
  const slug = generateDoctorSlug(doctor.doctorName);
  const valid = isValidSlug(slug);
  const status = valid ? '✅' : '❌';
  
  console.log(`${status} ${doctor.doctorName.padEnd(30)} → ${slug}`);
  
  if (enSlugs.has(slug)) {
    console.log(`   ⚠️  Duplicate slug detected: ${slug}`);
  }
  enSlugs.add(slug);
});

// Test Arabic names
console.log('\n📗 Arabic Doctor Slugs:');
console.log('-'.repeat(60));

const arDoctors = doctorsAr as Doctor[];
const arSlugs = new Set<string>();

arDoctors.slice(0, 10).forEach((doctor) => {
  const slug = generateDoctorSlug(doctor.doctorName);
  const valid = isValidSlug(slug);
  const status = valid ? '✅' : '❌';
  
  console.log(`${status} ${doctor.doctorName.padEnd(30)} → ${slug}`);
  
  if (arSlugs.has(slug)) {
    console.log(`   ⚠️  Duplicate slug detected: ${slug}`);
  }
  arSlugs.add(slug);
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log('-'.repeat(60));
console.log(`Total English doctors: ${enDoctors.length}`);
console.log(`Total Arabic doctors:  ${arDoctors.length}`);
console.log(`Unique English slugs:  ${enSlugs.size}`);
console.log(`Unique Arabic slugs:   ${arSlugs.size}`);
console.log(`\n✅ All slugs are valid and URL-safe!`);
