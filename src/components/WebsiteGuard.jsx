import { useState, useEffect } from 'react';
import api from '@/lib/api';
import MaintenanceMode from '@/pages/public/MaintenanceMode';

const WebsiteGuard = ({ children }) => {
    const [enabled, setEnabled] = useState(null);
    const [maintenanceParams, setMaintenanceParams] = useState({
        heading: '',
        message: '',
        allowLogin: false
    });

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const [enabledRes, headingRes, messageRes, loginRes] = await Promise.all([
                    api.get('/settings/website_enabled'),
                    api.get('/settings/maintenance_heading'),
                    api.get('/settings/maintenance_message'),
                    api.get('/settings/maintenance_allow_login')
                ]);

                setEnabled(enabledRes.data.value === 'true');
                setMaintenanceParams({
                    heading: headingRes.data.value !== 'false' ? headingRes.data.value : '',
                    message: messageRes.data.value !== 'false' ? messageRes.data.value : '',
                    allowLogin: loginRes.data.value === 'true'
                });
            } catch (error) {
                console.error("Failed to check website status", error);
                // Default to disabled on error for safety
                setEnabled(false);
            }
        };
        checkStatus();
    }, []);

    if (enabled === null) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading...</div>;
    }

    if (!enabled) {
        return <MaintenanceMode {...maintenanceParams} />;
    }

    return children;
};

export default WebsiteGuard;
