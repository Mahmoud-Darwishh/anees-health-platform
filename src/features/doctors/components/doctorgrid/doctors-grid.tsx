'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { useReveal } from '@/hooks/useReveal';
import { DoctorCard } from './DoctorCard';
import { FilterSidebar } from './FilterSidebar';
import { Pagination } from './Pagination';
import type { Doctor, FilterState, SortOrder } from './types';
import { uniqueSorted } from './utils';
import LucideIcon from '@/components/common/LucideIcon';
import { getDoctorSpecialityLabel } from '@/lib/utils/doctor-speciality';

type MessageValues = Record<string, string | number>;

interface DoctorGridProps {
  doctors: Doctor[];
}

const DoctorGrid = ({ doctors }: DoctorGridProps) => {
  const t = useTranslations('home');
  const tg = (key: string, values?: MessageValues) =>
    t(`doctorGrid.${key}`, values);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useReveal(wrapperRef, [locale]);

  const localeForSpeciality = locale === 'ar' ? 'ar' : 'en';

  const specialities = useMemo(
    () =>
      uniqueSorted(
        doctors.map((doctor) => getDoctorSpecialityLabel(doctor.speciality, localeForSpeciality))
      ),
    [doctors, localeForSpeciality]
  );
  const languages = useMemo(
    () => uniqueSorted(doctors.flatMap((d) => d.languages)),
    [doctors]
  );

  const [filters, setFilters] = useState<FilterState>({
    selectedSpecialities: [],
    selectedGenders: [],
    selectedLanguages: [],
    selectedExperience: [],
    searchText: '',
  });

  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const doctorsPerPage = 12;

  const replacePageInUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(page));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const deferredSearchText = useDeferredValue(filters.searchText);
  const normalizedSearch = useMemo(
    () => deferredSearchText.trim().toLowerCase(),
    [deferredSearchText]
  );

  const handleFilterChange = useCallback((updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    replacePageInUrl(1);
    setShowMobileFilters(false);
  }, [replacePageInUrl]);

  const handleClearAll = useCallback(() => {
    setFilters({
      selectedSpecialities: [],
      selectedGenders: [],
      selectedLanguages: [],
      selectedExperience: [],
      searchText: '',
    });
    replacePageInUrl(1);
    setSortOrder('none');
    setShowMobileFilters(false);
  }, [replacePageInUrl]);

  const handlePageChange = useCallback((newPage: number) => {
    replacePageInUrl(newPage);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [replacePageInUrl]);

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      // Search text filter
      if (
        normalizedSearch &&
        !doctor.doctorName.toLowerCase().includes(normalizedSearch) &&
        !doctor.speciality.toLowerCase().includes(normalizedSearch) &&
        !getDoctorSpecialityLabel(doctor.speciality, localeForSpeciality)
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }

      // Speciality filter
      if (
        filters.selectedSpecialities.length > 0 &&
        !filters.selectedSpecialities.includes(
          getDoctorSpecialityLabel(doctor.speciality, localeForSpeciality)
        )
      ) {
        return false;
      }

      // Gender filter
      if (
        filters.selectedGenders.length > 0 &&
        !filters.selectedGenders.includes(doctor.gender)
      ) {
        return false;
      }

      // Language filter
      if (filters.selectedLanguages.length > 0) {
        const hasLanguage = doctor.languages.some((lang) =>
          filters.selectedLanguages.includes(lang)
        );
        if (!hasLanguage) return false;
      }

      // Experience filter
      if (filters.selectedExperience.length > 0) {
        const hasExperience = filters.selectedExperience.some(
          (exp) => doctor.experienceYears >= exp
        );
        if (!hasExperience) return false;
      }

      return true;
    });
  }, [doctors, filters, localeForSpeciality, normalizedSearch]);

  // Sort doctors
  const filteredAndSorted = useMemo(() => {
    const sorted = [...filteredDoctors];
    if (sortOrder === 'experience') {
      sorted.sort(
        (a, b) => b.experienceYears - a.experienceYears
      );
    }
    return sorted;
  }, [filteredDoctors, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSorted.length / doctorsPerPage);
  const rawPage = Number(searchParams.get('page') || '1');
  const safeFromUrl = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const currentPage = Math.min(safeFromUrl, Math.max(1, totalPages || 1));

  useEffect(() => {
    if (safeFromUrl !== currentPage) {
      replacePageInUrl(currentPage);
    }
  }, [safeFromUrl, currentPage, replacePageInUrl]);

  const startIndex = (currentPage - 1) * doctorsPerPage;
  const currentDoctors = filteredAndSorted.slice(
    startIndex,
    startIndex + doctorsPerPage
  );

  const handleSortChange = useCallback(
    (nextSort: SortOrder) => {
      setSortOrder(nextSort);
      replacePageInUrl(1);
    },
    [replacePageInUrl]
  );

  return (
    <div ref={wrapperRef} className="main-wrapper" key={locale}>
      <Header />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: tg('breadcrumb.home'), href: `/${locale}` },
          { label: tg('breadcrumb.doctor'), active: true },
        ]}
        title={tg('title')}
      />

      {/* Main Content */}
      <div className="content mt-5">
        <div className="container">
          <div className="row">
            {/* Sidebar Filters - Desktop */}
            <div className="col-xl-3 d-none d-xl-block">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                specialities={specialities}
                languages={languages}
                tg={tg}
              />
            </div>

            {/* Mobile Filters Offcanvas */}
            <div
              className="offcanvas offcanvas-start"
              tabIndex={-1}
              id="mobileFiltersOffcanvas"
              aria-labelledby="mobileFiltersLabel"
              style={{
                visibility: showMobileFilters ? 'visible' : 'hidden',
                transform: showMobileFilters ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease-in-out, visibility 0.3s ease-in-out',
              }}
            >
              <div className="offcanvas-header">
                <h5 className="offcanvas-title" id="mobileFiltersLabel">
                  {tg('filters.title')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowMobileFilters(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="offcanvas-body p-0">
                <FilterSidebar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearAll={handleClearAll}
                  specialities={specialities}
                  languages={languages}
                  tg={tg}
                />
              </div>
            </div>

            {/* Results Section */}
            <div className="col-xl-9 col-12">
              <div className="row align-items-center mb-4">
                <div className="col-md-6 col-12">
                  <div className="mb-3 mb-md-0">
                    <h3 className="results-count-heading">
                      {t.rich('doctorGrid.results.showing', {
                        current: currentDoctors.length,
                        total: filteredAndSorted.length,
                        c: (chunks) => <span className="text-primary-brand fw-semibold">{chunks}</span>,
                      })}
                    </h3>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="d-flex align-items-center justify-content-md-end justify-content-start gap-2">
                    {/* Mobile Filter Button */}
                    <button
                      className="btn btn-outline-primary d-xl-none"
                      type="button"
                      onClick={() => setShowMobileFilters(true)}
                      aria-label="Open filters"
                    >
                      <LucideIcon iconClass="fas fa-sliders-h me-2"></LucideIcon>
                      {tg('filters.title')}
                    </button>

                    <div className="dropdown">
                      <button
                        className="btn sort-control dropdown-toggle d-flex align-items-center gap-2"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span className="me-2">{tg('sort.label')}:</span>
                        <span>
                          {sortOrder === 'experience'
                            ? tg('sort.experienceDesc')
                            : tg('sort.relevance')}
                        </span>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => handleSortChange('none')}
                          >
                            {tg('sort.relevance')}
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => handleSortChange('experience')}
                          >
                            {tg('sort.experienceDesc')}
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                {currentDoctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    locale={locale}
                    tg={tg}
                  />
                ))}
              </div>

              {/* Pagination */}
              {filteredAndSorted.length > doctorsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  tg={tg}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DoctorGrid;

