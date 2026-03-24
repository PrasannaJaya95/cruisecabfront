import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MyProfile = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">My Profile</h2>
            <Card className="glass-card max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-slate-200">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-300">Name</Label>
                        <Input id="name" defaultValue={user?.name} disabled className="bg-slate-800/50 border-slate-700 text-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-300">Email</Label>
                        <Input id="email" defaultValue={user?.email} disabled className="bg-slate-800/50 border-slate-700 text-slate-200" />
                    </div>
                    <div className="pt-4">
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                            Change Password
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MyProfile;
