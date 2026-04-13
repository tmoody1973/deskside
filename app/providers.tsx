"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#FFD93D",
          colorBackground: "#1E1E28",
          colorText: "#FFFFFF",
          colorTextSecondary: "#D4D0C8",
          colorInputBackground: "#2A2A34",
          colorInputText: "#FFFFFF",
          colorNeutral: "#F5F0E8",
          colorTextOnPrimaryBackground: "#0A0A0F",
          borderRadius: "0px",
          fontFamily: "var(--font-space-grotesk), sans-serif",
        },
        elements: {
          card: {
            backgroundColor: "#1E1E28",
            border: "3px solid #F5F0E8",
            boxShadow: "6px 6px 0 0 #F5F0E8",
          },
          headerTitle: {
            color: "#FFFFFF",
            fontFamily: "var(--font-archivo-black), sans-serif",
          },
          headerSubtitle: {
            color: "#B8B0A4",
          },
          socialButtonsBlockButton: {
            backgroundColor: "#2A2A34",
            border: "2px solid #F5F0E8",
            color: "#F5F0E8",
            "&:hover": {
              backgroundColor: "#3A3A44",
            },
          },
          formFieldLabel: {
            color: "#F5F0E8",
          },
          formFieldInput: {
            backgroundColor: "#0A0A0F",
            border: "2px solid #F5F0E8",
            color: "#FFFFFF",
          },
          formButtonPrimary: {
            backgroundColor: "#FFD93D",
            color: "#0A0A0F",
            fontFamily: "var(--font-archivo-black), sans-serif",
            border: "2px solid #F5F0E8",
            boxShadow: "4px 4px 0 0 #F5F0E8",
            "&:hover": {
              backgroundColor: "#FFE566",
            },
          },
          footerActionLink: {
            color: "#FFD93D",
          },
          dividerLine: {
            backgroundColor: "#2A2A34",
          },
          dividerText: {
            color: "#6B665E",
          },
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
