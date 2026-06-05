import React from 'react';

interface HeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function H1({ children, className = '' }: HeadingProps) {
  return <h1 className={`text-display-md text-gray-900 dark:text-gray-100 ${className}`}>{children}</h1>;
}

export function H2({ children, className = '' }: HeadingProps) {
  return <h2 className={`text-display-sm text-gray-900 dark:text-gray-100 ${className}`}>{children}</h2>;
}

export function H3({ children, className = '' }: HeadingProps) {
  return <h3 className={`text-heading-lg text-gray-900 dark:text-gray-100 ${className}`}>{children}</h3>;
}

export function H4({ children, className = '' }: HeadingProps) {
  return <h4 className={`text-heading-md text-gray-900 dark:text-gray-100 ${className}`}>{children}</h4>;
}

export function H5({ children, className = '' }: HeadingProps) {
  return <h5 className={`text-heading-sm text-gray-900 dark:text-gray-100 ${className}`}>{children}</h5>;
}

export function H6({ children, className = '' }: HeadingProps) {
  return <h6 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h6>;
}

interface TextProps {
  children: React.ReactNode;
  className?: string;
}

export function Body({ children, className = '' }: TextProps) {
  return <p className={`text-body-md text-gray-700 dark:text-gray-300 ${className}`}>{children}</p>;
}

export function BodySmall({ children, className = '' }: TextProps) {
  return <p className={`text-body-sm text-gray-600 dark:text-gray-400 ${className}`}>{children}</p>;
}

export function BodyLarge({ children, className = '' }: TextProps) {
  return <p className={`text-body-lg text-gray-700 dark:text-gray-300 ${className}`}>{children}</p>;
}

export function Label({ children, className = '' }: TextProps) {
  return <label className={`text-label text-gray-600 dark:text-gray-400 ${className}`}>{children}</label>;
}

export function Caption({ children, className = '' }: TextProps) {
  return <span className={`text-caption text-gray-500 dark:text-gray-400 ${className}`}>{children}</span>;
}

export function Muted({ children, className = '' }: TextProps) {
  return <span className={`text-gray-500 dark:text-gray-400 ${className}`}>{children}</span>;
}

export function Code({ children, className = '' }: TextProps) {
  return (
    <code className={`px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </code>
  );
}
