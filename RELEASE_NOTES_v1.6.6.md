# Release v1.6.6

## 🎉 New Features

### User Access Control System
- **Role-based tool visibility**: Implemented a user permission system that restricts certain Monitor tools (Rate Trends, Access Log, Workouts) to authorized users only
  - Tools are automatically hidden for non-authorized users
  - Smart tool ordering: Public tools are displayed first, followed by restricted tools for better user experience
  - Multiple detection methods ensure real-time permission updates

### Auto-load Data Files
- **Monitor-Rate-Trends**: Automatically loads `Monitor-Rate-Trends.xlsx` on page initialization
  - Gracefully falls back to manual file selection if the file is unavailable
  - Handles CORS errors and network issues seamlessly

- **Monitor-Workouts**: Automatically loads `Monitor-Workouts.csv` on page initialization
  - Gracefully falls back to manual file selection if the file is unavailable
  - Handles CORS errors and network issues seamlessly

### Enhanced Access Log Tool
- **Interactive hover tooltips**: 
  - **User ranking rows**: Hover over any user row to see their last 10 page visits with timestamps
  - **Page ranking rows**: Hover over any page row to see the page's last 10 visitors with timestamps
  - Optimized single-line layout for better readability and reduced vertical space

## 🐛 Bug Fixes

### Week Number Calculation
- **Fixed week number display in Monitor-Sailing-Schedule**: Corrected the week calculation logic to match the definition used in 001-04 and 365-04 tools
  - Now correctly displays **Week 52** for date range 12/21~12/27 (previously incorrectly showed Week 51)
  - Uses consistent "Sunday to Saturday" week calculation method across all tools
  - Integrated with `vendor/market-analysis-utils.js` for unified week calculation

## ⚙️ Configuration Updates

- **Updated `Data/index.json`**: Added configuration entries for:
  - `Monitor-Rate-Trends.xlsx`
  - `Monitor-Workouts.csv`

- **Updated `.gitignore`**: Added exceptions to allow tracking of:
  - `Data/Monitor-Rate-Trends.xlsx`
  - `Data/Monitor-Workouts.csv`

## 🔧 Technical Improvements

- Improved error handling for file auto-loading with proper fallback mechanisms
- Enhanced user permission checking with multiple detection methods:
  - localStorage monitoring
  - Storage event listeners (cross-tab detection)
  - MutationObserver for DOM changes
  - Periodic checks for real-time updates
- Better code organization and consistency across Monitor tools
- Unified week calculation logic across all schedule-related tools

## 📝 Notes

- All data files are stored locally and processed in the browser
- User access control is based on verified user information (name, email, phone)
- Auto-loading works seamlessly in web environments, with graceful degradation for local file systems
