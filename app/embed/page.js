'use client'

import { useSearchParams } from 'next/navigation';

function EmbedPage() {
  const searchParams = useSearchParams();
  const embedUrl = searchParams.get('url');

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div className="bg-blue-600 p-5">
        <h1 className="text-2xl text-white">Technology Solutions, Inc.</h1>
      </div>
      {embedUrl ? (
        <iframe 
          src={embedUrl} 
          style={{
            border: 'none',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
          title="Embedded Docx"
        ></iframe>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default EmbedPage;