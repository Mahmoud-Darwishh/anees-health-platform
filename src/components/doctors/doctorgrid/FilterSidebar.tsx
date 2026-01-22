'use client';

import React, { useCallback, useId, useMemo, useState } from 'react';
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
  idPrefix?: string;
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
  idPrefix,
}) => {
  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const withPrefix = useCallback((value: string) => `${prefix}-${value}`, [prefix]);
  const sanitizeForId = (value: string | number) =>
    String(value)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');

  const accordion = useMemo(
    () => ({
      parent: withPrefix('filters'),
      heading1: withPrefix('heading1'),
      collapse1: withPrefix('collapse1'),
      heading2: withPrefix('heading2'),
      collapse2: withPrefix('collapse2'),
      heading4: withPrefix('heading4'),
      collapse4: withPrefix('collapse4'),
      heading5: withPrefix('heading5'),
      collapse5: withPrefix('collapse5'),
      heading7: withPrefix('heading7'),
      collapse7: withPrefix('collapse7'),
      heading8: withPrefix('heading8'),
      collapse8: withPrefix('collapse8'),
      heading9: withPrefix('heading9'),
      collapse9: withPrefix('collapse9'),
    }),
    [withPrefix]
  );

  const [showMoreSpecialities, setShowMoreSpecialities] = useState(false);
  const [showMoreExperience, setShowMoreExperience] = useState(false);

  const toggleArrayFilter = (key: keyof FilterState, value: string | number) => {
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
                id={withPrefix('doctor-filter-search')}
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

        <div className="card-body p-0" id={accordion.parent}>
          {/* Specialities Filter */}
          <div className="accordion-item border-bottom">
            <div className="accordion-header" id={accordion.heading1}>
              <div
                className="accordion-button"
                data-bs-toggle="collapse"
                data-bs-target={`#${accordion.collapse1}`}
                aria-controls={accordion.collapse1}
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
              id={accordion.collapse1}
              className="accordion-collapse show"
              aria-labelledby={accordion.heading1}
              data-bs-parent={`#${accordion.parent}`}
            >
              <div className="accordion-body pt-3">
                {specialities.slice(0, 3).map((spec, idx) => {
                  const specId = withPrefix(`speciality-${sanitizeForId(spec)}-${idx}`);
                  return (
                    <div
                      className="d-flex align-items-center justify-content-between mb-2"
                      key={`spec-${spec}`}
                    >
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={specId}
                          name="speciality"
                          aria-label={spec}
                          checked={filters.selectedSpecialities.includes(spec)}
                          onChange={() => toggleArrayFilter('selectedSpecialities', spec)}
                        />
                        <label className="form-check-label" htmlFor={specId}>
                          {spec}
                        </label>
                      </div>
                    </div>
                  );
                })}

                {showMoreSpecialities &&
                  specialities.slice(3).map((spec, idx) => {
                    const specId = withPrefix(`speciality-more-${sanitizeForId(spec)}-${idx}`);
                    return (
                      <div
                        className="d-flex align-items-center justify-content-between mb-2"
                        key={`spec-more-${spec}`}
                      >
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={specId}
                            name="speciality"
                            aria-label={spec}
                            checked={filters.selectedSpecialities.includes(spec)}
                            onChange={() => toggleArrayFilter('selectedSpecialities', spec)}
                          />
                          <label className="form-check-label" htmlFor={specId}>
                            {spec}
                          </label>
                        </div>
                      </div>
                    );
                  })}

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
            <div className="accordion-header" id={accordion.heading2}>
              <div
                className="accordion-button"
                data-bs-toggle="collapse"
                data-bs-target={`#${accordion.collapse2}`}
                aria-controls={accordion.collapse2}
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
              id={accordion.collapse2}
              className="accordion-collapse show"
              aria-labelledby={accordion.heading2}
              data-bs-parent={`#${accordion.parent}`}
            >
              <div className="accordion-body pt-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={withPrefix('gender-male')}
                      name="gender"
                      aria-label={tg('filters.male')}
                      checked={filters.selectedGenders.includes('Male')}
                      onChange={() => toggleArrayFilter('selectedGenders', 'Male')}
                    />
                    <label className="form-check-label" htmlFor={withPrefix('gender-male')}>
                      {tg('filters.male')}
                    </label>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={withPrefix('gender-female')}
                      name="gender"
                      aria-label={tg('filters.female')}
                      checked={filters.selectedGenders.includes('Female')}
                      onChange={() => toggleArrayFilter('selectedGenders', 'Female')}
                    />
                    <label className="form-check-label" htmlFor={withPrefix('gender-female')}>
                      {tg('filters.female')}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Filter */}
          <div className="accordion-item border-bottom">
            <div className="accordion-header" id={accordion.heading4}>
              <div
                className="accordion-button"
                data-bs-toggle="collapse"
                data-bs-target={`#${accordion.collapse4}`}
                aria-controls={accordion.collapse4}
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
              id={accordion.collapse4}
              className="accordion-collapse show"
              aria-labelledby={accordion.heading4}
              data-bs-parent={`#${accordion.parent}`}
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
                            priceRange: [minPrice, parseInt(e.target.value, 10)],
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
            <div className="accordion-header" id={accordion.heading5}>
              <div
                className="accordion-button"
                data-bs-toggle="collapse"
                data-bs-target={`#${accordion.collapse5}`}
                aria-controls={accordion.collapse5}
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
              id={accordion.collapse5}
              className="accordion-collapse show"
              aria-labelledby={accordion.heading5}
              data-bs-parent={`#${accordion.parent}`}
            >
              <div className="accordion-body pt-3">
                {[2, 5].map((yr) => {
                  const expId = withPrefix(`exp-${yr}`);
                  return (
                    <div
                      className="d-flex align-items-center justify-content-between mb-2"
                      key={`exp-${yr}`}
                    >
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={expId}
                          name="experience"
                          aria-label={tg('filters.years_plus', { count: yr })}
                          checked={filters.selectedExperience.includes(yr)}
                          onChange={() => toggleArrayFilter('selectedExperience', yr)}
                        />
                        <label className="form-check-label" htmlFor={expId}>
                          {tg('filters.years_plus', { count: yr })}
                        </label>
                      </div>
                    </div>
                  );
                })}

                {showMoreExperience &&
                  [7, 10].map((yr) => {
                    const expId = withPrefix(`exp-more-${yr}`);
                    return (
                      <div
                        className="d-flex align-items-center justify-content-between mb-2"
                        key={`exp-more-${yr}`}
                      >
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={expId}
                            name="experience"
                            aria-label={tg('filters.years_plus', { count: yr })}
                            checked={filters.selectedExperience.includes(yr)}
                            onChange={() => toggleArrayFilter('selectedExperience', yr)}
                          />
                          <label className="form-check-label" htmlFor={expId}>
                            {tg('filters.years_plus', { count: yr })}
                          </label>
                        </div>
                      </div>
                    );
                  })}

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
            <div className="accordion-header" id={accordion.heading7}>
              <div
                className="accordion-button"
                data-bs-toggle="collapse"
                data-bs-target={`#${accordion.collapse7}`}
                aria-controls={accordion.collapse7}
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
              id={accordion.collapse7}
              className="accordion-collapse show"
              aria-labelledby={accordion.heading7}
              data-bs-parent={`#${accordion.parent}`}
            >
              <div className="accordion-body pt-3">
                {channels.map((id, idx) => {
                  const labelMap: Record<string, string> = {
                    Home: tg('channels.home'),
                    video: tg('channels.video'),
                    chat: tg('channels.chat'),
                    clinic: tg('card.clinic_visit'),
                  };
                  const label = labelMap[id] || id;
                  const channelId = withPrefix(`channel-${sanitizeForId(id)}-${idx}`);
                  return (
                    <div
                      className="d-flex align-items-center justify-content-between mb-2"
                      key={`${id}-${idx}`}
                    >
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={channelId}
                          name="channel"
                          aria-label={label}
                          checked={filters.selectedChannels.includes(id)}
                          onChange={() => toggleArrayFilter('selectedChannels', id)}
                        />
                        <label className="form-check-label" htmlFor={channelId}>
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
            <div className="accordion-header" id={accordion.heading8}>
              <div
                className="accordion-button"
                data-bs-toggle="collapse"
                data-bs-target={`#${accordion.collapse8}`}
                aria-controls={accordion.collapse8}
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
              id={accordion.collapse8}
              className="accordion-collapse show"
              aria-labelledby={accordion.heading8}
              data-bs-parent={`#${accordion.parent}`}
            >
              <div className="accordion-body pt-3">
                {languages.map((lang, i) => {
                  const langId = withPrefix(`lang-${sanitizeForId(lang)}-${i}`);
                  return (
                    <div
                      className="d-flex align-items-center justify-content-between mb-2"
                      key={`lang-${i}`}
                    >
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={langId}
                          name="language"
                          aria-label={lang}
                          checked={filters.selectedLanguages.includes(lang)}
                          onChange={() => toggleArrayFilter('selectedLanguages', lang)}
                        />
                        <label className="form-check-label" htmlFor={langId}>
                          {lang}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rating Filter */}
          <div className="accordion-item">
            <div className="accordion-header" id={accordion.heading9}>
              <div
                className="accordion-button"
                data-bs-toggle="collapse"
                data-bs-target={`#${accordion.collapse9}`}
                aria-controls={accordion.collapse9}
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
              id={accordion.collapse9}
              className="accordion-collapse show"
              aria-labelledby={accordion.heading9}
              data-bs-parent={`#${accordion.parent}`}
            >
              <div className="accordion-body pt-3">
                {ratingOptions.map((r) => {
                  const ratingId = withPrefix(`rating-${r}`);
                  return (
                    <div
                      className="d-flex align-items-center justify-content-between mb-2"
                      key={`rating-${r}`}
                    >
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={ratingId}
                          name="rating"
                          aria-label={tg('filters.stars_up', { count: r })}
                          checked={filters.selectedRatings.includes(r)}
                          onChange={() => toggleArrayFilter('selectedRatings', r)}
                        />
                        <label className="form-check-label" htmlFor={ratingId}>
                          <span>
                            {Array.from({ length: r }).map((_, i) => (
                              <i key={i} className="fa-solid fa-star text-orange me-1" />
                            ))}
                          </span>
                          {` ${tg('filters.stars_up', { count: r })}`}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

  export default FilterSidebar;
