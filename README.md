# College Grievance Cell Application

A simple mobile and web-based Centralized Grievance Cell app for colleges. This application allows students, faculty, and staff to submit grievances online and track their status.

## Features

- User registration and authentication
- Role-based access (Student, Staff, Admin)
- Grievance submission with file attachments
- Status tracking and updates
- Admin dashboard for managing grievances
- Real-time updates using Firebase
- Mobile-responsive design

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Firebase Configuration**
   - Create a new Firebase project at https://console.firebase.google.com/
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage
   - Copy your Firebase configuration from Project Settings
   - Update the configuration in `src/services/firebase.ts`

3. **Run the Application**
   ```bash
   npm start
   ```

4. **Create an Admin User**
   - Register a new user through the application
   - In Firebase Console, go to Firestore
   - Find the user document in the 'users' collection
   - Manually change the 'role' field to 'admin'

## Technologies Used

- React with TypeScript
- Material-UI for styling
- Firebase (Authentication, Firestore, Storage)
- React Router for navigation

## Project Structure

```
src/
  ├── components/    # Reusable components
  ├── pages/        # Page components
  ├── services/     # Firebase and other services
  ├── types.ts      # TypeScript interfaces
  ├── App.tsx       # Main application component
  └── index.tsx     # Application entry point
```

## Environment Variables

Create a `.env` file in the root directory with your Firebase configuration:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## License

MIT