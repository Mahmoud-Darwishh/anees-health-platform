'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { useReveal } from '@/hooks/useReveal';
import { DoctorCard } from './DoctorCard';
import { FilterSidebar } from './FilterSidebar';
import { Pagination } from './Pagination';
import doctorsDataAr from './doctors.ar.json';
import doctorsDataEn from './doctors.en.json';
import type { Doctor, FilterState, SortOrder } from './types';
import { getChannels, getLanguages, uniqueSorted } from './utils';

type MessageValues = Record<string, string | number>;

const DoctorGrid = () => {
  const t = useTranslations('home');
  const tg = (key: string, values?: MessageValues) =>
    t(`doctorGrid.${key}`, values);
  const locale = useLocale();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useReveal(wrapperRef, [locale]);

  const doctors: Doctor[] =
    locale === 'ar'
      ? (doctorsDataAr as Doctor[])
      : (doctorsDataEn as Doctor[]);

  // Calculate min and max prices from doctors with fallback values
  const prices = doctors
    .map((d) => parseInt(d.consultationFee.replace(/\D/g, '')))
    .filter((price) => !isNaN(price) && price > 0);
  
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 10000;

  const specialities = useMemo(
    () => uniqueSorted(doctors.map((doctor) => doctor.speciality)),
    [doctors]
  );
  const channels = useMemo(
    () => uniqueSorted(doctors.flatMap((d) => d.channels)),
    [doctors]
  );
  const languages = useMemo(
    () => uniqueSorted(doctors.flatMap((d) => d.languages)),
    [doctors]
  );

  const [filters, setFilters] = useState<FilterState>({
    selectedSpecialities: [],
    selectedChannels: [],
    selectedGenders: [],
    selectedLanguages: [],
    selectedExperience: [],
    priceRange: [minPrice, maxPrice],
    selectedRatings: [],
    searchText: '',
    locationText: '',
  });

  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const doctorsPerPage = 12;

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    setFilters({
      selectedSpecialities: [],
      selectedChannels: [],
      selectedGenders: [],
      selectedLanguages: [],
      selectedExperience: [],
      priceRange: [minPrice, maxPrice],
      selectedRatings: [],
      searchText: '',
      locationText: '',
    });
    setCurrentPage(1);
    setSortOrder('none');
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top immediately and smoothly using requestAnimationFrame
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      // Search text filter
      if (
        filters.searchText &&
        !doctor.doctorName
          .toLowerCase()
          .includes(filters.searchText.toLowerCase()) &&
        !doctor.speciality
          .toLowerCase()
          .includes(filters.searchText.toLowerCase())
      ) {
        return false;
      }

      // Location filter
      if (
        filters.locationText &&
        !doctor.location
          .toLowerCase()
          .includes(filters.locationText.toLowerCase())
      ) {
        return false;
      }

      // Speciality filter
      if (
        filters.selectedSpecialities.length > 0 &&
        !filters.selectedSpecialities.includes(doctor.speciality)
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

      // Channel filter
      if (filters.selectedChannels.length > 0) {
        const hasChannel = doctor.channels.some((ch) =>
          filters.selectedChannels.includes(ch)
        );
        if (!hasChannel) return false;
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

      // Price range filter
      const fee = parseInt(doctor.consultationFee.replace(/\D/g, ''));
      if (fee < filters.priceRange[0] || fee > filters.priceRange[1]) {
        return false;
      }

      // Rating filter
      if (filters.selectedRatings.length > 0) {
        const hasRating = filters.selectedRatings.some(
          (rating) => doctor.rating >= rating
        );
        if (!hasRating) return false;
      }

      return true;
    });
  }, [doctors, filters]);

  // Sort doctors
  const filteredAndSorted = useMemo(() => {
    const sorted = [...filteredDoctors];
    if (sortOrder === 'low') {
      sorted.sort(
        (a, b) =>
          parseInt(a.consultationFee.replace(/\D/g, '')) -
          parseInt(b.consultationFee.replace(/\D/g, ''))
      );
    } else if (sortOrder === 'high') {
      sorted.sort(
        (a, b) =>
          parseInt(b.consultationFee.replace(/\D/g, '')) -
          parseInt(a.consultationFee.replace(/\D/g, ''))
      );
    }
    return sorted;
  }, [filteredDoctors, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSorted.length / doctorsPerPage);
  const startIndex = (currentPage - 1) * doctorsPerPage;
  const currentDoctors = filteredAndSorted.slice(
    startIndex,
    startIndex + doctorsPerPage
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
            {/* Sidebar Filters */}
            <div className="col-xl-3">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                specialities={specialities}
                channels={channels}
                languages={languages}
                minPrice={minPrice}
                maxPrice={maxPrice}
                tg={tg}
              />
            </div>

            {/* Results Section */}
            <div className="col-xl-9">
              <div className="row align-items-center mb-4">
                <div className="col-md-6 col-12">
                  <div className="mb-3 mb-md-0">
                    <h3>
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
                    <div className="dropdown">
                      <button
                        className="btn sort-control dropdown-toggle d-flex align-items-center gap-2"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span className="me-2">{tg('sort.label')}:</span>
                        <span>
                          {sortOrder === 'low'
                            ? tg('sort.priceAsc')
                            : sortOrder === 'high'
                            ? tg('sort.priceDesc')
                            : tg('sort.relevance')}
                        </span>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                          <a
                            href="#"
                            className="dropdown-item"
                            onClick={(e) => {
                              e.preventDefault();
                              setSortOrder('none');
                              setCurrentPage(1);
                            }}
                          >
                            {tg('sort.relevance')}
                          </a>
                        </li>
                        <li>
                          <a
                            href="#"
                            className="dropdown-item"
                            onClick={(e) => {
                              e.preventDefault();
                              setSortOrder('low');
                              setCurrentPage(1);
                            }}
                          >
                            {tg('sort.priceAsc')}
                          </a>
                        </li>
                        <li>
                          <a
                            href="#"
                            className="dropdown-item"
                            onClick={(e) => {
                              e.preventDefault();
                              setSortOrder('high');
                              setCurrentPage(1);
                            }}
                          >
                            {tg('sort.priceDesc')}
                          </a>
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

