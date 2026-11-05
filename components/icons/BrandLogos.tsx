import * as React from "react"

export function EthereumLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 417"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ethereum logo"
    >
      <path
        d="M127.961 0L125.166 9.5V285.168L127.961 287.958L255.923 212.32L127.961 0Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M127.962 0L0 212.32L127.962 287.959V154.158V0Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
      <path
        d="M127.961 312.187L126.386 314.106V412.205L127.961 416.825L256 236.587L127.961 312.187Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M127.962 416.825V312.187L0 236.587L127.962 416.825Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
      <path
        d="M127.961 287.958L255.923 212.32L127.961 154.158V287.958Z"
        fill="currentColor"
        fillOpacity="0.8"
      />
      <path
        d="M0 212.32L127.962 287.958V154.158L0 212.32Z"
        fill="currentColor"
        fillOpacity="0.45"
      />
    </svg>
  )
}

export function RoqquLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Roqqu logo"
    >
      <rect width="100" height="100" rx="24" fill="#0052FF" />
      <path
        d="M28 26H52C62.4934 26 71 34.5066 71 45C71 54.218 64.4449 61.9056 55.7725 63.6338L72 74H57.5L43.8 64H38V74H28V26ZM38 35V55H51.5C57.0228 55 61.5 50.5228 61.5 45C61.5 39.4772 57.0228 35 51.5 35H38Z"
        fill="white"
      />
      <circle cx="51.5" cy="45" r="5" fill="#00E599" />
    </svg>
  )
}

