import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      {...props}
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <circle cx="12" cy="12" r="2" />
      <path d="m12 9-1.29 1.29a1 1 0 0 0 0 1.42L12 13" />
      <path d="M12 15v-1" />
      <path d="m15 12-1.29-1.29a1 1 0 0 0-1.42 0L11 12" />
    </svg>
  );
}
