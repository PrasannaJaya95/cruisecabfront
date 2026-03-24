import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, Upload, X, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";

const ImageUploadPreview = ({
    id,
    label,
    file,
    onChange,
    onView,
    onRemove,
    className,
    required = false,
    disabled = false,
    squarePreview = false,
    imageObjectFit = 'cover', // 'cover' or 'contain'
}) => {
    const [preview, setPreview] = useState(null);
    const [imgLoadError, setImgLoadError] = useState(false);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            setImgLoadError(false);
            return;
        }

        if (file instanceof File) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            setImgLoadError(false);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (typeof file === 'string') {
            setPreview(file);
            setImgLoadError(false);
        }
    }, [file]);

    return (
        <div className={cn("space-y-3", className)}>
            <Label htmlFor={id} className="flex gap-2 font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative group">
                <Input
                    id={id}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={onChange}
                    disabled={disabled}
                    className="hidden"
                />
                <Label
                    htmlFor={disabled ? undefined : id}
                    className={cn(
                        "flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] transition-all overflow-hidden relative shadow-inner",
                        disabled ? "cursor-not-allowed opacity-50 bg-secondary/10 border-border" : "cursor-pointer",
                        !disabled && (preview ? "bg-secondary/30 border-primary/50" : "bg-secondary/30 border-border hover:border-primary/50 hover:bg-secondary/50"),
                        squarePreview ? "w-40 h-40 mx-auto" : "w-full h-40"
                    )}
                >
                    {preview ? (
                        <>
                            {preview.toLowerCase().endsWith('.pdf') || (file instanceof File && file.type === 'application/pdf') ? (
                                <div className="flex flex-col items-center justify-center gap-3 text-primary">
                                    <FileText className="w-14 h-14" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">PDF Document</span>
                                </div>
                            ) : (
                                imgLoadError ? (
                                    <div className="w-full h-full flex items-center justify-center p-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                                            Unable to preview
                                        </span>
                                    </div>
                                ) : (
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        loading="eager"
                                        onError={() => setImgLoadError(true)}
                                        className={cn(
                                            "w-full h-full p-1 rounded-[1.5rem]",
                                            imageObjectFit === 'contain' ? "object-contain" : "object-cover"
                                        )}
                                    />
                                )
                            )}
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="rounded-full w-12 h-12 shadow-xl hover:scale-110 active:scale-95 transition-all bg-background text-foreground"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onView && onView(preview);
                                    }}
                                >
                                    <Eye className="w-5 h-5" />
                                </Button>
                                {onRemove && !disabled && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="rounded-full w-12 h-12 shadow-xl hover:scale-110 active:scale-95 transition-all"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onRemove();
                                        }}
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground p-6 text-center">
                            <Upload className="w-8 h-8 opacity-50" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{disabled ? "No Document" : "Click to upload"}</span>
                        </div>
                    )}
                </Label>
            </div>
        </div>
    );
};

export default ImageUploadPreview;
