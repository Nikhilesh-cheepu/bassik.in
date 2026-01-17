"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

interface AdminUser {
  id: string;
  username: string;
  role: string;
  venuePermissions: { venue: { brandId: string } }[];
  createdAt: string;
}

export default function AdminsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "ADMIN" as "MAIN_ADMIN" | "ADMIN",
    venueIds: [] as string[],
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) {
          router.push("/admin");
          return;
        }
        const data = await res.json();
        setAdmin(data.admin);

        if (data.admin.role !== "MAIN_ADMIN") {
          router.push("/admin/dashboard");
          return;
        }

        loadAdmins();
      } catch (error) {
        router.push("/admin");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const loadAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error("Error loading admins:", error);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowCreateForm(false);
        setFormData({ username: "", password: "", role: "ADMIN", venueIds: [] });
        loadAdmins();
        alert("Admin created successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create admin");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;

    try {
      const res = await fetch(`/api/admin/admins?id=${adminId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadAdmins();
        alert("Admin deleted successfully!");
      } else {
        alert("Failed to delete admin");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!admin || admin.role !== "MAIN_ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Admins</h1>
              <p className="text-sm text-gray-600 mt-1">
                Create and manage admin users
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {showCreateForm ? "Cancel" : "+ Create Admin"}
              </button>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Admin</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any, venueIds: [] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="ADMIN">Admin (Limited Access)</option>
                  <option value="MAIN_ADMIN">Main Admin (Full Access)</option>
                </select>
              </div>

              {formData.role === "ADMIN" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venue Permissions (Select venues this admin can manage)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {BRANDS.map((brand) => (
                      <label key={brand.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.venueIds.includes(brand.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, venueIds: [...formData.venueIds, brand.id] });
                            } else {
                              setFormData({ ...formData, venueIds: formData.venueIds.filter((id) => id !== brand.id) });
                            }
                          }}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{brand.shortName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Create Admin
              </button>
            </form>
          </div>
        )}

        {/* Admins List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((adminUser) => (
                    <tr key={adminUser.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{adminUser.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            adminUser.role === "MAIN_ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {adminUser.role === "MAIN_ADMIN" ? "Main Admin" : "Admin"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {adminUser.role === "MAIN_ADMIN" ? (
                            <span className="text-gray-500">All venues</span>
                          ) : adminUser.venuePermissions.length === 0 ? (
                            <span className="text-red-500">No permissions</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {adminUser.venuePermissions.map((perm) => (
                                <span
                                  key={perm.venue.brandId}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                >
                                  {BRANDS.find((b) => b.id === perm.venue.brandId)?.shortName || perm.venue.brandId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(adminUser.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {adminUser.id !== admin.id && (
                          <button
                            onClick={() => handleDeleteAdmin(adminUser.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
