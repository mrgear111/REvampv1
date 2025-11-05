'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Folder, FileText } from "lucide-react";
import { useState } from "react";

// Placeholder data - this would come from Firestore
const resources = [
    { id: 1, title: "React Best Practices", category: "Guides", domain: "web-dev", url: "#" },
    { id: 2, title: "Understanding React Hooks", category: "Videos", domain: "web-dev", url: "#" },
    { id: 3, title: "Building a REST API with Node.js", category: "Guides", domain: "web-dev", url: "#" },
    { id: 4, title: "Intro to TensorFlow", category: "Videos", domain: "ai-ml", url: "#" },
    { id: 5, title: "Data Cleaning with Pandas", category: "Guides", domain: "data-science", url: "#" },
];

// Placeholder - this would come from the authenticated user's profile
const userPrimaryDomain = "web-dev";

export default function ResourcesPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredResources = resources
        .filter(r => r.domain === userPrimaryDomain)
        .filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const categories = [...new Set(filteredResources.map(r => r.category))];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Resources</h1>
                <p className="text-muted-foreground">Curated content to help you excel in {userPrimaryDomain}.</p>
            </div>
            
            <Input 
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />

            <div className="space-y-6">
                {categories.map(category => (
                    <Card key={category}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Folder className="h-6 w-6 text-primary" />
                                <span>{category}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {filteredResources.filter(r => r.category === category).map(resource => (
                                <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span>{resource.title}</span>
                                </a>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
