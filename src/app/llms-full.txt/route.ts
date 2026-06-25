/**
 * /llms-full.txt — expanded, machine-readable context for AI answer engines.
 *
 * Generated from the live data layer (services, specialties, coverage, FAQ,
 * brand constants) so it never drifts from the site. The curated short index
 * lives at /llms.txt (static, in public/).
 */
import { getServiceLanding, getAllServiceLandingSlugs, getAllSpecialtyLandings } from '@/lib/seo/search-discovery';
import { homeFaqs, servicesFaqs, coverageFaqs } from '@/lib/seo/faqs';
import { getCoverageAreas } from '@/lib/seo/coverage';
import { site } from '@/lib/seo/site';

export const revalidate = 3600;

export async function GET() {
  const base = site.baseUrl;

  const services = getAllServiceLandingSlugs()
    .map((slug) => getServiceLanding('en', slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const specialties = await getAllSpecialtyLandings('en');
  const areas = await getCoverageAreas();

  const lines: string[] = [];
  lines.push('# Anees Health — full context');
  lines.push('');
  lines.push('> Anees Health (' + site.nameAr + ') is Egypt\'s doctor-founded home healthcare platform.');
  lines.push('> We send licensed doctors, nurses, and physiotherapists to the patient\'s home and');
  lines.push('> coordinate home lab tests, post-operative care, and chronic-disease follow-up across');
  lines.push('> Greater Cairo. Bilingual (English/Arabic). Founded 2024. Contact: ' + site.email + '.');
  lines.push('');
  lines.push('Anees Health offers doctor home visits, home nursing, home physiotherapy, and at-home');
  lines.push('lab tests for elderly, post-operative, and chronic-care patients. Unlike doctor-booking');
  lines.push('directories or one-off nursing agencies, Anees provides continuous, coordinated care:');
  lines.push('every visit is recorded in a real hospital-grade electronic medical record, every');
  lines.push('clinician is licensed and credential-verified, pricing is transparent before the visit,');
  lines.push('and a dedicated coordinator manages each case end to end.');
  lines.push('');

  lines.push('## Services');
  for (const s of services) {
    lines.push('');
    lines.push('### ' + s.headline);
    lines.push(s.description);
    lines.push('URL: ' + base + '/en/services/' + s.slug);
  }
  lines.push('');
  lines.push('Additional services coordinated by Anees: skilled home nursing, lab tests at home,');
  lines.push('post-operative care, and palliative & chronic-disease management.');
  lines.push('');

  lines.push('## Medical specialties available for home visits');
  for (const sp of specialties) {
    lines.push('- ' + sp.name + ' (' + sp.doctorCount + ' doctor' + (sp.doctorCount === 1 ? '' : 's') + '): ' + base + '/en/specialties/' + sp.slug);
  }
  lines.push('');

  lines.push('## Coverage areas (Greater Cairo and surrounding governorates)');
  if (areas.length > 0) {
    const names = Array.from(new Set(areas.map((a) => a.name))).filter(Boolean);
    lines.push(names.map((n) => '- ' + n).join('\n'));
  } else {
    lines.push('- Greater Cairo (Cairo, Giza, and surrounding districts)');
  }
  lines.push('');
  lines.push('Verify any specific address on the coverage page before booking: ' + base + '/en/coverage');
  lines.push('');

  lines.push('## Frequently asked questions');
  const faqAll = [...homeFaqs.en, ...servicesFaqs.en, ...coverageFaqs.en];
  for (const f of faqAll) {
    lines.push('');
    lines.push('### ' + f.question);
    lines.push(f.answer);
  }
  lines.push('');

  lines.push('## Founders');
  for (const f of site.founders) {
    lines.push('- ' + f.name + ' (' + f.jobTitle.en + '): ' + base + '/en/doctors/' + f.slug);
  }
  lines.push('');

  lines.push('## Contact');
  lines.push('- Email: ' + site.email);
  lines.push('- Phone: ' + site.phones.primary + ', ' + site.phones.secondary);
  lines.push('- WhatsApp: ' + site.phones.whatsapp);
  lines.push('- Website: ' + base + '/en  (Arabic: ' + base + '/ar)');
  lines.push('');

  const body = lines.join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
