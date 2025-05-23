import * as CryptoJS from 'crypto-js';
import { API_URL, ENCRYPTION_KEY } from '../utils/constants';
import { generateExcelReport } from '../utils/excelGenerator';

interface ShopVisitData {
  employeeId: string;
  employeeName: string;
  photo: string | null;
  location: { latitude: number; longitude: number } | null;
  ownerName: string;
  ownerEmail: string;
  visitSuccessful: boolean;
  timestamp: string;
}

export const submitShopVisit = async (data: ShopVisitData) => {
  try {
    // Encrypt sensitive data
    const encryptedData = encryptData(data);
    
    // In a real application, this would be sent to the server
    // const response = await axios.post(`${API_URL}/shop-visits`, encryptedData);
    // return response.data;
    
    // Mock implementation for demo
    console.log('Encrypted shop visit data:', encryptedData);
    
    // Store in localStorage for demo purposes (in a real app, this would be in a server database)
    const existingVisits = localStorage.getItem('infinity_shop_visits') 
      ? JSON.parse(localStorage.getItem('infinity_shop_visits') || '[]') 
      : [];
    
    existingVisits.push(encryptedData);
    localStorage.setItem('infinity_shop_visits', JSON.stringify(existingVisits));
    
    // Get attendance data
    const attendanceData = localStorage.getItem('infinity_attendance') 
      ? JSON.parse(localStorage.getItem('infinity_attendance') || '[]') 
      : [];
    
    // Generate Excel report
    generateExcelReport(attendanceData, existingVisits);
    
    return { success: true, message: 'Shop visit submitted successfully' };
  } catch (error) {
    console.error('Error submitting shop visit:', error);
    throw error;
  }
};

// Function to encrypt data using AES
const encryptData = (data: ShopVisitData) => {
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

// Function to decrypt data
export const decryptData = (encryptedData: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
};