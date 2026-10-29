import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary a capturé une erreur :', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
          <Card className="max-w-md border-destructive/40 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <CardTitle className="text-lg">Un problème est survenu</CardTitle>
              <CardDescription>
                Une erreur inattendue a empêché l'affichage de cette section.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {this.state.error?.message && (
                <div className="rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground break-all">
                  {this.state.error.message}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => (window.location.href = '/')}>
                <Home className="size-4" />
                Accueil
              </Button>
              <Button size="sm" onClick={this.handleReset}>
                <RefreshCw className="size-4" />
                Recharger
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

