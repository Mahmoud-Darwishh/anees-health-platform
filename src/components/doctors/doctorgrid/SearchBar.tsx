'use client';

import React from 'react';
import type { FilterState } from './types';

type MessageValues = Record<string, string | number>;

interface SearchBarProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onSearch: () => void;
  tg: (key: string, values?: MessageValues) => string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  filters,
  onFilterChange,
  onSearch,
  tg,
}) => {
  return (
    <div className="breadcrumb-bar">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-12 col-12">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="page-breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/">{tg('breadcrumb.home')}</a>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  {tg('breadcrumb.doctor')}
                </li>
              </ol>
            </nav>
            <h2 className="breadcrumb-title">{tg('title')}</h2>

            <div className="search-box-banner">
              <form role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearch();
                }}
              >
                <div className="search-input search-line">
                  <i className="isax isax-search-normal-15" />
                  <div className="mb-0">
                    <input
                      type="text"
                      className="form-control doctor-search-input"
                      placeholder={tg('search.namePlaceholder')}
                      aria-label={tg('search.namePlaceholder')}
                      value={filters.searchText}
                      onChange={(e) =>
                        onFilterChange({ searchText: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="search-input search-map-line">
                  <i className="isax isax-location" />
                  <div className="mb-0">
                    <input
                      type="text"
                      className="form-control doctor-search-input"
                      placeholder={tg('search.locationPlaceholder')}
                      aria-label={tg('search.locationPlaceholder')}
                      value={filters.locationText}
                      onChange={(e) =>
                        onFilterChange({ locationText: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-search-btn">
                  <button
                    className="btn btn-primary d-inline-flex align-items-center rounded-pill"
                    type="submit"
                    aria-label={tg('search.cta')}
                  >
                    <i className="isax isax-search-normal-15 me-2" />
                    {tg('search.cta')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="breadcrumb-bg">
          <img
            src="/assets/img/bg/breadcrumb-icon.png"
            alt="img"
            className="breadcrumb-bg-03"
          />
          <img
            src="/assets/img/bg/breadcrumb-icon.png"
            alt="img"
            className="breadcrumb-bg-04"
          />
        </div>
      </div>
    </div>
  );
};

