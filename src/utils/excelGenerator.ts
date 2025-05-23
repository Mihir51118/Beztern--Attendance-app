import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as CryptoJS from 'crypto-js';
import { ENCRYPTION_KEY } from './constants';

// Function to decrypt data with improved error handling
const decryptData = (encryptedData: string) => {
  try {
    // Decrypt the data
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    
    // Convert to UTF-8 string
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) {
      throw new Error('Decryption resulted in empty string');
    }
    
    // Parse the JSON string
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
};

export const generateExcelReport = async (
  attendanceData: Array<{ encryptedData: string; timestamp: string; employeeId: string }>,
  shopVisitData: Array<{ encryptedData: string; timestamp: string; employeeId: string }>
) => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Beztern System';
  workbook.lastModifiedBy = 'Beztern System';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Create a sheet for employee attendance
  const attendanceSheet = workbook.addWorksheet('Employee Attendance');
  
  // Define columns
  attendanceSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Employee Name', key: 'employeeName', width: 20 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'Bike Kilometers', key: 'kilometers', width: 15 },
    { header: 'Photo Taken', key: 'photoTaken', width: 10 },
  ];
  
  // Add style to header row
  attendanceSheet.getRow(1).font = { bold: true };
  attendanceSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F5F96' }
  };
  attendanceSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  
  // Add data to attendance sheet
  attendanceData.forEach(item => {
    try {
      const decrypted = decryptData(item.encryptedData);
      if (decrypted) {
        const date = new Date(decrypted.timestamp);
        attendanceSheet.addRow({
          date: date.toLocaleDateString(),
          employeeId: decrypted.employeeId,
          employeeName: decrypted.employeeName,
          latitude: decrypted.location ? decrypted.location.latitude : 'N/A',
          longitude: decrypted.location ? decrypted.location.longitude : 'N/A',
          kilometers: decrypted.kilometers,
          photoTaken: decrypted.photo ? 'Yes' : 'No',
        });
      }
    } catch (error) {
      console.error('Error processing attendance data for Excel:', error);
    }
  });
  
  // Create a sheet for shop visits
  const shopVisitSheet = workbook.addWorksheet('Shop Visits');
  
  // Define columns
  shopVisitSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Employee Name', key: 'employeeName', width: 20 },
    { header: 'Shop Owner', key: 'ownerName', width: 20 },
    { header: 'Shop Owner Email', key: 'ownerEmail', width: 25 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'Visit Successful', key: 'visitSuccessful', width: 15 },
    { header: 'Photo Taken', key: 'photoTaken', width: 10 },
  ];
  
  // Add style to header row
  shopVisitSheet.getRow(1).font = { bold: true };
  shopVisitSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F5F96' }
  };
  shopVisitSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  
  // Add data to shop visit sheet
  shopVisitData.forEach(item => {
    try {
      const decrypted = decryptData(item.encryptedData);
      if (decrypted) {
        const date = new Date(decrypted.timestamp);
        shopVisitSheet.addRow({
          date: date.toLocaleDateString(),
          employeeId: decrypted.employeeId,
          employeeName: decrypted.employeeName,
          ownerName: decrypted.ownerName,
          ownerEmail: decrypted.ownerEmail,
          latitude: decrypted.location ? decrypted.location.latitude : 'N/A',
          longitude: decrypted.location ? decrypted.location.longitude : 'N/A',
          visitSuccessful: decrypted.visitSuccessful ? 'Yes' : 'No',
          photoTaken: decrypted.photo ? 'Yes' : 'No',
        });
      }
    } catch (error) {
      console.error('Error processing shop visit data for Excel:', error);
    }
  });
  
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Beztern_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};