'use client';

import React from 'react';

interface KodiLoadingHorizontalProps {
  text?: string;
  direction?: 'left-to-right' | 'right-to-left';
}

export function KodiLoadingHorizontal({ 
  text = 'Loading', 
  direction = 'left-to-right' 
}: KodiLoadingHorizontalProps) {
  const isLeftToRight = direction === 'left-to-right';
  
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Horizontal Running Animation Container */}
      <div className="relative w-64 h-32 overflow-hidden">
        <svg
          viewBox="0 0 400 200"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground track */}
          <line
            x1="20"
            y1="160"
            x2="380"
            y2="160"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeDasharray="10,5"
            className="dark:stroke-gray-600"
          />

          {/* Start/Finish lines */}
          <line x1="30" y1="140" x2="30" y2="180" stroke="#9ca3af" strokeWidth="2" opacity="0.5" />
          <line x1="370" y1="140" x2="370" y2="180" stroke="#9ca3af" strokeWidth="2" opacity="0.5" />

          {/* Moving shadow that follows Kodi */}
          <ellipse
            cx="200"
            cy="158"
            rx="25"
            ry="5"
            className="fill-gray-300/50 dark:fill-gray-600/50"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`${isLeftToRight ? '0,0' : '0,0'}; ${isLeftToRight ? '280,0' : '-280,0'}; ${isLeftToRight ? '0,0' : '0,0'}`}
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="rx"
              values="25;20;25;30;25"
              dur="0.3s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Main Kodi Character - Running horizontally */}
          <g className="kodi-runner">
            {/* Horizontal movement */}
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`${isLeftToRight ? '0,0' : '0,0'}; ${isLeftToRight ? '280,0' : '-280,0'}; ${isLeftToRight ? '0,0' : '0,0'}`}
              dur="2s"
              repeatCount="indefinite"
            />

            {/* Vertical bounce synced with running */}
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,-3; 0,0; 0,-3; 0,0"
              dur="0.3s"
              repeatCount="indefinite"
              additive="sum"
            />

            {/* Left Leg - Back leg */}
            <g className="left-leg">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="30,200,125; -20,200,125; 30,200,125"
                dur="0.3s"
                repeatCount="indefinite"
              />
              {/* Upper leg */}
              <ellipse
                cx="200"
                cy="125"
                rx="7"
                ry="15"
                className="fill-emerald-600 dark:fill-emerald-500"
              />
              {/* Lower leg/foot */}
              <ellipse
                cx="200"
                cy="140"
                rx="8"
                ry="6"
                className="fill-emerald-700 dark:fill-emerald-600"
              />
            </g>

            {/* Right Leg - Front leg (opposite phase) */}
            <g className="right-leg">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-20,215,125; 30,215,125; -20,215,125"
                dur="0.3s"
                repeatCount="indefinite"
              />
              {/* Upper leg */}
              <ellipse
                cx="215"
                cy="125"
                rx="7"
                ry="15"
                className="fill-emerald-600 dark:fill-emerald-500"
              />
              {/* Lower leg/foot */}
              <ellipse
                cx="215"
                cy="140"
                rx="8"
                ry="6"
                className="fill-emerald-700 dark:fill-emerald-600"
              />
            </g>

            {/* Body - Forward lean */}
            <g className="body-torso">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-10,207,95; -5,207,95; -10,207,95"
                dur="0.15s"
                repeatCount="indefinite"
              />
              <ellipse
                cx="207"
                cy="95"
                rx="25"
                ry="30"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              {/* Belly */}
              <ellipse
                cx="207"
                cy="100"
                rx="18"
                ry="20"
                className="fill-emerald-100 dark:fill-emerald-200"
              />
            </g>

            {/* Head - Forward lean */}
            <g className="head">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-8,207,60; -3,207,60; -8,207,60"
                dur="0.15s"
                repeatCount="indefinite"
              />
              <circle
                cx="207"
                cy="60"
                r="25"
                className="fill-emerald-500 dark:fill-emerald-400"
              />

              {/* Face/Muzzle */}
              <ellipse
                cx="207"
                cy="66"
                rx="14"
                ry="12"
                className="fill-emerald-100 dark:fill-emerald-200"
              />

              {/* Left Ear */}
              <circle
                cx="190"
                cy="45"
                r="10"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              <circle
                cx="190"
                cy="45"
                r="5"
                className="fill-emerald-300"
              />

              {/* Right Ear */}
              <circle
                cx="224"
                cy="45"
                r="10"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              <circle
                cx="224"
                cy="45"
                r="5"
                className="fill-emerald-300"
              />

              {/* Eyes - Determined forward gaze */}
              <g className="eyes">
                {/* Left Eye */}
                <ellipse cx="200" cy="55" rx="6" ry="7" className="fill-white" />
                <circle cx="202" cy="55" r="3.5" className="fill-gray-800" />
                <circle cx="203" cy="53" r="1" className="fill-white" />

                {/* Right Eye */}
                <ellipse cx="214" cy="55" rx="6" ry="7" className="fill-white" />
                <circle cx="216" cy="55" r="3.5" className="fill-gray-800" />
                <circle cx="217" cy="53" r="1" className="fill-white" />
              </g>

              {/* Nose */}
              <ellipse
                cx="207"
                cy="66"
                rx="4"
                ry="2.5"
                className="fill-gray-800"
              />

              {/* Determined smile */}
              <path
                d="M 201 72 Q 207 76 213 72"
                fill="none"
                stroke="#374151"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>

            {/* Left Arm - Pumping back */}
            <g className="left-arm">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="25,185,85; -15,185,85; 25,185,85"
                dur="0.3s"
                repeatCount="indefinite"
              />
              <ellipse
                cx="180"
                cy="90"
                rx="7"
                ry="14"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
            </g>

            {/* Right Arm - Holding book */}
            <g className="right-arm-with-book">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-12,225,85; -8,225,85; -12,225,85"
                dur="0.3s"
                repeatCount="indefinite"
              />
              {/* Arm */}
              <ellipse
                cx="230"
                cy="88"
                rx="7"
                ry="14"
                className="fill-emerald-500 dark:fill-emerald-400"
              />
              
              {/* Book held in right hand */}
              <g className="book">
                {/* Book cover */}
                <rect
                  x="235"
                  y="75"
                  width="30"
                  height="24"
                  rx="2"
                  className="fill-blue-600 dark:fill-blue-500"
                  transform="rotate(12, 250, 87)"
                />
                {/* Book pages */}
                <rect
                  x="237"
                  y="77"
                  width="26"
                  height="20"
                  rx="1"
                  className="fill-white"
                  transform="rotate(12, 250, 87)"
                />
                {/* Book spine */}
                <line
                  x1="250"
                  y1="75"
                  x2="250"
                  y2="99"
                  stroke="#1e40af"
                  strokeWidth="1.5"
                  transform="rotate(12, 250, 87)"
                />
                
                {/* Flipping pages */}
                <g transform="rotate(12, 250, 87)">
                  <path
                    className="fill-gray-50"
                  >
                    <animate
                      attributeName="d"
                      values="M 250 77 Q 257 75 263 77 L 263 97 Q 257 95 250 97 Z;
                              M 250 77 Q 244 75 237 77 L 237 97 Q 244 95 250 97 Z;
                              M 250 77 Q 257 75 263 77 L 263 97 Q 257 95 250 97 Z"
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              </g>
            </g>
          </g>

          {/* Motion/Speed lines - Stationary background effect */}
          <g className="motion-lines">
            <line x1="80" y1="50" x2="40" y2="50" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="opacity" values="0;0.7;0" dur="0.2s" repeatCount="indefinite" />
            </line>
            <line x1="320" y1="50" x2="360" y2="50" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="opacity" values="0.7;0;0.7" dur="0.2s" repeatCount="indefinite" />
            </line>
            <line x1="70" y1="80" x2="30" y2="80" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.25s" repeatCount="indefinite" />
            </line>
            <line x1="330" y1="80" x2="370" y2="80" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.25s" repeatCount="indefinite" />
            </line>
            <line x1="75" y1="110" x2="35" y2="110" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="opacity" values="0.6;0;0.6" dur="0.2s" repeatCount="indefinite" />
            </line>
            <line x1="325" y1="110" x2="365" y2="110" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="opacity" values="0;0.6;0" dur="0.2s" repeatCount="indefinite" />
            </line>
          </g>

          {/* Dust clouds that appear as Kodi runs */}
          <g className="dust-clouds">
            <circle cx="60" cy="155" r="3" className="fill-gray-300 dark:fill-gray-500">
              <animate attributeName="opacity" values="0;0.5;0" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="cx" values="100;50;100" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="r" values="2;4;2" dur="0.3s" repeatCount="indefinite" />
            </circle>
            <circle cx="55" cy="153" r="2.5" className="fill-gray-300 dark:fill-gray-500">
              <animate attributeName="opacity" values="0.3;0;0.3" dur="0.3s" repeatCount="indefinite" />
              <animate attributeName="cx" values="95;45;95" dur="0.3s" repeatCount="indefinite" />
            </circle>
            <circle cx="65" cy="157" r="3.5" className="fill-gray-300 dark:fill-gray-500">
              <animate attributeName="opacity" values="0.2;0.4;0.2" dur="0.25s" repeatCount="indefinite" />
              <animate attributeName="cx" values="105;55;105" dur="0.25s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Progress indicator dots along the track */}
          <g className="progress-dots">
            <circle cx="50" cy="170" r="2" className="fill-emerald-400">
              <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="170" r="2" className="fill-emerald-400">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="150" cy="170" r="2" className="fill-emerald-400">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="200" cy="170" r="2" className="fill-emerald-400">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="250" cy="170" r="2" className="fill-emerald-400">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="300" cy="170" r="2" className="fill-emerald-400">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="350" cy="170" r="2" className="fill-emerald-400">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
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

export default KodiLoadingHorizontal;
