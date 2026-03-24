import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, MapPin } from 'lucide-react';

const LocationManager = ({ isOpen, onClose }) => {
    const [districts, setDistricts] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [newDistrictName, setNewDistrictName] = useState('');
    const [newCityName, setNewCityName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchDistricts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedDistrict) {
            fetchCities(selectedDistrict);
        } else {
            setCities([]);
        }
    }, [selectedDistrict]);

    const fetchDistricts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/locations/districts`);
            setDistricts(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCities = async (districtId) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/locations/cities?districtId=${districtId}`);
            setCities(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddDistrict = async () => {
        if (!newDistrictName) return;
        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/locations/districts`, { name: newDistrictName });
            setNewDistrictName('');
            fetchDistricts();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCity = async () => {
        if (!newCityName || !selectedDistrict) return;
        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/locations/cities`, { name: newCityName, districtId: selectedDistrict });

            setNewCityName('');
            fetchCities(selectedDistrict);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Delivery Locations</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* District Section */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold flex items-center"><MapPin className="w-4 h-4 mr-2" /> Districts</h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="New District Name"
                                value={newDistrictName}
                                onChange={(e) => setNewDistrictName(e.target.value)}
                            />
                            <Button onClick={handleAddDistrict} disabled={loading || !newDistrictName}>Add</Button>
                        </div>
                    </div>

                    {/* City Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">Cities</h3>
                        <div className="space-y-2">
                            <Label>Select District to Add Cities</Label>
                            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select District" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedDistrict && (
                            <div className="flex gap-2 mt-4">
                                <Input
                                    placeholder="New City Name"
                                    value={newCityName}
                                    onChange={(e) => setNewCityName(e.target.value)}
                                />
                                <Button onClick={handleAddCity} disabled={loading || !newCityName}>Add</Button>
                            </div>
                        )}

                        <div className="mt-4 max-h-[150px] overflow-y-auto border rounded-md p-2 bg-muted/20">
                            {cities.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center">No cities yet.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {cities.map(city => (
                                        <li key={city.id} className="text-sm flex justify-between px-2 py-1 bg-background rounded border">
                                            {city.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default LocationManager;
