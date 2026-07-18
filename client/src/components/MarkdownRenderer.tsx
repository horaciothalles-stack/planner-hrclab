import React from 'react';
import { Streamdown } from 'streamdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
