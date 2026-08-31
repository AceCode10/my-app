"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const VARIANT_ICONS = {
  default: { Icon: Info, className: "text-muted-foreground" },
  destructive: { Icon: AlertCircle, className: "text-destructive" },
  success: { Icon: CheckCircle2, className: "text-primary" },
  warning: { Icon: AlertTriangle, className: "text-amber-600 dark:text-amber-500" },
} as const

// Errors get a little longer on screen than confirmations — there is usually
// something to read and act on.
const DEFAULT_DURATION = 6000
const DESTRUCTIVE_DURATION = 8000

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = props.variant ?? "default"
        const { Icon, className } = VARIANT_ICONS[variant] ?? VARIANT_ICONS.default

        return (
          <Toast
            key={id}
            {...props}
            duration={
              props.duration ??
              (variant === "destructive" ? DESTRUCTIVE_DURATION : DEFAULT_DURATION)
            }
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${className}`} aria-hidden />
            <div className="grid flex-1 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
              {action}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
