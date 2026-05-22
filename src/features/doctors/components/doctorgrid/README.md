# Doctor Grid Component Structure

This directory contains a modular, clean implementation of the doctor grid listing page.

## Files Overview

### Core Components

- **doctors-grid.tsx** - Main component that orchestrates the entire doctor grid page
- **DoctorCard.tsx** - Individual doctor card component
- **SearchBar.tsx** - Search form and sort controls
- **Pagination.tsx** - Pagination controls

### Utilities & Logic

- **types.ts** - TypeScript type definitions
- **utils.ts** - Helper functions (normalization, array operations)
- **filterSort.ts** - Client-side filtering and sorting logic

### Data

- **doctors.en.json** - English doctor data
- **doctors.ar.json** - Arabic doctor data

## Features

✅ **Client-side filtering** - Search by name, speciality, language, consultation type
✅ **Client-side sorting** - Sort by price, rating, experience, or relevance
✅ **Pagination** - 12 doctors per page with navigation controls
✅ **Bilingual** - Full support for English and Arabic
✅ **RTL/LTR** - Proper layout direction handling
✅ **TypeScript** - Fully typed with no `any` casts
✅ **Modular** - Clean separation of concerns
✅ **Performant** - Memoized filtering and sorting

## Component Hierarchy

```
DoctorGrid (main)
├── Header
├── Breadcrumb
├── SearchBar (filters + clear button)
├── SortControls (results count + sort dropdown)
├── DoctorCard[] (grid of doctors)
├── Pagination
└── Footer
```

## How It Works

1. **Data Loading** - JSON data is loaded based on locale (ar/en)
2. **Filtering** - Client-side filtering via `filterDoctors()` function
3. **Sorting** - Client-side sorting via `sortDoctors()` function
4. **Pagination** - Slices filtered results into pages
5. **Rendering** - Maps over paged results and renders DoctorCard components

## Benefits of This Structure

- **Easy to maintain** - Each component has a single responsibility
- **Easy to test** - Pure functions for filtering/sorting
- **Easy to extend** - Add new filters or sorts without touching UI
- **Type-safe** - Full TypeScript coverage
- **Reusable** - Components can be used elsewhere
- **Clean** - No JSX/logic mixing, clear data flow
