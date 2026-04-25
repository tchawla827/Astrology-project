"use client";

import React, { useCallback, useState } from "react";
import { Ban, Copy, Download, Loader2, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type ShareResponse = {
  token: string;
  share_url: string;
  image_url: string;
  error?: string;
};

async function parseJson(response: Response): Promise<ShareResponse> {
  const body = (await response.json().catch(() => ({}))) as ShareResponse;
  if (!response.ok) {
    throw new Error(body.error ?? "Could not create share card.");
  }
  return body;
}

export function ShareButton({ askMessageId }: { askMessageId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [share, setShare] = useState<ShareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureShare = useCallback(async () => {
    if (share) {
      return share;
    }
    if (!askMessageId) {
      throw new Error("This answer is not ready to share yet.");
    }

    setIsLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/share-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ask_message_id: askMessageId }),
      });
      const body = await parseJson(response);
      setShare(body);
      return body;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create share card.";
      setError(message);
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, [askMessageId, share]);

  const openSheet = () => {
    setIsOpen(true);
    void ensureShare().catch(() => undefined);
  };

  const copyLink = async () => {
    const nextShare = await ensureShare();
    await navigator.clipboard.writeText(nextShare.share_url);
    setStatus("Link copied.");
  };

  const downloadImage = async () => {
    const nextShare = await ensureShare();
    const response = await fetch(nextShare.image_url);
    if (!response.ok) {
      throw new Error("Could not download share image.");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `astri-${nextShare.token}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    setStatus("Image download started.");
  };

  const revoke = async () => {
    const nextShare = await ensureShare();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/share-card", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: nextShare.token }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not revoke share link.");
      }
      setShare(null);
      setStatus("Share link revoked.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not revoke share link.");
    } finally {
      setIsLoading(false);
    }
  };

  const runAction = (action: () => Promise<void>) => {
    setError(null);
    setStatus(null);
    void action().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Share action failed.");
    });
  };

  return (
    <>
      <Button disabled={!askMessageId || isLoading} onClick={openSheet} size="sm" type="button" variant="outline">
        {isLoading ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <Share2 aria-hidden="true" className="mr-2 h-4 w-4" />}
        Share
      </Button>

      {isOpen ? (
        <Sheet>
          <div className="fixed inset-0 z-40 bg-background/70" onClick={() => setIsOpen(false)} />
          <SheetContent aria-modal="true" role="dialog">
            <SheetHeader className="pr-10">
              <SheetTitle>Share answer</SheetTitle>
              <SheetDescription>Copy a public link or download a card image for this answer.</SheetDescription>
            </SheetHeader>
            <Button
              aria-label="Close share panel"
              className="absolute right-4 top-4 h-9 w-9 px-0"
              onClick={() => setIsOpen(false)}
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>

            <div className="mt-6 space-y-3">
              {share ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                  {share.share_url}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button disabled={isLoading} onClick={() => runAction(copyLink)} type="button">
                  <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
                <Button disabled={isLoading} onClick={() => runAction(downloadImage)} type="button" variant="secondary">
                  <Download aria-hidden="true" className="mr-2 h-4 w-4" />
                  Download image
                </Button>
              </div>

              <Button disabled={!share || isLoading} onClick={() => runAction(revoke)} type="button" variant="destructive">
                <Ban aria-hidden="true" className="mr-2 h-4 w-4" />
                Revoke
              </Button>

              {isLoading ? <p className="text-sm text-muted-foreground">Preparing share card...</p> : null}
              {status ? <p className="text-sm text-primary">{status}</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
