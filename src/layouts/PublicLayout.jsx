import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
    return (
        <div className="min-h-screen text-foreground flex flex-col font-sans bg-background transition-colors duration-300">
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
        </div>
    );
};

export default PublicLayout;
