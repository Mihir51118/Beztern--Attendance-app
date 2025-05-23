# Beztern Employee Management System

A secure internal web application for managing employee attendance and shop visits.

## Features

- Secure login system with authentication
- Employee attendance tracking with live camera and GPS
- Shop visit verification with photo and location capture
- AES encryption for all sensitive data
- Excel export functionality
- Responsive design for all devices

## Technology Stack

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Security: CryptoJS for AES encryption, JWT for authentication
- Other: ExcelJS for Excel generation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- macOS Catalina or later
- VS Code

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

This will start both the frontend and backend servers concurrently.

## Security Notes

- All sensitive data is encrypted using AES encryption
- The encryption key is defined in `src/utils/constants.ts` (for demo purposes only)
- In a production environment, this key should be securely stored in environment variables
- Images are captured directly from the camera, no uploads are allowed

## Testing

For testing purposes, use the following credentials:

- Username: `admin`, Password: `password123` (Admin role)
- Username: `employee`, Password: `password123` (Employee role)

## Using the Application

1. Login with your credentials
2. Navigate to the Employee Attendance page to submit attendance:
   - Take a photo with your company bike
   - Capture your current GPS location
   - Enter the bike kilometer reading
3. Navigate to Shop Visit Verification to submit shop visits:
   - Take a photo of the shop
   - Capture your current GPS location
   - Enter shop owner details
   - Answer whether the visit was successful
4. Once submitted, an Excel report will be generated with the collected data

## License

Proprietary - All rights reserved