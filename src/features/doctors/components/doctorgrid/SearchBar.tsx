'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
                  <Link href="/">{tg('breadcrumb.home')}</Link>
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
                      id="doctor-search-name"
                      name="searchText"
                      type="text"
                      className="form-control doctor-search-input"
                      placeholder={tg('search.namePlaceholder')}
                      aria-label={tg('search.namePlaceholder')}
                      autoComplete="off"
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
                      id="doctor-search-location"
                      name="locationText"
                      type="text"
                      className="form-control doctor-search-input"
                      placeholder={tg('search.locationPlaceholder')}
                      aria-label={tg('search.locationPlaceholder')}
                      autoComplete="off"
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
          <Image
            src="/assets/img/bg/breadcrumb-icon.png"
            alt="img"
            className="breadcrumb-bg-03"
            width={100}
            height={100}
          />
          <Image
            src="/assets/img/bg/breadcrumb-icon.png"
            alt="img"
            className="breadcrumb-bg-04"            width={100}
            height={100}          />
        </div>
      </div>
    </div>
  );
};

