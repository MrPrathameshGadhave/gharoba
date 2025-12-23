'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

const documentTypes = [
  { key: 'aadhaar', label: 'Aadhaar Card' },
  { key: 'license', label: 'Driving License' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'photo', label: 'Driver Photo' },
  { key: 'rc', label: 'Vehicle RC' },
  { key: 'insurance', label: 'Insurance Document' },
  { key: 'puc', label: 'PUC Certificate' },
] as const;

type DocumentKey = (typeof documentTypes)[number]['key'];

export default function DriverDocuments() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Record<DocumentKey, { url: string; name: string } | null>>({
    aadhaar: null,
    license: null,
    pan: null,
    photo: null,
    rc: null,
    insurance: null,
    puc: null,
  });
  const [uploading, setUploading] = useState<DocumentKey | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && role !== 'driver') {
      router.push('/');
    } else if (user) {
      listDocuments();
    }
  }, [user, role, loading, router]);

  const listDocuments = async () => {
    const { data, error } = await supabase.storage
      .from('driver-documents')
      .list(user?.id, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.error('Error listing documents:', error);
      return;
    }

    const newDocs = { ...documents };
    for (const type of documentTypes) {
      const matchingFile = data?.find(file => file.name.startsWith(type.key + '_'));
      if (matchingFile) {
        const { data: urlData } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(`${user?.id}/${matchingFile.name}`);
        newDocs[type.key] = { url: urlData.publicUrl, name: matchingFile.name };
      } else {
        newDocs[type.key] = null;
      }
    }
    setDocuments(newDocs);
  };

  const uploadDocument = async (key: DocumentKey, file: File) => {
    setUploading(key);
    setMessage('');

    const fileExt = file.name.split('.').pop();
    const fileName = `${key}_${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('driver-documents')
      .upload(filePath, file, { upsert: true });

    if (error) {
      setMessage(`Upload failed for ${documentTypes.find(d => d.key === key)?.label}: ${error.message}`);
    } else {
      setMessage(`${documentTypes.find(d => d.key === key)?.label} uploaded successfully!`);
      listDocuments();
    }
    setUploading(null);
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  if (loading) return <p className="text-center text-xl">Loading...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Documents</h1>

      {message && (
        <p className={`mb-6 text-lg ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documentTypes.map(({ key, label }) => (
          <div key={key} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
            </div>

            <div className="p-4">
              {documents[key] ? (
                <div className="space-y-3">
                  {isImage(documents[key]!.url) ? (
                    <img
                      src={documents[key]!.url}
                      alt={label}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 border-2 border-dashed rounded-lg flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 truncate">{documents[key]!.name}</div>
                  <div className="flex gap-2">
                    <a
                      href={documents[key]!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                    >
                      View Full
                    </a>
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,application/pdf';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) uploadDocument(key, file);
                        };
                        input.click();
                      }}
                      disabled={uploading === key}
                      className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm disabled:opacity-50"
                    >
                      {uploading === key ? 'Replacing...' : 'Replace'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-full h-48 bg-gray-100 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-500">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,application/pdf';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) uploadDocument(key, file);
                      };
                      input.click();
                    }}
                    disabled={uploading === key}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                  >
                    {uploading === key ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}