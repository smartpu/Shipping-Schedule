# Release v1.6.6

## Features

### User Access Control
- **Added role-based tool visibility**: Implemented user permission system to restrict certain Monitor tools (Rate Trends, Access Log, Workouts) to specific authorized users only
- **Smart tool ordering**: Reorganized Monitor tools section to display public tools first, followed by restricted tools for better UX

### Auto-load Data Files
- **Monitor-Rate-Trends**: Added automatic loading of `Monitor-Rate-Trends.xlsx` on page load, with fallback to manual selection if file is unavailable
- **Monitor-Workouts**: Added automatic loading of `Monitor-Workouts.csv` on page load, with fallback to manual selection if file is unavailable
- Both tools gracefully handle CORS errors and missing files

### Enhanced User Experience
- **Monitor-Access-Log hover tooltips**: 
  - Added hover effects on user ranking rows to display the user's last 10 page visits with timestamps
  - Added hover effects on page ranking rows to display the page's last 10 visitors with timestamps
  - Optimized tooltip layout to show one record per line for better readability

## Bug Fixes

### Week Number Calculation
- **Fixed week number display in Monitor-Sailing-Schedule**: Corrected week calculation logic to match the definition used in 001-04 and 365-04 tools
  - Now correctly displays Week 52 for date range 12/21~12/27 (previously showed Week 51)
  - Uses "Sunday to Saturday" week calculation method for consistency across all tools

## Configuration Updates

- **Updated Data/index.json**: Added configuration entries for Monitor-Rate-Trends.xlsx and Monitor-Workouts.csv
- **Updated .gitignore**: Added exceptions to allow Monitor-Rate-Trends.xlsx and Monitor-Workouts.csv to be tracked in Git

## Technical Improvements

- Improved error handling for file auto-loading with proper fallback mechanisms
- Enhanced user permission checking with multiple detection methods (localStorage, storage events, MutationObserver)
- Better code organization and consistency across Monitor tools
