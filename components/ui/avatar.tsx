"use client"

/**
 * Avatar — a user's profile picture with a fallback (initials/icon) shown
 * while the image loads or if it fails, plus badge/group helpers for
 * stacking multiple avatars.
 *
 * Usage:
 *   <Avatar>
 *     <AvatarImage src="/user.png" alt="Jane" />
 *     <AvatarFallback>JD</AvatarFallback>
 *   </Avatar>
 *
 *   <AvatarGroup>
 *     <Avatar>...</Avatar>
 *     <Avatar>...</Avatar>
 *     <AvatarGroupCount>+3</AvatarGroupCount>
 *   </AvatarGroup>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
} from "react"

import { cn } from "@/lib/utils"

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error"

const AvatarContext = createContext<{
  status: ImageLoadingStatus
  setStatus: (status: ImageLoadingStatus) => void
}>({ status: "idle", setStatus: () => {} })

function useImageLoadingStatus(
  src: string | undefined,
  referrerPolicy?: React.HTMLAttributeReferrerPolicy
) {
  const [status, setStatus] = useState<ImageLoadingStatus>("idle")

  useEffect(() => {
    if (!src) {
      setStatus("error")
      return
    }

    let cancelled = false
    setStatus("loading")

    const image = new window.Image()
    if (referrerPolicy) image.referrerPolicy = referrerPolicy
    image.onload = () => {
      if (!cancelled) setStatus("loaded")
    }
    image.onerror = () => {
      if (!cancelled) setStatus("error")
    }
    image.src = src

    return () => {
      cancelled = true
    }
  }, [src, referrerPolicy])

  return status
}

function Avatar({
  className,
  size = "default",
  ...props
}: ComponentProps<"span"> & {
  size?: "default" | "sm" | "lg"
}) {
  const [status, setStatus] = useState<ImageLoadingStatus>("idle")

  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <span
        data-slot="avatar"
        data-size={size}
        className={cn(
          "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
}

function AvatarImage({
  className,
  onLoadingStatusChange,
  referrerPolicy,
  ...props
}: ComponentProps<"img"> & {
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void
}) {
  const { setStatus } = useContext(AvatarContext)
  const status = useImageLoadingStatus(
    typeof props.src === "string" ? props.src : undefined,
    referrerPolicy
  )

  useEffect(() => {
    setStatus(status)
    onLoadingStatusChange?.(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  if (status !== "loaded") return null

  return (
    <img
      data-slot="avatar-image"
      referrerPolicy={referrerPolicy}
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  delay,
  children,
  ...props
}: ComponentProps<"span"> & { delay?: number }) {
  const { status } = useContext(AvatarContext)
  const [canRender, setCanRender] = useState(delay === undefined)

  useEffect(() => {
    if (delay === undefined) return
    const timer = window.setTimeout(() => setCanRender(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  if (status === "loaded" || !canRender) return null

  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

function AvatarBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
