import React from 'react';

/**
 * Animated Skeleton loader for Feed Post Cards (Home / Community)
 */
export const PostCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="card-konecta p-6 sm:p-8 animate-pulse space-y-4 border border-gray-100 shadow-xs"
        >
          {/* Header with Avatar & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded-md w-36"></div>
              <div className="h-3 bg-gray-100 rounded-md w-24"></div>
            </div>
          </div>

          {/* Post Text Placeholder */}
          <div className="space-y-2 pt-2">
            <div className="h-3.5 bg-gray-200 rounded-md w-full"></div>
            <div className="h-3.5 bg-gray-200 rounded-md w-4/5"></div>
            <div className="h-3.5 bg-gray-100 rounded-md w-2/3"></div>
          </div>

          {/* Optional Image Placeholder */}
          <div className="w-full h-48 sm:h-64 bg-gray-100 rounded-2xl border border-gray-100"></div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex items-center gap-6">
              <div className="h-4 bg-gray-200 rounded-md w-12"></div>
              <div className="h-4 bg-gray-200 rounded-md w-12"></div>
            </div>
            <div className="h-3 bg-gray-100 rounded-md w-20"></div>
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Animated Skeleton loader for Idea/Project Cards Grid (Explore / Home)
 */
export const IdeaCardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="card-konecta p-6 animate-pulse flex flex-col justify-between border border-gray-100 shadow-xs space-y-4"
        >
          {/* Image Placeholder */}
          <div className="aspect-video w-full bg-gray-200 rounded-2xl"></div>

          {/* Tags & Meta */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-3.5 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-100 rounded w-20"></div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded-md w-3/4"></div>
            <div className="h-3.5 bg-gray-100 rounded-md w-full"></div>
            <div className="h-3.5 bg-gray-100 rounded-md w-5/6"></div>
          </div>

          {/* Author Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-8"></div>
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Animated Skeleton loader for Sidebar Stats
 */
export const StatBoxSkeleton: React.FC = () => {
  return (
    <div className="bg-konecta-navy rounded-[32px] p-8 text-white shadow-xl animate-pulse space-y-6">
      <div className="h-4 bg-white/20 rounded w-40"></div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="h-3 bg-white/20 rounded w-24"></div>
            <div className="h-6 bg-white/30 rounded w-10"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
