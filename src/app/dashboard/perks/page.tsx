'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";

// Placeholder data - this would come from Firestore
const perks = [
    { id: 1, title: "Free .xyz Domain", description: "Get a free .xyz domain for a year, sponsored by XYZ.", tier: "Silver" },
    { id: 2, title: "Exclusive REvamp T-Shirt", description: "Show off your community pride with a branded T-shirt.", tier: "Gold" },
    { id: 3, title: "1-on-1 Mentorship Session", description: "Get career advice from an industry expert.", tier: "Gold" },
    { id: 4, title: "Guaranteed Internship Interview", description: "An interview with one of our partner companies.", tier: "Platinum" },
];

// Placeholder - this would come from the authenticated user's profile
const userTier = "Bronze";

export default function PerksPage() {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const userTierIndex = tiers.indexOf(userTier);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Perks & Rewards</h1>
                <p className="text-muted-foreground">Unlock exclusive benefits as you climb the ranks.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {perks.map(perk => {
                    const perkTierIndex = tiers.indexOf(perk.tier);
                    const isUnlocked = userTierIndex >= perkTierIndex;

                    return (
                        <Card key={perk.id} className={cn("flex flex-col", !isUnlocked && "bg-muted/50")}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{perk.title}</span>
                                    <Badge variant={isUnlocked ? "default" : "secondary"}>
                                        {isUnlocked ? <Unlock className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
                                        {perk.tier} Tier
                                    </Badge>
                                </CardTitle>
                                <CardDescription>{perk.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-end">
                                <Button className="w-full" disabled={!isUnlocked}>
                                    {isUnlocked ? "Claim Now" : "Locked"}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
