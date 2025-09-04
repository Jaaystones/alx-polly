"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Share2, Twitter, Facebook, Mail } from "lucide-react";
import { toast } from "sonner";
import { sanitizeInput } from "@/app/lib/utils/security";

interface SecureShareProps {
  pollId: string;
  pollTitle: string;
}

export default function SecureShare({
  pollId,
  pollTitle,
}: SecureShareProps) {
  const [shareUrl, setShareUrl] = useState("");
  
  // Sanitize the poll title to prevent XSS
  const sanitizedTitle = sanitizeInput(pollTitle);

  useEffect(() => {
    // Generate the share URL - only use sanitized parameters
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      const safePollId = encodeURIComponent(pollId);
      const pollUrl = `${baseUrl}/polls/${safePollId}`;
      setShareUrl(pollUrl);
    }
  }, [pollId]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`Check out this poll: ${sanitizedTitle}`);
    const url = encodeURIComponent(shareUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    
    // Open in a new window with security precautions
    window.open(
      twitterUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(shareUrl);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    
    window.open(
      facebookUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Poll: ${sanitizedTitle}`);
    const body = encodeURIComponent(
      `Hi! I'd like to share this poll with you: ${shareUrl}`,
    );
    
    // Use mailto protocol with sanitized inputs
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share This Poll
        </CardTitle>
        <CardDescription>
          Share your poll with others to gather votes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Shareable Link
          </label>
          <div className="flex space-x-2">
            <Input
              value={shareUrl}
              readOnly
              className="font-mono text-sm"
              placeholder="Generating link..."
            />
            <Button onClick={copyToClipboard} variant="outline" size="sm">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Social Sharing Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Share on social media
          </label>
          <div className="flex space-x-2">
            <Button
              onClick={shareOnTwitter}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Twitter className="h-4 w-4" />
              Twitter
            </Button>
            <Button
              onClick={shareOnFacebook}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </Button>
            <Button
              onClick={shareViaEmail}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
