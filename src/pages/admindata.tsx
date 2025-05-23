// src/pages/admindata.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Search, Filter, User, Calendar, MapPin, LogOut, Eye, BarChart3, Users, Activity, Image, Grid, List } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [shopVisits, setShopVisits] = useState([]);
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('employees');
  const [dateFilter, setDateFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [galleryView, setGalleryView] = useState('grid');
  const { showToast } = useToast();
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logged out successfully', 'success');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Error logging out', 'error');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching admin dashboard data...");
      
      // Fetch all employees
      const { data: employeeData, error: employeeError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeeError) throw employeeError;
      console.log(`Fetched ${employeeData?.length || 0} employees`);
      setEmployees(employeeData || []);

      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Enrich attendance data with user names
      const enrichedAttendance = attendanceData?.map(record => {
        const user = employeeData?.find(emp => emp.id === record.user_id);
        
        let displayName = 'Unknown User';
        let displayEmail = 'No email';
        
        if (user) {
          if (user.username && user.username.trim()) {
            displayName = user.username;
          } else if (user.email && user.email.trim()) {
            displayName = user.email;
          } else if (user.full_name && user.full_name.trim()) {
            displayName = user.full_name;
          }
          
          displayEmail = user.email || 'No email';
        }
        
        return {
          ...record,
          user_name: displayName,
          user_email: displayEmail
        };
      }) || [];

      console.log(`Fetched ${enrichedAttendance.length} attendance records`);
      setAttendanceRecords(enrichedAttendance);

      // Fetch shop visits
      const { data: visitData, error: visitError } = await supabase
        .from('shop_visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (visitError) throw visitError;

      const enrichedVisits = visitData?.map(visit => {
        const user = employeeData?.find(emp => emp.id === visit.user_id);
        
        let displayName = 'Unknown User';
        let displayEmail = 'No email';
        
        if (user) {
          if (user.username && user.username.trim()) {
            displayName = user.username;
          } else if (user.email && user.email.trim()) {
            displayName = user.email;
          } else if (user.full_name && user.full_name.trim()) {
            displayName = user.full_name;
          }
          
          displayEmail = user.email || 'No email';
        }
        
        return {
          ...visit,
          user_name: displayName,
          user_email: displayEmail
        };
      }) || [];

      console.log(`Fetched ${enrichedVisits.length} shop visits`);
      setShopVisits(enrichedVisits);

      // Create photo gallery data
      const photos = [];
      
      // Add attendance photos
      enrichedAttendance.forEach(record => {
        if (record.photo_url && record.photo_url.trim()) {
          photos.push({
            id: `attendance_${record.id}`,
            url: record.photo_url,
            type: 'attendance',
            employee_name: record.user_name,
            employee_email: record.user_email,
            date: record.created_at,
            title: `${record.type === 'check_in' ? 'Check In' : 'Check Out'} Photo`,
            description: `${record.user_name} - ${record.type === 'check_in' ? 'Check In' : 'Check Out'}`,
            location: record.location,
            notes: record.notes
          });
        }
      });
      
      // Add shop visit photos
      enrichedVisits.forEach(visit => {
        if (visit.photos && visit.photos.length > 0) {
          visit.photos.forEach((photo, index) => {
            photos.push({
              id: `shop_${visit.id}_${index}`,
              url: photo,
              type: 'shop_visit',
              employee_name: visit.user_name,
              employee_email: visit.user_email,
              date: visit.created_at,
              title: `${visit.shop_name} - Photo ${index + 1}`,
              description: `${visit.user_name} visited ${visit.shop_name}`,
              location: visit.location,
              notes: visit.notes,
              shop_name: visit.shop_name
            });
          });
        }
      });
      
      // Sort photos by date (newest first)
      photos.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllPhotos(photos);

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filterByDate = (records) => {
    if (dateFilter === 'all') return records;
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    
    if (dateFilter === 'today') {
      return records.filter(record => {
        const recordDate = new Date(record.created_at || record.date);
        return recordDate >= startOfDay;
      });
    }
    
    if (dateFilter === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return records.filter(record => {
        const recordDate = new Date(record.created_at || record.date);
        return recordDate >= startOfWeek;
      });
    }
    
    if (dateFilter === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return records.filter(record => {
        const recordDate = new Date(record.created_at || record.date);
        return recordDate >= startOfMonth;
      });
    }
    
    return records;
  };

  const exportAllDataAsCSV = () => {
    if (employees.length === 0 && attendanceRecords.length === 0 && shopVisits.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    const csvRows = [];
    
    csvRows.push('BEZTERN EMPLOYEE MANAGEMENT SYSTEM - COMPLETE REPORT');
    csvRows.push(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`);
    csvRows.push('');
    
    if (employees.length > 0) {
      csvRows.push('=== EMPLOYEES DATA ===');
      csvRows.push('Full Name,Email,Phone,Username,Role,Status,Joined Date');
      
      employees.forEach(employee => {
        const row = [
          employee.full_name || 'N/A',
          employee.email || 'N/A',
          employee.phone || 'N/A',
          employee.username || 'N/A',
          employee.role || 'user',
          employee.active !== false ? 'Active' : 'Inactive',
          employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'
        ];
        csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      });
      
      csvRows.push('');
    }
    
    if (attendanceRecords.length > 0) {
      csvRows.push('=== ATTENDANCE RECORDS ===');
      csvRows.push('Employee Name,Employee Email,Date,Time,Type,Location,Notes');
      
      attendanceRecords.forEach(record => {
        const row = [
          record.user_name || 'Unknown',
          record.user_email || 'N/A',
          record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
          record.created_at ? new Date(record.created_at).toLocaleTimeString() : 'N/A',
          record.type === 'check_in' ? 'Check In' : 'Check Out',
          record.location || 'No location',
          record.notes || 'No notes'
        ];
        csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      });
      
      csvRows.push('');
    }
    
    if (shopVisits.length > 0) {
      csvRows.push('=== SHOP VISITS ===');
      csvRows.push('Employee Name,Employee Email,Shop Name,Visit Date,Visit Time,Location,Notes');
      
      shopVisits.forEach(visit => {
        const row = [
          visit.user_name || 'Unknown',
          visit.user_email || 'N/A',
          visit.shop_name || 'N/A',
          visit.created_at ? new Date(visit.created_at).toLocaleDateString() : 'N/A',
          visit.created_at ? new Date(visit.created_at).toLocaleTimeString() : 'N/A',
          visit.location || 'No location',
          visit.notes || 'No notes'
        ];
        csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      });
    }
    
    csvRows.push('');
    csvRows.push('=== SUMMARY ===');
    csvRows.push(`Total Employees: ${employees.length}`);
    csvRows.push(`Total Attendance Records: ${attendanceRecords.length}`);
    csvRows.push(`Total Shop Visits: ${shopVisits.length}`);
    csvRows.push(`Total Photos: ${allPhotos.length}`);
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Beztern_Complete_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Complete report downloaded successfully', 'success');
  };

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    
    const headers = Object.keys(data[0] || {}).filter(key => typeof data[0][key] !== 'object');
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`${filename} downloaded successfully`, 'success');
  };

  // Enhanced photo modal function
  const openPhotoModal = (photo) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      cursor: pointer;
      backdrop-filter: blur(5px);
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      max-width: 90%;
      max-height: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    const img = document.createElement('img');
    img.src = photo.url;
    img.style.cssText = `
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
      transition: transform 0.3s ease;
    `;
    
    const info = document.createElement('div');
    info.style.cssText = `
      margin-top: 20px;
      background: rgba(255,255,255,0.95);
      color: #1f2937;
      padding: 20px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      max-width: 400px;
    `;
    
    const typeIcon = photo.type === 'attendance' ? '📅' : '🏪';
    const typeColor = photo.type === 'attendance' ? '#10b981' : '#8b5cf6';
    
    info.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
        <span style="font-size: 24px; margin-right: 8px;">${typeIcon}</span>
        <span style="background: ${typeColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          ${photo.type === 'attendance' ? 'Attendance' : 'Shop Visit'}
        </span>
      </div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #111827;">${photo.title}</div>
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">${photo.description}</div>
      <div style="font-size: 13px; color: #374151; margin-bottom: 8px;">
        <strong>📧 ${photo.employee_email}</strong>
      </div>
      <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">
        📅 ${photo.date ? new Date(photo.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'N/A'} at ${photo.date ? new Date(photo.date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A'}
      </div>
      ${photo.location ? `<div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">📍 ${photo.location}</div>` : ''}
      ${photo.shop_name ? `<div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">🏪 ${photo.shop_name}</div>` : ''}
      <div style="font-size: 11px; color: #d1d5db; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
        Click anywhere to close • Press ESC to exit
      </div>
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255,255,255,0.9);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 24px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: #374151;
    `;
    
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.9)';
      closeBtn.style.color = 'white';
      closeBtn.style.transform = 'scale(1.1)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(255,255,255,0.9)';
      closeBtn.style.color = '#374151';
      closeBtn.style.transform = 'scale(1)';
    };
    
    container.appendChild(img);
    container.appendChild(info);
    modal.appendChild(container);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    // Add animation
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.transition = 'opacity 0.3s ease';
      modal.style.opacity = '1';
    }, 10);
    
    const closeModal = () => {
      modal.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      }, 300);
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    closeBtn.addEventListener('click', closeModal);
    
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
  };

  // Filter data based on search term
  const filteredEmployees = employees.filter(employee => 
    (employee.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendance = filterByDate(attendanceRecords).filter(record => 
    (record.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVisits = filterByDate(shopVisits).filter(visit => 
    (visit.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (visit.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (visit.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPhotos = filterByDate(allPhotos).filter(photo => 
    (photo.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (photo.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (photo.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const todayAttendance = attendanceRecords.filter(record => {
    const today = new Date().toDateString();
    return new Date(record.created_at).toDateString() === today;
  }).length;

  const activeEmployees = employees.filter(emp => emp.active !== false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-2xl">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    Beztern Admin
                  </h1>
                  <p className="text-blue-200 text-sm">Employee Management System</p>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-4 text-blue-200">
                <span className="text-sm">Welcome back,</span>
                <span className="font-semibold text-white">
                  {userProfile?.username || userProfile?.full_name || 'Admin'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchData()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 flex items-center space-x-2 backdrop-blur-sm"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl z-10 border border-gray-100 overflow-hidden">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          exportAllDataAsCSV();
                          setShowExportMenu(false);
                        }}
                        className="block w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-left transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">📊</span>
                          <div>
                            <div className="font-medium">Complete Report</div>
                            <div className="text-xs text-gray-500">All data in one file</div>
                          </div>
                        </div>
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          if (activeTab === 'employees') downloadCSV(employees, 'employees.csv');
                          if (activeTab === 'attendance') downloadCSV(attendanceRecords, 'attendance.csv');
                          if (activeTab === 'visits') downloadCSV(shopVisits, 'shop_visits.csv');
                          if (activeTab === 'photos') downloadCSV(allPhotos, 'photos_gallery.csv');
                          setShowExportMenu(false);
                        }}
                        className="block w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-left transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">📋</span>
                          <div>
                            <div className="font-medium">Current Tab</div>
                            <div className="text-xs text-gray-500">Active tab data only</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold">{employees.length}</p>
                <p className="text-blue-200 text-xs mt-1">{activeEmployees} active</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Today's Attendance</p>
                <p className="text-3xl font-bold">{todayAttendance}</p>
                <p className="text-emerald-200 text-xs mt-1">check-ins recorded</p>
              </div>
              <Calendar className="h-12 w-12 text-emerald-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Attendance</p>
                <p className="text-3xl font-bold">{attendanceRecords.length}</p>
                <p className="text-purple-200 text-xs mt-1">all time records</p>
              </div>
              <Activity className="h-12 w-12 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Shop Visits</p>
                <p className="text-3xl font-bold">{shopVisits.length}</p>
                <p className="text-orange-200 text-xs mt-1">total visits</p>
              </div>
              <MapPin className="h-12 w-12 text-orange-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium">Total Photos</p>
                <p className="text-3xl font-bold">{allPhotos.length}</p>
                <p className="text-pink-200 text-xs mt-1">in gallery</p>
              </div>
              <Image className="h-12 w-12 text-pink-200" />
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter */}
        <div className="bg-white rounded-2xl p-6 shadow-xl mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search employees, locations, or activities..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700 font-medium">Filter by date:</span>
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 font-medium"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
              
              {activeTab === 'photos' && (
                <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setGalleryView('grid')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      galleryView === 'grid' 
                        ? 'bg-white shadow-sm text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGalleryView('list')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      galleryView === 'list' 
                        ? 'bg-white shadow-sm text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="border-b border-gray-100">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('employees')}
                className={`flex items-center py-4 px-6 font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'employees'
                    ? 'border-b-3 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="h-5 w-5 mr-3" />
                <span>Employees</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                  {filteredEmployees.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex items-center py-4 px-6 font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'attendance'
                    ? 'border-b-3 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-5 w-5 mr-3" />
                <span>Attendance</span>
                <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-semibold">
                  {filteredAttendance.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`flex items-center py-4 px-6 font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'visits'
                    ? 'border-b-3 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MapPin className="h-5 w-5 mr-3" />
                <span>Shop Visits</span>
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">
                  {filteredVisits.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('photos')}
                className={`flex items-center py-4 px-6 font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'photos'
                    ? 'border-b-3 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Image className="h-5 w-5 mr-3" />
                <span>Photo Gallery</span>
                <span className="ml-2 px-2 py-1 bg-pink-100 text-pink-600 rounded-full text-xs font-semibold">
                  {filteredPhotos.length}
                </span>
              </button>
            </div>
          </div>

          {/* Enhanced Table Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <p className="ml-4 text-gray-600 font-medium">Loading dashboard data...</p>
              </div>
            ) : (
              <>
                {/* Employee List Tab */}
                {activeTab === 'employees' && (
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Contact Information
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Role & Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Joined Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((employee, index) => (
                          <tr key={employee.id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  {employee.avatar_url ? (
                                    <img
                                      className="h-12 w-12 rounded-xl object-cover ring-2 ring-blue-100"
                                      src={employee.avatar_url}
                                      alt={employee.username || employee.full_name}
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-blue-100">
                                      <span className="text-white font-bold text-lg">
                                        {(employee.username || employee.full_name || employee.email || 'NA').substring(0, 2).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {employee.username || employee.email || employee.full_name || 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {employee.full_name || 'No full name provided'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 font-medium">{employee.email}</div>
                              <div className="text-sm text-gray-500">{employee.phone || 'No phone number'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col space-y-2">
                                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                                  {employee.role || 'user'}
                                </span>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                  employee.active !== false 
                                    ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800' 
                                    : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                                }`}>
                                  {employee.active !== false ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                              {employee.created_at ? new Date(employee.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'N/A'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <Users className="h-12 w-12 text-gray-300 mb-4" />
                              <p className="text-gray-500 font-medium">No employees found</p>
                              <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* Attendance Records Tab */}
                {activeTab === 'attendance' && (
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Photo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAttendance.length > 0 ? (
                        filteredAttendance.map((record, index) => (
                          <tr key={record.id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {record.user_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {record.user_email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  }) : 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {record.created_at ? new Date(record.created_at).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                record.type === 'check_in' 
                                  ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800' 
                                  : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                              }`}>
                                {record.type === 'check_in' ? '✓ Check In' : '✗ Check Out'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 font-medium">
                                {record.location || 'No location'}
                              </div>
                              {record.coordinates && (
                                <div className="text-xs text-gray-400 mt-1">
                                  📍 {record.coordinates.latitude?.toFixed(4)}, {record.coordinates.longitude?.toFixed(4)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {record.photo_url && record.photo_url.trim() ? (
                                <div className="group relative">
                                  <img 
                                    src={record.photo_url}
                                    alt="Attendance Photo" 
                                    className="h-20 w-20 object-cover rounded-xl cursor-pointer border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                                    onClick={() => openPhotoModal({
                                      id: `attendance_${record.id}`,
                                      url: record.photo_url,
                                      type: 'attendance',
                                      employee_name: record.user_name,
                                      employee_email: record.user_email,
                                      date: record.created_at,
                                      title: `${record.type === 'check_in' ? 'Check In' : 'Check Out'} Photo`,
                                      description: `${record.user_name} - ${record.type === 'check_in' ? 'Check In' : 'Check Out'}`,
                                      location: record.location,
                                      notes: record.notes
                                    })}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-xl transition-all duration-200 flex items-center justify-center">
                                    <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-20 w-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300">
                                  <span className="text-gray-400 text-xs text-center">
                                    📷<br/>No photo
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                              <p className="text-gray-500 font-medium">No attendance records found</p>
                              <p className="text-gray-400 text-sm">Try adjusting your search or date filter</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* Shop Visits Tab */}
                {activeTab === 'visits' && (
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Shop Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Notes
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Photos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVisits.length > 0 ? (
                        filteredVisits.map((visit, index) => (
                          <tr key={visit.id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {visit.user_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {visit.user_email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {visit.shop_name || 'No shop name'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  📍 {visit.location || 'No location'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {visit.created_at ? new Date(visit.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  }) : 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {visit.created_at ? new Date(visit.created_at).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs">
                                <p className="line-clamp-2">{visit.notes || 'No additional notes'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {visit.photos && visit.photos.length > 0 ? (
                                <div className="flex space-x-2 flex-wrap">
                                  {visit.photos.slice(0, 3).map((photo, photoIndex) => (
                                    <div key={photoIndex} className="group relative">
                                      <img 
                                        src={photo}
                                        alt={`Visit ${photoIndex + 1}`} 
                                        className="h-20 w-20 object-cover rounded-xl cursor-pointer border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                                        onClick={() => openPhotoModal({
                                          id: `shop_${visit.id}_${photoIndex}`,
                                          url: photo,
                                          type: 'shop_visit',
                                          employee_name: visit.user_name,
                                          employee_email: visit.user_email,
                                          date: visit.created_at,
                                          title: `${visit.shop_name} - Photo ${photoIndex + 1}`,
                                          description: `${visit.user_name} visited ${visit.shop_name}`,
                                          location: visit.location,
                                          notes: visit.notes,
                                          shop_name: visit.shop_name
                                        })}
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-xl transition-all duration-200 flex items-center justify-center">
                                        <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5" />
                                      </div>
                                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                        {photoIndex + 1}
                                      </div>
                                    </div>
                                  ))}
                                  {visit.photos.length > 3 && (
                                    <div className="h-20 w-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                                      <span className="text-gray-500 text-xs text-center font-medium">
                                        +{visit.photos.length - 3}<br/>more
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-20 w-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300">
                                  <span className="text-gray-400 text-xs text-center">
                                    📷<br/>No photos
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <MapPin className="h-12 w-12 text-gray-300 mb-4" />
                              <p className="text-gray-500 font-medium">No shop visits found</p>
                              <p className="text-gray-400 text-sm">Try adjusting your search or date filter</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* Photo Gallery Tab */}
                {activeTab === 'photos' && (
                  <div className="p-6">
                    {filteredPhotos.length > 0 ? (
                      <>
                        {galleryView === 'grid' ? (
                          // Grid View - Like Mobile Gallery
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                                onClick={() => openPhotoModal(photo)}
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.title}
                                  className="w-full h-full object-cover transition-all duration-200 group-hover:brightness-110"
                                />
                                
                                {/* Overlay with info */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <div className="text-white text-xs font-semibold truncate">
                                      {photo.employee_name}
                                    </div>
                                    <div className="text-white/80 text-xs truncate">
                                      {photo.type === 'attendance' ? '📅 Attendance' : '🏪 Shop Visit'}
                                    </div>
                                    <div className="text-white/60 text-xs">
                                      {photo.date ? new Date(photo.date).toLocaleDateString() : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Type badge */}
                                <div className="absolute top-2 right-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${
                                    photo.type === 'attendance' 
                                      ? 'bg-emerald-500' 
                                      : 'bg-purple-500'
                                  }`}>
                                    {photo.type === 'attendance' ? '📅' : '🏪'}
                                  </span>
                                </div>
                                
                                                                {/* View icon */}
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                                    <Eye className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // List View - Detailed View
                          <div className="space-y-4">
                            {filteredPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                                onClick={() => openPhotoModal(photo)}
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    <img
                                      src={photo.url}
                                      alt={photo.title}
                                      className="w-20 h-20 object-cover rounded-lg border-2 border-gray-100"
                                    />
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${
                                        photo.type === 'attendance' 
                                          ? 'bg-emerald-500' 
                                          : 'bg-purple-500'
                                      }`}>
                                        {photo.type === 'attendance' ? '📅 Attendance' : '🏪 Shop Visit'}
                                      </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                                      {photo.title}
                                    </h3>
                                    
                                    <p className="text-sm text-gray-600 mb-2">
                                      {photo.description}
                                    </p>
                                    
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <span>👤 {photo.employee_name}</span>
                                      <span>📧 {photo.employee_email}</span>
                                      <span>📅 {photo.date ? new Date(photo.date).toLocaleDateString() : 'N/A'}</span>
                                      {photo.location && <span>📍 {photo.location}</span>}
                                    </div>
                                  </div>
                                  
                                  <div className="flex-shrink-0">
                                    <Eye className="h-5 w-5 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64">
                        <Image className="h-16 w-16 text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium text-lg">No photos found</p>
                        <p className="text-gray-400 text-sm">Photos from attendance and shop visits will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
