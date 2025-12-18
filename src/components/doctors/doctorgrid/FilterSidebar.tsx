'use client';

import React, { useState } from 'react';
import type { FilterState } from './types';

type MessageValues = Record<string, string | number>;

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onClearAll: () => void;
  specialities: string[];
  channels: string[];
  languages: string[];
  minPrice: number;
  maxPrice: number;
  tg: (key: string, values?: MessageValues) => string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  onClearAll,
  specialities,
  channels,
  languages,
  minPrice,
  maxPrice,
  tg,
}) => {
  const [showMoreSpecialities, setShowMoreSpecialities] = useState(false);
  const [showMoreExperience, setShowMoreExperience] = useState(false);

  const toggleArrayFilter = (
    key: keyof FilterState,
    value: string | number
  ) => {
    const currentArray = filters[key] as Array<string | number>;
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value];
    onFilterChange({ [key]: newArray });
  };

  const ratingOptions = [5, 4, 3, 2, 1];

  return (
    <div className="card filter-lists">
      <div className="card-header">
        <div className="d-flex align-items-center filter-head justify-content-between">
          <h4>{tg('filters.title')}</h4>
          <a
            href="#"
            className="text-secondary text-decoration-underline"
            onClick={(e) => {
              e.preventDefault();
              onClearAll();
            }}
          >
            {tg('filters.clear')}
          </a>
        </div>
        <div className="filter-input">
          <div className="position-relative input-icon">
            <input
              type="text"
              id="doctor-filter-search"
              name="doctor-name-search"
              className="form-control"
              value={filters.searchText}
              onChange={(e) => onFilterChange({ searchText: e.target.value })}
              placeholder={tg('search.namePlaceholder')}
              aria-label={tg('search.namePlaceholder')}
              autoComplete="off"
            />
            <span>
              <i className="isax isax-search-normal-1" />
            </span>
          </div>
        </div>
      </div>
      <div className="card-body p-0">
        {/* Specialities Filter */}
        <div className="accordion-item border-bottom">
          <div className="accordion-header" id="heading1">
            <div
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse1"
              aria-controls="collapse1"
              role="button"
            >
              <div className="d-flex align-items-center w-100">
                <h5>{tg('filters.speciality')}</h5>
                <div className="ms-auto">
                  <span>
                    <i className="fas fa-chevron-down" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            id="collapse1"
            className="accordion-collapse show"
            aria-labelledby="heading1"
          >
            <div className="accordion-body pt-3">
              {specialities.slice(0, 3).map((spec, idx) => (
                <div
                  className="d-flex align-items-center justify-content-between mb-2"
                  key={`spec-${spec}`}
                >
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`speciality-${idx}`}
                      aria-label={spec}
                      checked={filters.selectedSpecialities.includes(spec)}
                      onChange={() =>
                        toggleArrayFilter('selectedSpecialities', spec)
                      }
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`speciality-${idx}`}
                    >
                      {spec}
                    </label>
                  </div>
                  <span className="filter-badge"></span>
                </div>
              ))}

              {showMoreSpecialities &&
                specialities.slice(3).map((spec, idx) => (
                  <div
                    className="d-flex align-items-center justify-content-between mb-2"
                    key={`spec-more-${spec}`}
                  >
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`speciality-more-${idx}`}
                        aria-label={spec}
                        checked={filters.selectedSpecialities.includes(spec)}
                        onChange={() =>
                          toggleArrayFilter('selectedSpecialities', spec)
                        }
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`speciality-more-${idx}`}
                      >
                        {spec}
                      </label>
                    </div>
                    <span className="filter-badge"></span>
                  </div>
                ))}

              {specialities.length > 3 && (
                <div className="view-all">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowMoreSpecialities(!showMoreSpecialities);
                    }}
                    className="text-secondary text-decoration-underline"
                  >
                    {showMoreSpecialities ? tg('filters.view_less') : tg('filters.view_more')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gender Filter */}
        <div className="accordion-item border-bottom">
          <div className="accordion-header" id="heading2">
            <div
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse2"
              aria-controls="collapse2"
              role="button"
            >
              <div className="d-flex align-items-center w-100">
                <h5>{tg('filters.gender')}</h5>
                <div className="ms-auto">
                  <span>
                    <i className="fas fa-chevron-down" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            id="collapse2"
            className="accordion-collapse show"
            aria-labelledby="heading2"
          >
            <div className="accordion-body pt-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="gender-male"
                    aria-label={tg('filters.male')}
                    checked={filters.selectedGenders.includes('Male')}
                    onChange={() => toggleArrayFilter('selectedGenders', 'Male')}
                  />
                  <label className="form-check-label" htmlFor="gender-male">
                    {tg('filters.male')}
                  </label>
                </div>
                <span className="filter-badge"></span>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="gender-female"
                    aria-label={tg('filters.female')}
                    checked={filters.selectedGenders.includes('Female')}
                    onChange={() =>
                      toggleArrayFilter('selectedGenders', 'Female')
                    }
                  />
                  <label className="form-check-label" htmlFor="gender-female">
                    {tg('filters.female')}
                  </label>
                </div>
                <span className="filter-badge"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Filter */}
        <div className="accordion-item border-bottom">
          <div className="accordion-header" id="heading4">
            <div
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse4"
              aria-controls="collapse4"
              role="button"
            >
              <div className="d-flex align-items-center w-100">
                <h5>{tg('filters.price')}</h5>
                <div className="ms-auto">
                  <span>
                    <i className="fas fa-chevron-down" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            id="collapse4"
            className="accordion-collapse show"
            aria-labelledby="heading4"
          >
            <div className="accordion-body pt-3">
              {!isNaN(minPrice) && !isNaN(maxPrice) && minPrice !== maxPrice ? (
                <>
                  <div className="filter-range">
                    <input
                      type="range"
                      className="form-range"
                      min={minPrice}
                      max={maxPrice}
                      value={filters.priceRange[1]}
                      aria-label={tg('filters.range')}
                      onChange={(e) =>
                        onFilterChange({
                          priceRange: [minPrice, parseInt(e.target.value)],
                        })
                      }
                    />
                  </div>
                  <p className="mb-0">
                    {tg('filters.range')}: {minPrice} - {filters.priceRange[1]} EGP
                  </p>
                </>
              ) : (
                <p className="mb-0 text-muted">{tg('filters.price')} data loading...</p>
              )}
            </div>
          </div>
        </div>

        {/* Experience Filter */}
        <div className="accordion-item border-bottom">
          <div className="accordion-header" id="heading5">
            <div
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse5"
              aria-controls="collapse5"
              role="button"
            >
              <div className="d-flex align-items-center w-100">
                <h5>{tg('filters.experience')}</h5>
                <div className="ms-auto">
                  <span>
                    <i className="fas fa-chevron-down" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            id="collapse5"
            className="accordion-collapse show"
            aria-labelledby="heading5"
          >
            <div className="accordion-body pt-3">
              {[2, 5].map((yr) => (
                <div
                  className="d-flex align-items-center justify-content-between mb-2"
                  key={`exp-${yr}`}
                >
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`exp-${yr}`}
                      aria-label={tg('filters.years_plus', { count: yr })}
                      checked={filters.selectedExperience.includes(yr)}
                      onChange={() =>
                        toggleArrayFilter('selectedExperience', yr)
                      }
                    />
                    <label className="form-check-label" htmlFor={`exp-${yr}`}>
                      {tg('filters.years_plus', { count: yr })}
                    </label>
                  </div>
                </div>
              ))}

              {showMoreExperience &&
                [7, 10].map((yr) => (
                  <div
                    className="d-flex align-items-center justify-content-between mb-2"
                    key={`exp-more-${yr}`}
                  >
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`exp-more-${yr}`}
                        aria-label={tg('filters.years_plus', { count: yr })}
                        checked={filters.selectedExperience.includes(yr)}
                        onChange={() =>
                          toggleArrayFilter('selectedExperience', yr)
                        }
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`exp-more-${yr}`}
                      >
                        {tg('filters.years_plus', { count: yr })}
                      </label>
                    </div>
                  </div>
                ))}

              <div className="view-all">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMoreExperience(!showMoreExperience);
                  }}
                  className="text-secondary text-decoration-underline"
                >
                  {showMoreExperience ? tg('filters.view_less') : tg('filters.view_more')}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Consultation Type Filter */}
        <div className="accordion-item border-bottom">
          <div className="accordion-header" id="heading7">
            <div
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse7"
              aria-controls="collapse7"
              role="button"
            >
              <div className="d-flex align-items-center w-100">
                <h5>{tg('filters.channel')}</h5>
                <div className="ms-auto">
                  <span>
                    <i className="fas fa-chevron-down" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            id="collapse7"
            className="accordion-collapse show"
            aria-labelledby="heading7"
          >
            <div className="accordion-body pt-3">
              {channels.map((id) => {
                const labelMap: Record<string, string> = {
                  Home: tg('channels.home'),
                  video: tg('channels.video'),
                  chat: tg('channels.chat'),
                  clinic: tg('card.clinic_visit'),
                };
                const label = labelMap[id] || id;
                return (
                  <div
                    className="d-flex align-items-center justify-content-between mb-2"
                    key={id}
                  >
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`channel-${id}`}
                        aria-label={label}
                        checked={filters.selectedChannels.includes(id)}
                        onChange={() =>
                          toggleArrayFilter('selectedChannels', id)
                        }
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`channel-${id}`}
                      >
                        {label}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Languages Filter */}
        <div className="accordion-item border-bottom">
          <div className="accordion-header" id="heading8">
            <div
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse8"
              aria-controls="collapse8"
              role="button"
            >
              <div className="d-flex align-items-center w-100">
                <h5>{tg('filters.language')}</h5>
                <div className="ms-auto">
                  <span>
                    <i className="fas fa-chevron-down" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            id="collapse8"
            className="accordion-collapse show"
            aria-labelledby="heading8"
          >
            <div className="accordion-body pt-3">
              {languages.map((lang, i) => (
                <div
                  className="d-flex align-items-center justify-content-between mb-2"
                  key={`lang-${i}`}
                >
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`lang-${i}`}
                      aria-label={lang}
                      checked={filters.selectedLanguages.includes(lang)}
                      onChange={() =>
                        toggleArrayFilter('selectedLanguages', lang)
                      }
                    />
                    <label className="form-check-label" htmlFor={`lang-${i}`}>
                      {lang}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div className="accordion-item">
          <div className="accordion-header" id="heading9">
            <div
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse9"
              aria-controls="collapse9"
              role="button"
            >
              <div className="d-flex align-items-center w-100">
                <h5>{tg('filters.rating')}</h5>
                <div className="ms-auto">
                  <span>
                    <i className="fas fa-chevron-down" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            id="collapse9"
            className="accordion-collapse show"
            aria-labelledby="heading9"
          >
            <div className="accordion-body pt-3">
              {ratingOptions.map((r) => (
                <div
                  className="d-flex align-items-center justify-content-between mb-2"
                  key={`rating-${r}`}
                >
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`rating-${r}`}
                      aria-label={tg('filters.stars_up', { count: r })}
                      checked={filters.selectedRatings.includes(r)}
                      onChange={() => toggleArrayFilter('selectedRatings', r)}
                    />
                    <label className="form-check-label" htmlFor={`rating-${r}`}>
                      <span>
                        {Array.from({ length: r }).map((_, i) => (
                          <i
                            key={i}
                            className="fa-solid fa-star text-orange me-1"
                          />
                        ))}
                      </span>
                      {` ${tg('filters.stars_up', { count: r })}`}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
