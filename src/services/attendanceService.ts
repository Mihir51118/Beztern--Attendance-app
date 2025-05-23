import axios from 'axios';
import CryptoJS from 'crypto-js';
import { API_URL, ENCRYPTION_KEY } from '../utils/constants';

interface AttendanceData {
  employeeId: string;
  employeeName: string;
  photo: string | null;
  location: { latitude: number; longitude: number } | null;
  kilometers: number;
  timestamp: string;
}

export const submitAttendance = async (data: AttendanceData) => {
  try {
    // Encrypt sensitive data
    const encryptedData = encryptData(data);
    
    // In a real application, this would be sent to the server
    // const response = await axios.post(`${API_URL}/attendance`, encryptedData);
    // return response.data;
    
    // Mock implementation for demo
    console.log('Encrypted attendance data:', encryptedData);
    
    // Store in localStorage for demo purposes (in a real app, this would be in a server database)
    const existingData = localStorage.getItem('infinity_attendance') 
      ? JSON.parse(localStorage.getItem('infinity_attendance') || '[]') 
      : [];
    
    existingData.push(encryptedData);
    localStorage.setItem('infinity_attendance', JSON.stringify(existingData));
    
    return { success: true, message: 'Attendance submitted successfully' };
  } catch (error) {
    console.error('Error submitting attendance:', error);
    throw error;
  }
};

// Function to encrypt data using AES
const encryptData = (data: AttendanceData) => {
  // Convert image to a smaller format for demo purposes
  const scaledPhoto = data.photo ? scaleImageForDemo(data.photo) : null;
  
  const dataToEncrypt = {
    ...data,
    photo: scaledPhoto,
  };
  
  // Ensure data is properly stringified before encryption
  const jsonString = JSON.stringify(dataToEncrypt);
  
  // Convert the string to UTF-8 encoded WordArray
  const wordArray = CryptoJS.enc.Utf8.parse(jsonString);
  
  // Encrypt the data
  const encryptedData = CryptoJS.AES.encrypt(wordArray, ENCRYPTION_KEY).toString();
  
  return {
    encryptedData,
    timestamp: data.timestamp,
    employeeId: data.employeeId,
  };
};

// Function to scale down image for demo purposes
const scaleImageForDemo = (dataUrl: string): string => {
  return dataUrl.substring(0, 100) + '...[truncated for demo]';
};