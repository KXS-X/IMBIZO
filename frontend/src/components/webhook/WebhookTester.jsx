import React, { useState } from 'react';
import { Check, Copy, GitBranch, Terminal } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function WebhookTester({ project }) {
  const [branchName, setBranchName] = useState('main');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const webhookUrl = `${window.location.origin}/api/webhooks/projects/${project.id}/github`;
  const curlExample = `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-GitHub-Event: push" \\
  -d '{
    "ref": "refs/heads/${branchName}",
    "repository": {
      "name": "${project.githubRepo?.split('/')[1] || project.name}",
      "full_name": "${project.githubRepo || `user/${project.name}` }"
    },
    "pusher": { "name": "votre-compte-github" },
    "head_commit": { "message": "votre-message-de-commit", "url": "https://github.com/..." },
    "commits": []
  }'`;

  const copyValue = async (value, setCopied) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><GitBranch className="size-4" /></span>
              <div>
                <CardTitle className="text-base">Notifications GitHub</CardTitle>
                <CardDescription className="mt-1 max-w-2xl">Recevez une notification dans le chat et dans votre centre de notifications à chaque nouveau push.</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">Événement push</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL du webhook</Label>
            <div className="flex gap-2">
              <Input id="webhook-url" value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={() => copyValue(webhookUrl, setCopiedUrl)}>
                {copiedUrl ? <Check className="text-emerald-500" /> : <Copy />}
                {copiedUrl ? 'Copié' : 'Copier'}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Type de contenu</p><p className="mt-1 font-mono text-sm font-medium">application/json</p></div>
            <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Événement</p><p className="mt-1 text-sm font-medium">push</p></div>
            <div className="min-w-0 rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Dépôt associé</p><p className="mt-1 truncate font-mono text-sm font-medium" title={project.githubRepo}>{project.githubRepo || 'Non configuré'}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Terminal className="size-4 text-primary" /><CardTitle className="text-base">Tester avec cURL</CardTitle></div>
            <Button type="button" variant="outline" size="sm" onClick={() => copyValue(curlExample, setCopiedCurl)}>
              {copiedCurl ? <Check className="text-emerald-500" /> : <Copy />}
              {copiedCurl ? 'Copié' : 'Copier la commande'}
            </Button>
          </div>
          <CardDescription>
            Simulez un push GitHub sans quitter l’application.
            {project.hasWebhookSecret
              ? ' Une signature X-Hub-Signature-256 est également requise pour ce projet : utilisez un vrai webhook GitHub pour ce test.'
              : ' Cet exemple fonctionne parce qu’aucun secret de webhook n’est configuré.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="webhook-branch">Branche</Label>
            <Input id="webhook-branch" value={branchName} onChange={(event) => setBranchName(event.target.value)} />
          </div>
          <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs leading-5 text-muted-foreground">{curlExample}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
