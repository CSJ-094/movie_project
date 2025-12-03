import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

interface User {
    id: number;
    email: string;
    role: string;
    enabled: boolean;
}

const AdminPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const handleDeleteUser = async (userId: number) => {
        if (window.confirm(`정말 ID ${userId} 사용자를 삭제하시겠습니까?`)) {
            try {
                await axiosInstance.delete(`/admin/users/${userId}`);
                // UI에서 해당 사용자 제거
                setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
                alert('사용자가 삭제되었습니다.');
            } catch (error: any) {
                const errorMessage = error.response?.data || '사용자 삭제에 실패했습니다.';
                alert(errorMessage);
            }
        }
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axiosInstance.get('/admin/users');
                setUsers(response.data);
            } catch (error) {
                console.error('사용자 목록을 불러오는 데 실패했습니다.', error);
                alert('사용자 목록을 불러오는 데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    if (loading) {
        return <div className="p-8">로딩 중...</div>;
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">관리자 페이지 - 사용자 목록</h1>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">ID</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Email</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Role</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Enabled</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200">{user.id}</td>
                                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200">{user.email}</td>
                                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200">{user.role}</td>
                                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm">
                                    <span className={`font-semibold ${user.enabled ? 'text-green-500' : 'text-red-500'}`}>{user.enabled ? 'Yes' : 'No'}</span>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 text-sm">
                                    <button onClick={() => handleDeleteUser(user.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">삭제</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPage;