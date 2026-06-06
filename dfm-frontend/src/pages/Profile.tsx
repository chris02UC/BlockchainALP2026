import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useWeb3 } from '../context/useWeb3';

export default function Profile() {
  const { account } = useWeb3();
  const [profile, setProfile] = useState({ username: '', email: '', bio: '', profilePictureUrl: '' });
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Load user data
  useEffect(() => {
    if (account) {
      api.get(`/users/${account.toLowerCase()}`).then(res => {
        setProfile(res.data || { username: '', email: '', bio: '', profilePictureUrl: '' });
        if (res.data?.profilePictureUrl) {
          setPreviewUrl(res.data.profilePictureUrl);
        }
      }).catch(() => setProfile({ username: '', email: '', bio: '', profilePictureUrl: '' }));
    }
  }, [account]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 3MB)
      if (file.size > 3 * 1024 * 1024) {
        alert("File size exceeds 3MB. Please choose a smaller image.");
        return;
      }
      setProfileFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setPreviewUrl(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Update user data
  const handleUpdate = async () => {
    if (!account) return;
    setIsLoading(true);
    try {
      let pictureUrl = profile.profilePictureUrl;
      if (profileFile) {
        pictureUrl = await fileToBase64(profileFile);
      }
      await api.patch(`/users/${account.toLowerCase()}`, {
        username: profile.username,
        email: profile.email,
        bio: profile.bio,
        profilePictureUrl: pictureUrl
      });
      alert("Profile Updated!");
      setProfileFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-md mt-10">
      <h2 className="text-3xl font-bold mb-8">Edit Profile</h2>
      
      {/* Profile Picture Section */}
      <div className="mb-8">
        <div className="flex items-center gap-6">
          <div>
            {previewUrl ? (
              <img src={previewUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-200" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                <span className="text-gray-400 text-4xl">👤</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold mb-2">Profile Picture</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 border border-gray-200 rounded-lg p-2 cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 3MB.</p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Wallet Address</label>
          <input 
            className="w-full border border-gray-200 p-3 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" 
            value={account || ''}
            disabled
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold mb-1">Username</label>
          <input 
            className="w-full border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Enter username" 
            value={profile.username} 
            onChange={(e) => setProfile({...profile, username: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Email</label>
          <input 
            type="email"
            className="w-full border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Enter email" 
            value={profile.email} 
            onChange={(e) => setProfile({...profile, email: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Bio</label>
          <textarea 
            className="w-full border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
            placeholder="Tell us about yourself..." 
            rows={4}
            value={profile.bio} 
            onChange={(e) => setProfile({...profile, bio: e.target.value})}
          />
        </div>
      </div>

      <button 
        onClick={handleUpdate}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg mt-8 hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  );
}