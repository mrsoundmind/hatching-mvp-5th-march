import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 border-border bg-hatchin-panel">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-hatchin-surface flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🥚</span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
          <p className="text-muted-foreground mb-6">
            This page doesn't exist or may have been moved.
          </p>

          <Link href="/">
            <Button variant="default" className="bg-hatchin-blue hover:bg-hatchin-blue/90 text-white">
              <Home className="w-4 h-4 mr-2" />
              Back to projects
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
