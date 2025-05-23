// src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Edit, Trash2, RefreshCw, Search, Users, Calendar, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

type TabType = 'users' | 'attendance' | 'visits';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[] | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[] | null>(null);
  const [shopVisits, setShopVisits] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .not('role', 'eq', 'admin');

      if (userError) throw userError;
      setUsers(userData || []);

      // Fetch attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          user:user_id (
            id,
            full_name, 
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendanceData || []);

      // Fetch shop visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('shop_visits')
        .select(`
          *,
          user:user_id (
            id,
            full_name, 
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (visitsError) throw visitsError;
      setShopVisits(visitsData || []);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    let dataToExport: any[] = [];
    let filename = 'data.csv';
    
    if (activeTab === 'users' && users) {
      dataToExport = users;
      filename = 'employees.csv';
    } else if (activeTab === 'attendance' && attendanceRecords) {
      dataToExport = attendanceRecords.map(record => ({
        ...record,
        employee_name: record.user?.full_name,
        employee_email: record.user?.email,
      }));
      filename = 'attendance.csv';
    } else if (activeTab === 'visits' && shopVisits) {
      dataToExport = shopVisits.map(visit => ({
        ...visit,
        employee_name: visit.user?.full_name,
        employee_email: visit.user?.email,
      }));
      filename = 'shop_visits.csv';
    }

    if (dataToExport.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    // Filter out complex objects that can't be serialized to CSV
    const exportableFields = Object.keys(dataToExport[0]).filter(
      key => typeof dataToExport[0][key] !== 'object' || dataToExport[0][key] === null
    );

    const headers = exportableFields.join(',');
    const rows = dataToExport.map(item => 
      exportableFields.map(field => {
        const value = item[field];
        // Handle strings with commas or quotes
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
    
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Data exported successfully', 'success');
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingUser.full_name,
          phone: editingUser.phone,
          username: editingUser.username,
          role: editingUser.role,
          active: editingUser.active,
        })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      showToast('User updated successfully', 'success');
      setEditingUser(null);
      fetchData(); // Refresh data
      
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast('Failed to update user', 'error');
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser({...user});
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;
      
      showToast('User deleted successfully', 'success');
      fetchData(); // Refresh data
      
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('Failed to delete user', 'error');
    }
  };

  const filterData = (data: any[] | null) => {
    if (!data) return [];
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    
    if (activeTab === 'users') {
      return data.filter(user => 
        (user.full_name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.phone || '').toLowerCase().includes(term) ||
        (user.username || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'attendance') {
      return data.filter(record => 
        (record.user?.full_name || '').toLowerCase().includes(term) ||
        (record.user?.email || '').toLowerCase().includes(term) ||
        (record.location || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'visits') {
      return data.filter(visit => 
        (visit.user?.full_name || '').toLowerCase().includes(term) ||
        (visit.user?.email || '').toLowerCase().includes(term) ||
        (visit.shop_name || '').toLowerCase().includes(term) ||
        (visit.location || '').toLowerCase().includes(term)
      );
    }
    
    return data;
  };

  if (loading && !users) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredUsers = filterData(users);
  const filteredAttendance = filterData(attendanceRecords);
  const filteredVisits = filterData(shopVisits);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex space-x-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-80"
            />
          </div>
        </div>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 flex items-center ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5 mr-2" />
              Employees
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-2 flex items-center ${
                activeTab === 'attendance'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Attendance
            </button>
            <button
              onClick={() => setActiveTab('visits')}
              className={`py-2 flex items-center ${
                activeTab === 'visits'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Shop Visits
            </button>
          </nav>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Edit Employee</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingUser.full_name || ''}
                  onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editingUser.role || 'user'}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingUser.active}
                    onChange={(e) => setEditingUser({...editingUser, active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'users' && (
        <>
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-lg font-medium text-gray-500 mb-4">No employees found.</p>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
              >
                <RefreshCw size={16} className="mr-2" /> Refresh Data
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white shadow-md rounded-lg p-5 border border-gray-200 hover:shadow-xl transition"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 rounded-full border overflow-hidden bg-gray-100 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={`${user.full_name || 'User'}'s avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-blue-800">
                          {(user.full_name || 'U').charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{user.full_name || 'Unnamed User'}</h2>
                      <p className="text-gray-600 text-sm">{user.email || 'No email'}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>Username:</strong> {user.username || 'N/A'}</p>
                    <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                    <p><strong>Role:</strong> <span className="text-blue-600 font-medium">{user.role || 'user'}</span></p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    <p><strong>Joined:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => handleEdit(user)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 border rounded hover:bg-gray-100"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 border border-red-400 rounded hover:bg-red-100"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Attendance Records Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {filteredAttendance.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-lg font-medium text-gray-500 mb-4">No attendance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.user?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.user?.email || 'No email'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.created_at ? new Date(record.created_at).toLocaleTimeString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.type === 'check_in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {record.type === 'check_in' ? 'Check In' : 'Check Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.photo_url ? (
                          <a 
                            href={record.photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <img 
                              src={record.photo_url}
                              alt="Attendance" 
                              className="h-12 w-12 object-cover rounded-md cursor-pointer"
                            />
                          </a>
                        ) : (
                          <span className="text-gray-400">No photo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Shop Visits Tab */}
      {activeTab === 'visits' && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {filteredVisits.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-lg font-medium text-gray-500 mb-4">No shop visit records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {visit.user?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {visit.user?.email || 'No email'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {visit.shop_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {visit.created_at ? new Date(visit.created_at).toLocaleTimeString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {visit.location || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {visit.notes || 'No notes'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {visit.photos && visit.photos.length > 0 ? (
                          <div className="flex space-x-2">
                            {visit.photos.map((photo: string, index: number) => (
                              <a 
                                key={index}
                                href={photo} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <img 
                                  src={photo}
                                  alt={`Visit ${index + 1}`} 
                                  className="h-12 w-12 object-cover rounded-md cursor-pointer"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No photos</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Edit, Trash2, RefreshCw, Search, Users, Calendar, ShoppingBag, LogOut } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type TabType = 'users' | 'attendance' | 'visits';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[] | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[] | null>(null);
  const [shopVisits, setShopVisits] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  const { showToast } = useToast();
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

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
      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .not('role', 'eq', 'admin');

      if (userError) throw userError;
      setUsers(userData || []);

      // Fetch attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          user:user_id (
            id,
            full_name, 
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendanceData || []);

      // Fetch shop visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('shop_visits')
        .select(`
          *,
          user:user_id (
            id,
            full_name, 
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (visitsError) throw visitsError;
      setShopVisits(visitsData || []);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    let dataToExport: any[] = [];
    let filename = 'data.csv';
    
    if (activeTab === 'users' && users) {
      dataToExport = users;
      filename = 'employees.csv';
    } else if (activeTab === 'attendance' && attendanceRecords) {
      dataToExport = attendanceRecords.map(record => ({
        ...record,
        employee_name: record.user?.full_name,
        employee_email: record.user?.email,
      }));
      filename = 'attendance.csv';
    } else if (activeTab === 'visits' && shopVisits) {
      dataToExport = shopVisits.map(visit => ({
        ...visit,
        employee_name: visit.user?.full_name,
        employee_email: visit.user?.email,
      }));
      filename = 'shop_visits.csv';
    }

    if (dataToExport.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    // Filter out complex objects that can't be serialized to CSV
    const exportableFields = Object.keys(dataToExport[0]).filter(
      key => typeof dataToExport[0][key] !== 'object' || dataToExport[0][key] === null
    );

    const headers = exportableFields.join(',');
    const rows = dataToExport.map(item => 
      exportableFields.map(field => {
        const value = item[field];
        // Handle strings with commas or quotes
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
    
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Data exported successfully', 'success');
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingUser.full_name,
          phone: editingUser.phone,
          username: editingUser.username,
          role: editingUser.role,
          active: editingUser.active,
        })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      showToast('User updated successfully', 'success');
      setEditingUser(null);
      fetchData(); // Refresh data
      
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast('Failed to update user', 'error');
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser({...user});
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;
      
      showToast('User deleted successfully', 'success');
      fetchData(); // Refresh data
      
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('Failed to delete user', 'error');
    }
  };

  const filterData = (data: any[] | null) => {
    if (!data) return [];
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    
    if (activeTab === 'users') {
      return data.filter(user => 
        (user.full_name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.phone || '').toLowerCase().includes(term) ||
        (user.username || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'attendance') {
      return data.filter(record => 
        (record.user?.full_name || '').toLowerCase().includes(term) ||
        (record.user?.email || '').toLowerCase().includes(term) ||
        (record.location || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'visits') {
      return data.filter(visit => 
        (visit.user?.full_name || '').toLowerCase().includes(term) ||
        (visit.user?.email || '').toLowerCase().includes(term) ||
        (visit.shop_name || '').toLowerCase().includes(term) ||
        (visit.location || '').toLowerCase().includes(term)
      );
    }
    
    return data;
  };

  if (loading && !users) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        <p className="text-red-100 font-medium ml-4">Loading admin dashboard...</p>
      </div>
    );
  }

  const filteredUsers = filterData(users);
  const filteredAttendance = filterData(attendanceRecords);
  const filteredVisits = filterData(shopVisits);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <span className="text-blue-200">
              Welcome, {userProfile?.full_name || 'Admin'}
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 rounded hover:bg-blue-800 transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search and Tabs */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-80"
              />
            </div>
          </div>
          
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 flex items-center ${
                  activeTab === 'users'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                <Users className="h-5 w-5 mr-2" />
                Employees ({filteredUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-2 flex items-center ${
                  activeTab === 'attendance'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Attendance ({filteredAttendance.length})
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`py-2 flex items-center ${
                  activeTab === 'visits'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Shop Visits ({filteredVisits.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Edit Employee</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateUser}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.full_name || ''}
                    onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editingUser.role || 'user'}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingUser.active}
                      onChange={(e) => setEditingUser({...editingUser, active: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'users' && (
          <>
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-lg font-medium text-gray-500 mb-4">No employees found.</p>
                <button 
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
                >
                  <RefreshCw size={16} className="mr-2" /> Refresh Data
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white shadow-md rounded-lg p-5 border border-gray-200 hover:shadow-xl transition"
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 rounded-full border overflow-hidden bg-gray-100 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={`${user.full_name || 'User'}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-blue-800">
                            {(user.full_name || 'U').charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">{user.full_name || 'Unnamed User'}</h2>
                        <p className="text-gray-600 text-sm">{user.email || 'No email'}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-700">
                      <p><strong>Username:</strong> {user.username || 'N/A'}</p>
                      <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                      <p><strong>Role:</strong> <span className="text-blue-600 font-medium">{user.role || 'user'}</span></p>
                      <p><strong>Status:</strong> 
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                          user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                      <p><strong>Joined:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => handleEdit(user)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 border rounded hover:bg-gray-100"
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 border border-red-400 rounded hover:bg-red-100"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Attendance Records Tab */}
        {activeTab === 'attendance' && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {filteredAttendance.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-lg font-medium text-gray-500 mb-4">No attendance records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Photo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {record.user?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.user?.email || 'No email'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.created_at ? new Date(record.created_at).toLocaleTimeString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.type === 'check_in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {record.type === 'check_in' ? 'Check In' : 'Check Out'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.location || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.photo_url ? (
                            <a 
                              href={record.photo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <img 
                                src={record.photo_url}
                                alt="Attendance" 
                                className="h-12 w-12 object-cover rounded-md cursor-pointer"
                              />
                            </a>
                          ) : (
                            <span className="text-gray-400">No photo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Shop Visits Tab */}
        {activeTab === 'visits' && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {filteredVisits.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-lg font-medium text-gray-500 mb-4">No shop visit records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shop Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Photos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVisits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {visit.user?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {visit.user?.email || 'No email'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {visit.shop_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {visit.created_at ? new Date(visit.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {visit.created_at ? new Date(visit.created_at).toLocaleTimeString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {visit.location || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {visit.notes || 'No notes'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {visit.photos && visit.photos.length > 0 ? (
                            <div className="flex space-x-2">
                              {visit.photos.map((photo: string, index: number) => (
                                <a 
                                  key={index}
                                  href={photo} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <img 
                                    src={photo}
                                    alt={`Visit ${index + 1}`} 
                                    className="h-12 w-12 object-cover rounded-md cursor-pointer"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No photos</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
}
