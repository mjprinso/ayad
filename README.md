# Angular Blog Dashboard

A modern blog dashboard application built with Angular that supports offline functionality using IndexedDB.

## Tech Stack

- **Frontend Framework**: Angular 17
- **State Management**: RxJS
- **Offline Storage**: IndexedDB
- **UI Components**: Angular Material
- **API Integration**: JSONPlaceholder

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to `http://localhost:4200`

## Offline Capabilities

### Data Storage

The application uses IndexedDB to store data locally, allowing it to work offline. The following data is stored:

- Posts
- Comments
- Users
- Sync Queue

### Offline Features

1. **Post Management**
   - View posts
   - Create new posts
   - Edit existing posts
   - Delete posts
   - Load more posts

2. **Sync Management**
   - Automatic data synchronization when online
   - Sync status indicator in the navbar
   - Conflict resolution for updates

### Sync Process

1. When online:
   - Initial data is fetched from the API
   - Changes are synced with the server
   - Sync status is shown in the navbar

2. When offline:
   - Data is loaded from local storage
   - Changes are queued for sync
   - Sync resumes automatically when online

## Known Limitations

1. **Data Freshness**
   - Offline data may not be up-to-date with the server
   - Manual refresh is required to get latest changes

2. **Conflict Resolution**
   - Last update wins for conflicting changes
   - No manual conflict resolution interface

## Development

### Running Tests

```bash
# Unit tests
npm test

# End-to-end tests
npm e2e
```

### Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
