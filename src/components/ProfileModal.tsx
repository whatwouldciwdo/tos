"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    name: string;
    username: string;
    email: string;
    position: string;
    bidang: string;
  };
  onUpdate: (data: { email?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
}

export default function ProfileModal({ isOpen, onClose, userData, onUpdate }: ProfileModalProps) {
  const [email, setEmail] = useState(userData.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Validate email
    if (!email) {
      setError("Email is required");
      return;
    }

    // If changing password, validate password fields
    if (isChangingPassword) {
      if (!currentPassword) {
        setError("Current password is required");
        return;
      }
      if (!newPassword) {
        setError("New password is required");
        return;
      }
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // Show confirmation dialog
      setShowConfirmDialog(true);
      return;
    }

    // If only updating email
    await performUpdate();
  };

  const performUpdate = async () => {
    setIsSaving(true);
    try {
      const updateData: any = { email };
      
      if (isChangingPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      await onUpdate(updateData);
      
      setSuccess("Profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      setShowConfirmDialog(false);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      setShowConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Main Modal */}
      <div className="neu-modal fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] text-white">
        <div className="neu-card w-full max-w-md mx-4">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg neu-btn text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Error/Success Messages */}
            {error && (
              <div className="neu-inset-sm border border-red-500/40 text-red-300 px-4 py-2 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="neu-inset-sm border border-[#42ff6b]/40 text-[#42ff6b] px-4 py-2 text-sm">
                {success}
              </div>
            )}

            {/* Read-only Fields */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={userData.name}
                disabled
                className="w-full px-3.5 py-2.5 neu-inset-sm text-gray-200 cursor-not-allowed text-sm"
                style={{ color: "#e5e7eb" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={userData.username}
                disabled
                className="w-full px-3.5 py-2.5 neu-inset-sm text-gray-200 cursor-not-allowed text-sm"
                style={{ color: "#e5e7eb" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Position
              </label>
              <input
                type="text"
                value={userData.position}
                disabled
                className="w-full px-3.5 py-2.5 neu-inset-sm text-gray-200 cursor-not-allowed text-sm"
                style={{ color: "#e5e7eb" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Bidang
              </label>
              <input
                type="text"
                value={userData.bidang}
                disabled
                className="w-full px-3.5 py-2.5 neu-inset-sm text-gray-200 cursor-not-allowed text-sm"
                style={{ color: "#e5e7eb" }}
              />
            </div>

            {/* Editable Email */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 neu-inset text-white focus:ring-1 focus:ring-[#42ff6b]/50 outline-none placeholder:text-gray-500 text-sm"
                style={{ color: "#ffffff" }}
              />
            </div>

            {/* Password Change Section */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-300">
                  Change Password
                </label>
                <button
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                  className="text-sm text-[#42ff6b] hover:underline font-medium"
                >
                  {isChangingPassword ? "Cancel" : "Change"}
                </button>
              </div>

              {isChangingPassword && (
                <div className="space-y-3">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 neu-inset text-white focus:ring-1 focus:ring-[#42ff6b]/50 outline-none pr-10 placeholder:text-gray-500 text-sm"
                        style={{ color: "#ffffff" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 neu-inset text-white focus:ring-1 focus:ring-[#42ff6b]/50 outline-none pr-10 placeholder:text-gray-500 text-sm"
                        style={{ color: "#ffffff" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 neu-inset text-white focus:ring-1 focus:ring-[#42ff6b]/50 outline-none pr-10 placeholder:text-gray-500 text-sm"
                        style={{ color: "#ffffff" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 neu-btn text-gray-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 neu-btn-accent rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Password Change */}
      {showConfirmDialog && (
        <div className="neu-modal fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] text-white">
          <div className="neu-card w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Confirm Password Change</h3>
              <p className="text-gray-300 text-sm mb-6">
                Are you sure you want to change your password? You will need to use the new password on your next login.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSaving}
                  className="px-4 py-2 neu-btn text-gray-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={performUpdate}
                  disabled={isSaving}
                  className="px-4 py-2 neu-btn-accent rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {isSaving ? "Changing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
