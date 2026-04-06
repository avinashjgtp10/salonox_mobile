import React from 'react';

interface PageLoaderProps {
  fullHeight?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ fullHeight = false }) => {
  return (
    <div 
      className="d-flex justify-content-center align-items-center"
      style={{ height: fullHeight ? '100vh' : '100%' }}
    >
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};
