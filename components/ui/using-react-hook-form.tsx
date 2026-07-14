"use client"

/**
 * ExampleProfileForm — a minimal, real, working example of the
 * react-hook-form pattern every Form* component in the Forms group relies
 * on: call `useForm()` once at the top, hand its `methods` to
 * `<FormProvider>`, then let any nested field component reach the form
 * via `useFormContext()` — no prop-drilling of `register`/`errors` needed.
 *
 * Usage:
 *   <ExampleProfileForm />
 *
 * Depends on:
 *   - src/components/ui/input.tsx
 *   - src/components/ui/label.tsx
 *   - src/components/ui/button.tsx
 *   - src/components/ui/field.tsx (FieldError)
 */
import { useForm, FormProvider, useFormContext } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"

type ProfileValues = {
  name: string
  email: string
}

// A field component never receives `register` or `errors` as props — it
// pulls them straight from context, so it can be dropped anywhere inside
// the <FormProvider> tree below.
function NameField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileValues>()

  return (
    <div className="space-y-1.5">
      <Label htmlFor="rhf-name">Name</Label>
      <Input id="rhf-name" placeholder="Ada Lovelace" {...register("name", { required: "Name is required" })} />
      <FieldError errors={errors.name ? [errors.name] : undefined} />
    </div>
  )
}

function EmailField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileValues>()

  return (
    <div className="space-y-1.5">
      <Label htmlFor="rhf-email">Email</Label>
      <Input
        id="rhf-email"
        type="email"
        placeholder="ada@example.com"
        {...register("email", {
          required: "Email is required",
          pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
        })}
      />
      <FieldError errors={errors.email ? [errors.email] : undefined} />
    </div>
  )
}

export function ExampleProfileForm() {
  const methods = useForm<ProfileValues>({ defaultValues: { name: "", email: "" } })

  function onSubmit(values: ProfileValues) {
    alert(`Submitted:\n${JSON.stringify(values, null, 2)}`)
  }

  return (
    // FormProvider spreads `methods` (register, control, formState, handleSubmit, ...)
    // into context so every descendant can call useFormContext() for it.
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex w-72 flex-col gap-4">
        <NameField />
        <EmailField />
        <Button type="submit">Save profile</Button>
      </form>
    </FormProvider>
  )
}
