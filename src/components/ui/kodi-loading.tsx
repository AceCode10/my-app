'use client';

import React from 'react';

interface KodiLoadingProps {
  text?: string;
}

export function KodiLoading({ text = 'Loading' }: KodiLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Kodi Running Animation Container - Side Profile View */}
      <div className="relative w-32 h-32">
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shadow under Kodi */}
          <ellipse
            cx="60"
            cy="110"
            rx="20"
            ry="4"
            className="fill-gray-300/60 dark:fill-gray-600/60"
          >
            <animate
              attributeName="rx"
              values="20;16;20;16;20"
              dur="0.25s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Main Kodi Character - Side Profile facing right */}
          <g className="kodi-runner">
            {/* Subtle bounce */}
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,-3; 0,0; 0,-3; 0,0"
              dur="0.35s"
              repeatCount="indefinite"
            />

            {/* Back Leg (further from viewer) */}
            <g className="back-leg">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="40,60,75; -50,60,75; 40,60,75"
                dur="0.35s"
                repeatCount="indefinite"
              />
              {/* Thigh */}
              <ellipse
                cx="60"
                cy="85"
                rx="6"
                ry="14"
                className="fill-emerald-600 dark:fill-emerald-500"
              />
              {/* Foot */}
              <ellipse
                cx="60"
                cy="100"
                rx="8"
                ry="5"
                className="fill-emerald-700 dark:fill-emerald-600"
              />
            </g>

            {/* Back Arm (further from viewer) */}
            <g className="back-arm">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-40,60,50; 40,60,50; -40,60,50"
                dur="0.35s"
                repeatCount="indefinite"
              />
              <ellipse
                cx="60"
                cy="60"
                rx="5"
                ry="12"
                className="fill-emerald-600 dark:fill-emerald-500"
              />
            </g>

            {/* Body - Oval torso, slight forward lean */}
            <ellipse
              cx="60"
              cy="55"
              rx="18"
              ry="22"
              className="fill-emerald-500 dark:fill-emerald-400"
              transform="rotate(-10, 60, 55)"
            />
            
            {/* Belly patch */}
            <ellipse
              cx="62"
              cy="58"
              rx="12"
              ry="15"
              className="fill-emerald-100 dark:fill-emerald-200"
              transform="rotate(-10, 62, 58)"
            />

            {/* Head - Side profile */}
            <g className="head" transform="translate(8, -5)">
              {/* Main head shape */}
              <ellipse
                cx="60"
                cy="28"
                rx="20"
                ry="18"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              
              {/* Snout/muzzle protruding to the right */}
              <ellipse
                cx="75"
                cy="32"
                rx="10"
                ry="10"
                className="fill-emerald-100 dark:fill-emerald-200"
              />

              {/* Ear (visible one on this side) */}
              <ellipse
                cx="48"
                cy="15"
                rx="8"
                ry="10"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              <ellipse
                cx="48"
                cy="15"
                rx="4"
                ry="6"
                className="fill-emerald-300"
              />

              {/* Eye - Single eye visible in profile */}
              <ellipse cx="65" cy="25" rx="6" ry="7" className="fill-white" />
              <circle cx="67" cy="25" r="4" className="fill-gray-800" />
              <circle cx="68" cy="23" r="1.5" className="fill-white" />

              {/* Nose */}
              <ellipse
                cx="82"
                cy="30"
                rx="4"
                ry="3"
                className="fill-gray-800"
              />

              {/* Smile */}
              <path
                d="M 76 36 Q 80 40 82 38"
                fill="none"
                stroke="#374151"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>

            {/* Front Leg (closer to viewer) */}
            <g className="front-leg">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-50,60,75; 40,60,75; -50,60,75"
                dur="0.35s"
                repeatCount="indefinite"
              />
              {/* Thigh */}
              <ellipse
                cx="60"
                cy="85"
                rx="7"
                ry="14"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              {/* Foot */}
              <ellipse
                cx="60"
                cy="100"
                rx="9"
                ry="5"
                className="fill-emerald-600 dark:fill-emerald-500"
              />
            </g>

            {/* Front Arm with Book (closer to viewer) */}
            <g className="front-arm">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="40,60,50; -40,60,50; 40,60,50"
                dur="0.35s"
                repeatCount="indefinite"
              />
              <ellipse
                cx="60"
                cy="60"
                rx="6"
                ry="13"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              
              {/* Small book in hand */}
              <g className="book">
                <rect
                  x="55"
                  y="68"
                  width="14"
                  height="10"
                  rx="1"
                  className="fill-blue-600 dark:fill-blue-500"
                />
                <rect
                  x="56"
                  y="69"
                  width="12"
                  height="8"
                  rx="0.5"
                  className="fill-white"
                />
                {/* Page flipping */}
                <path className="fill-gray-100">
                  <animate
                    attributeName="d"
                    values="M 62 69 Q 65 68 68 69 L 68 77 Q 65 76 62 77 Z;
                            M 62 69 Q 59 68 56 69 L 56 77 Q 59 76 62 77 Z;
                            M 62 69 Q 65 68 68 69 L 68 77 Q 65 76 62 77 Z"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            </g>
          </g>

          {/* Motion lines behind Kodi */}
          <g className="motion-lines">
            <line x1="25" y1="35" x2="8" y2="35" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="opacity" values="0;0.7;0" dur="0.2s" repeatCount="indefinite" />
            </line>
            <line x1="22" y1="50" x2="5" y2="50" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="opacity" values="0.5;0;0.5" dur="0.25s" repeatCount="indefinite" />
            </line>
            <line x1="25" y1="65" x2="10" y2="65" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="opacity" values="0;0.6;0" dur="0.22s" repeatCount="indefinite" />
            </line>
          </g>

          {/* Dust puffs behind */}
          <g className="dust">
            <circle r="3" className="fill-gray-300 dark:fill-gray-500">
              <animate attributeName="cx" values="45;30;45" dur="0.35s" repeatCount="indefinite" />
              <animate attributeName="cy" values="105;103;105" dur="0.35s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.5;0" dur="0.35s" repeatCount="indefinite" />
              <animate attributeName="r" values="2;4;2" dur="0.35s" repeatCount="indefinite" />
            </circle>
            <circle r="2" className="fill-gray-300 dark:fill-gray-500">
              <animate attributeName="cx" values="40;25;40" dur="0.35s" repeatCount="indefinite" />
              <animate attributeName="cy" values="108;106;108" dur="0.35s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="0.35s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
      </div>

      {/* Loading text with animated dots */}
      <div className="text-sm text-muted-foreground font-medium">
        <span>{text}</span>
        <span className="inline-flex w-6">
          <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
          <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
          <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
        </span>
      </div>
    </div>
  );
}

export default KodiLoading;
