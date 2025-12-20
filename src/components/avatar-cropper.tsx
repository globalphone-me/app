"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";

interface AvatarCropperProps {
    open: boolean;
    onClose: () => void;
    onUploadComplete: (avatarUrl: string) => void;
    currentAvatarUrl?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: "%",
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    );
}

export function AvatarCropper({ open, onClose, onUploadComplete, currentAvatarUrl }: AvatarCropperProps) {
    const [imgSrc, setImgSrc] = useState<string>("");
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setError(null);
            const file = e.target.files[0];

            // Validate file type
            if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
                setError("Please select a PNG or JPEG image.");
                return;
            }

            // Validate file size (10MB max for source, will be resized)
            if (file.size > 10 * 1024 * 1024) {
                setError("Image is too large. Maximum size is 10MB.");
                return;
            }

            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setImgSrc(reader.result?.toString() || "");
            });
            reader.readAsDataURL(file);
        }
    };

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1));
    }, []);

    const getCroppedImage = useCallback(async (): Promise<string | null> => {
        if (!completedCrop || !imgRef.current) return null;

        const image = imgRef.current;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) return null;

        // Set output size to 256x256
        const outputSize = 256;
        canvas.width = outputSize;
        canvas.height = outputSize;

        // Calculate source coordinates
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            outputSize,
            outputSize
        );

        // Convert to base64 PNG
        return canvas.toDataURL("image/png");
    }, [completedCrop]);

    const handleUpload = async () => {
        setIsUploading(true);
        setError(null);

        try {
            const croppedImageData = await getCroppedImage();
            if (!croppedImageData) {
                setError("Failed to crop image. Please try again.");
                setIsUploading(false);
                return;
            }

            const res = await fetch("/api/user/avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageData: croppedImageData,
                    contentType: "image/png",
                }),
            });

            const data = await res.json();

            if (res.ok && data.avatarUrl) {
                onUploadComplete(data.avatarUrl);
                handleClose();
            } else {
                setError(data.error || "Failed to upload avatar.");
            }
        } catch (err) {
            setError("Failed to upload avatar. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setImgSrc("");
        setCrop(undefined);
        setCompletedCrop(undefined);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Update Profile Picture</DialogTitle>
                    <DialogDescription>
                        Select your best picture! It'll be cropped to a circle.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {!imgSrc ? (
                        <div className="flex flex-col items-center gap-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={onSelectFile}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                                <Upload className="h-8 w-8 text-gray-400" />
                                <span className="text-gray-500">Click to select an image</span>
                                <span className="text-xs text-gray-400">PNG or JPEG, max 10MB</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                circularCrop
                                className="max-h-[400px]"
                            >
                                <img
                                    ref={imgRef}
                                    src={imgSrc}
                                    alt="Crop preview"
                                    onLoad={onImageLoad}
                                    className="max-h-[400px] w-auto"
                                />
                            </ReactCrop>

                            <div className="flex gap-2 w-full">
                                <Button
                                    variant="outline"
                                    onClick={() => setImgSrc("")}
                                    disabled={isUploading}
                                    className="flex-1"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Choose Different
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={isUploading || !completedCrop}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
