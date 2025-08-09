'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  provider: string | null;
  createdAt: string;
  _count: {
    reports: number;
    familyMemberships: number;
  };
}

interface SystemStats {
  overview: {
    totalUsers: number;
    totalReports: number;
    totalAnalyses: number;
    recentUsers: number;
    recentReports: number;
  };
  userDistribution: Array<{ role: string; count: number }>;
  reportDistribution: Array<{ status: string; count: number }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    if (token) {
      fetchUsers();
      fetchStats();
    }
  }, [user, token, page]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users?page=${page}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch user details');
      
      const data = await response.json();
      setUserDetails(data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: newRole }),
        }
      );
      
      if (!response.ok) throw new Error('Failed to update user role');
      
      // Refresh users list
      fetchUsers();
      setSelectedUser(null);
      setUserDetails(null);
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all their data?')) {
      return;
    }
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      // Refresh users list
      fetchUsers();
      fetchStats();
      setSelectedUser(null);
      setUserDetails(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        {/* System Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
              <div className="text-xs text-healing-600">+{stats.overview.recentUsers} this week</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Reports</div>
              <div className="text-2xl font-bold">{stats.overview.totalReports}</div>
              <div className="text-xs text-healing-600">+{stats.overview.recentReports} this week</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Analyses</div>
              <div className="text-2xl font-bold">{stats.overview.totalAnalyses}</div>
            </div>
            {stats.userDistribution.map((dist) => (
              <div key={dist.role} className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 capitalize">{dist.role}s</div>
                <div className="text-2xl font-bold">{dist.count}</div>
              </div>
            ))}
          </div>
        )}
        
        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-sacred-100 text-sacred-800'
                          : user.role === 'doctor'
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-healing-100 text-healing-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user._count.reports}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.provider || 'Email'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => fetchUserDetails(user.id)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-alert-600 hover:text-alert-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
        
        {/* User Details Modal */}
        {selectedUser && userDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold">User Details</h3>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserDetails(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* User Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Name:</span>
                        <p className="font-medium">{userDetails.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Email:</span>
                        <p className="font-medium">{userDetails.email}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Role:</span>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{userDetails.role}</p>
                          <select
                            value={userDetails.role}
                            onChange={(e) => updateUserRole(userDetails.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="user">User</option>
                            <option value="doctor">Doctor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Provider:</span>
                        <p className="font-medium">{userDetails.provider || 'Email'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Reports */}
                  <div>
                    <h4 className="font-semibold mb-2">Recent Reports ({userDetails.reports.length})</h4>
                    <div className="space-y-2">
                      {userDetails.reports.map((report: any) => (
                        <div key={report.id} className="border rounded p-3">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{report.fileName}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(report.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 text-xs rounded ${
                                report.status === 'COMPLETED' 
                                  ? 'bg-healing-100 text-healing-800'
                                  : 'bg-sacred-100 text-sacred-800'
                              }`}>
                                {report.status}
                              </span>
                              {report.analysis && (
                                <p className="text-sm mt-1">
                                  Score: {report.analysis.healthScore}/100
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Health Profile */}
                  {userDetails.healthProfile && (
                    <div>
                      <h4 className="font-semibold mb-2">Health Profile</h4>
                      <div className="border rounded p-3">
                        <p className="text-sm">
                          <span className="font-medium">Blood Group:</span> {userDetails.bloodGroup || 'Not specified'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Gender:</span> {userDetails.gender || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}