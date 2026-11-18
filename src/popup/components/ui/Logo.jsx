export default function Logo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <path
        d="M4.5 16.5h15M6 16.5c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5"
        stroke="var(--on-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
