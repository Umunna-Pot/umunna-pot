"use client"

import * as React from "react"
import { CheckIcon, Share2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

interface ShareContributionLinkProps {
  communityId: number
  communityName: string
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  label?: string
}

/** Public, wallet-free contribution page for a pot. */
export function getContributionUrl(communityId: number): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/contribute/${communityId}`
}

export function ShareContributionLink({
  communityId,
  communityName,
  className,
  variant = "outline",
  size = "sm",
  label = "Share Link",
}: ShareContributionLinkProps) {
  const [copied, setCopied] = React.useState(false)

  const handleShare = async () => {
    const url = getContributionUrl(communityId)
    const text = `Contribute to ${communityName} on Umunna Pot`

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: communityName, text, url })
        return
      }
    } catch (err) {
      // User dismissed the native share sheet; do not fall through to copy.
      if (err instanceof DOMException && err.name === "AbortError") return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Contribution link copied", { description: url })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy automatically.", { description: url })
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => void handleShare()}
      className={className ?? "rounded-full"}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-primary" />
      ) : (
        <Share2Icon className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </Button>
  )
}

