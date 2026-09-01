import { ArrowRight, Lock, Mail } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  email,
  password,
  loading,
  error,
  isExpired,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  ...props
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <FieldGroup>
          {isExpired && (
            <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm leading-5 text-amber-700 dark:text-amber-300">
              Votre session a expiré. Veuillez vous reconnecter.
            </div>
          )}

          {error && <FieldError>{error}</FieldError>}

          <Field>
            <FieldLabel htmlFor="login-email">Adresse email</FieldLabel>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="nom@exemple.com"
                value={email}
                onChange={onEmailChange}
                className="h-11 pl-10"
                required
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="login-password">Mot de passe</FieldLabel>
            <div className="relative">
              <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={onPasswordChange}
                className="h-11 pl-10"
                required
              />
            </div>
          </Field>

          <Field>
            <Button type="submit" size="lg" className="h-11 w-full gap-2" disabled={loading}>
              {loading ? "Connexion en cours…" : "Se connecter"}
              {!loading && <ArrowRight aria-hidden="true" />}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="text-center">
        Pas encore de compte ?{" "}
        <Link to="/register">Créer un compte</Link>
      </FieldDescription>
    </div>
  )
}
