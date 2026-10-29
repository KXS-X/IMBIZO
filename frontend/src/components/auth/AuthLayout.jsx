import React from 'react';
import { ArrowRight, GitBranch, ListChecks, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrangeLogo } from '../common/OrangeLogo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';

function BrandMark({ compact = false }) {
  return (
    <Link to="/login" className="group inline-flex items-center gap-3" aria-label="Retour à la connexion">
      <OrangeLogo className="size-9 rounded-lg shadow-sm transition-transform group-hover:scale-105" />
      <span className="font-heading text-base font-semibold tracking-tight text-foreground">
        Imbi<span className="text-primary">zo</span>
        {!compact && <span className="ml-2 text-[10px] font-medium text-muted-foreground">workspace</span>}
      </span>
    </Link>
  );
}

function FlowPreview() {
  return (
    <div className="mt-10 max-w-xl rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="size-2 rounded-full bg-emerald-500" />
          Flux d’équipe
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">en direct</span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-[11px]">
        <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 text-muted-foreground">
          <ListChecks className="size-3.5 text-primary" />
          À faire
        </div>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-2 font-medium text-primary">
          <GitBranch className="size-3.5" />
          En cours
        </div>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 text-muted-foreground">
          <MessageSquare className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          Partagé
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <main className="min-h-svh bg-slate-50/75 text-slate-950 backdrop-blur-md dark:bg-slate-950/75 dark:text-slate-50">
      <div className="mx-auto grid min-h-svh w-full max-w-[1440px] grid-cols-1 gap-10 px-6 py-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-24 lg:px-16 lg:py-12">
        <section className="hidden lg:block" aria-label="Présentation de Imbizo">
          <BrandMark />
          <div className="mt-20 max-w-2xl">
            <p className="mb-5 text-sm font-medium text-primary">Coordination d’équipe, sans angle mort</p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 dark:text-slate-50 xl:text-6xl">
              Le travail avance mieux quand tout le monde voit le flux.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
              Centralisez les tâches, les avancées et les échanges de votre équipe dans un espace conçu pour livrer avec clarté.
            </p>
            <FlowPreview />
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[460px] flex-col justify-center">
          <div className="mb-8 lg:hidden">
            <BrandMark compact />
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
              Les tâches, les avancées et les échanges de votre équipe, au même endroit.
            </p>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="gap-2 p-7 pb-0 sm:p-8 sm:pb-0">
              <p className="text-sm font-medium text-primary">{eyebrow}</p>
              <CardTitle className="text-2xl font-semibold tracking-[-0.03em] sm:text-[1.75rem]">{title}</CardTitle>
              <CardDescription className="max-w-sm leading-6">{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-7 pt-7 sm:p-8 sm:pt-7">{children}</CardContent>
          </Card>

          {footer && <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</div>}
          <p className="mt-10 text-center text-[11px] text-slate-400 dark:text-slate-600">Imbizo · espace de travail d’équipe</p>
        </section>
      </div>
    </main>
  );
}
